/**
 * SpectralAnalyzer - Analyzes spectral content of audio
 * 
 * This module analyzes the frequency content of audio data
 * to identify characteristics that can help determine song sections.
 */

export class SpectralAnalyzer {
  /**
   * Create a new SpectralAnalyzer
   * @param {Object} options - Configuration options
   * @param {number} options.fftSize - Size of FFT (default: 2048)
   * @param {number} options.segmentSize - Size of analysis segments in seconds (default: 1)
   */
  constructor(options = {}) {
    this.fftSize = options.fftSize ?? 2048;
    this.segmentSize = options.segmentSize ?? 1;
  }

  /**
   * Analyze the spectral content of an audio buffer
   * @param {AudioBuffer} audioBuffer - The audio buffer to analyze
   * @returns {Array<Object>} Array of spectral data for each segment
   */
  analyzeSpectrum(audioBuffer) {
    if (!audioBuffer) {
      throw new Error('No audio data available');
    }

    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const channelData = audioBuffer.getChannelData(0); // Use first channel
    
    // Calculate how many samples per segment
    const samplesPerSegment = Math.floor(this.segmentSize * sampleRate);
    const numSegments = Math.ceil(channelData.length / samplesPerSegment);
    
    // Create offline audio context for analysis
    const offlineCtx = new OfflineAudioContext(1, channelData.length, sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    
    // Create analyzer node
    const analyzer = offlineCtx.createAnalyser();
    analyzer.fftSize = this.fftSize;
    const bufferLength = analyzer.frequencyBinCount;
    
    source.connect(analyzer);
    analyzer.connect(offlineCtx.destination);
    
    // Prepare result array
    const spectralData = [];
    
    // Process each segment
    for (let i = 0; i < numSegments; i++) {
      const startSample = i * samplesPerSegment;
      const endSample = Math.min(startSample + samplesPerSegment, channelData.length);
      
      // Create a temporary buffer for this segment
      const segmentBuffer = offlineCtx.createBuffer(1, endSample - startSample, sampleRate);
      const segmentChannelData = segmentBuffer.getChannelData(0);
      
      // Copy data to segment buffer
      for (let j = 0; j < endSample - startSample; j++) {
        segmentChannelData[j] = channelData[startSample + j];
      }
      
      // Analyze this segment
      const frequencyData = new Uint8Array(bufferLength);
      analyzer.getByteFrequencyData(frequencyData);
      
      // Calculate spectral features
      const features = this.calculateSpectralFeatures(frequencyData, sampleRate);
      
      spectralData.push({
        startTime: startSample / sampleRate,
        endTime: endSample / sampleRate,
        ...features
      });
    }
    
    return spectralData;
  }
  
  /**
   * Calculate spectral features from frequency data
   * @param {Uint8Array} frequencyData - Frequency data from analyzer
   * @param {number} sampleRate - Sample rate of the audio
   * @returns {Object} Spectral features
   */
  calculateSpectralFeatures(frequencyData, sampleRate) {
    const bufferLength = frequencyData.length;
    
    // Calculate frequency bands
    // Low (bass): 20-250Hz
    // Mid (vocals, most instruments): 250-4000Hz
    // High (cymbals, hi-hats): 4000-20000Hz
    
    let lowSum = 0;
    let midSum = 0;
    let highSum = 0;
    let totalSum = 0;
    
    // Calculate the bin indices for our frequency bands
    const binWidth = sampleRate / (bufferLength * 2);
    const lowBinCount = Math.min(Math.ceil(250 / binWidth), bufferLength);
    const midBinCount = Math.min(Math.ceil(4000 / binWidth), bufferLength);
    
    // Sum the energy in each band
    for (let i = 0; i < bufferLength; i++) {
      const value = frequencyData[i];
      totalSum += value;
      
      if (i < lowBinCount) {
        lowSum += value;
      } else if (i < midBinCount) {
        midSum += value;
      } else {
        highSum += value;
      }
    }
    
    // Normalize to get relative energy in each band
    const lowEnergy = lowSum / totalSum || 0;
    const midEnergy = midSum / totalSum || 0;
    const highEnergy = highSum / totalSum || 0;
    
    // Calculate spectral centroid (weighted average of frequencies)
    let centroidNumerator = 0;
    let centroidDenominator = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const frequency = i * binWidth;
      const amplitude = frequencyData[i];
      
      centroidNumerator += frequency * amplitude;
      centroidDenominator += amplitude;
    }
    
    const spectralCentroid = centroidDenominator !== 0 ? 
      centroidNumerator / centroidDenominator : 0;
    
    // Calculate spectral flux (how quickly the spectrum changes)
    // This would require comparing with previous frames, simplified here
    
    return {
      lowEnergy,
      midEnergy,
      highEnergy,
      spectralCentroid,
      totalEnergy: totalSum / bufferLength
    };
  }
  
  /**
   * Identify potential section boundaries based on spectral changes
   * @param {Array<Object>} spectralData - Spectral data from analyzeSpectrum
   * @param {number} threshold - Threshold for detecting changes (0-1)
   * @returns {Array<number>} Array of potential section boundary times in seconds
   */
  findSectionBoundaries(spectralData, threshold = 0.15) {
    if (!spectralData || spectralData.length < 2) {
      return [];
    }
    
    const boundaries = [];
    const diffScores = [];
    
    // Calculate differences between consecutive segments
    for (let i = 1; i < spectralData.length; i++) {
      const prev = spectralData[i - 1];
      const curr = spectralData[i];
      
      // Calculate a difference score based on multiple features
      const lowDiff = Math.abs(curr.lowEnergy - prev.lowEnergy);
      const midDiff = Math.abs(curr.midEnergy - prev.midEnergy);
      const highDiff = Math.abs(curr.highEnergy - prev.highEnergy);
      const centroidDiff = Math.abs(curr.spectralCentroid - prev.spectralCentroid) /
        (prev.spectralCentroid || 1); // Normalize by previous value
      
      // Weight the differences (can be adjusted)
      const diffScore = (lowDiff * 0.3) + (midDiff * 0.3) + (highDiff * 0.2) + (centroidDiff * 0.2);
      
      // Store the difference score
      diffScores.push({
        time: curr.startTime,
        score: diffScore
      });
    }
    
    // Calculate adaptive threshold based on the distribution of difference scores
    const sortedScores = [...diffScores].sort((a, b) => b.score - a.score);
    const adaptiveThreshold = sortedScores.length > 0 ?
      Math.max(threshold, sortedScores[Math.floor(sortedScores.length * 0.2)].score * 0.7) :
      threshold;
    
    console.log(`Using adaptive threshold: ${adaptiveThreshold} (base: ${threshold})`);
    
    // Find peaks in the difference scores that exceed the threshold
    for (let i = 1; i < diffScores.length - 1; i++) {
      const prev = diffScores[i - 1];
      const curr = diffScores[i];
      const next = diffScores[i + 1];
      
      // Check if this is a local peak and exceeds the threshold
      if (curr.score > adaptiveThreshold &&
          curr.score > prev.score &&
          curr.score > next.score) {
        boundaries.push(curr.time);
      }
    }
    
    // Add the first and last segments if they have high difference scores
    if (diffScores.length > 0) {
      const first = diffScores[0];
      const last = diffScores[diffScores.length - 1];
      
      if (first.score > adaptiveThreshold * 0.8) {
        boundaries.push(first.time);
      }
      
      if (last.score > adaptiveThreshold * 0.8) {
        boundaries.push(last.time);
      }
    }
    
    // Sort boundaries by time
    boundaries.sort((a, b) => a - b);
    
    return boundaries;
  }
}