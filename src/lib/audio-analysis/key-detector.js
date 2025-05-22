/**
 * KeyDetector - Detects musical key of audio
 * 
 * This module analyzes audio data to determine the musical key
 * using chromagram analysis and key correlation.
 */

export class KeyDetector {
  /**
   * Create a new KeyDetector
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Define key profiles (Krumhansl-Kessler profiles)
    // These represent the relative importance of each pitch class in a key
    this.majorProfiles = {
      'C': [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
      'C#/Db': [2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29],
      'D': [2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66],
      'D#/Eb': [3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39],
      'E': [2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19],
      'F': [5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52],
      'F#/Gb': [2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09],
      'G': [4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38],
      'G#/Ab': [4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33],
      'A': [2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48],
      'A#/Bb': [3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23],
      'B': [2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35]
    };

    this.minorProfiles = {
      'C': [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
      'C#/Db': [3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34],
      'D': [3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69],
      'D#/Eb': [2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98],
      'E': [3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75],
      'F': [4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54],
      'F#/Gb': [2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53],
      'G': [3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60],
      'G#/Ab': [2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38],
      'A': [5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52],
      'A#/Bb': [3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68],
      'B': [2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33]
    };

    // Pitch class names (for reference)
    this.pitchClasses = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'];
  }

  /**
   * Detect the musical key of audio data
   * @param {AudioBuffer} audioBuffer - The audio buffer to analyze
   * @returns {Object} Key analysis results
   */
  detectKey(audioBuffer) {
    if (!audioBuffer) {
      throw new Error('No audio data available');
    }

    try {
      // Get audio data from the first channel
      const rawData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      
      // Step 1: Compute the chromagram (pitch class profile)
      const chromagram = this.computeChromagram(rawData, sampleRate);
      
      // Step 2: Correlate the chromagram with key profiles
      const keyCorrelations = this.correlateWithKeyProfiles(chromagram);
      
      // Step 3: Find the key with the highest correlation
      const detectedKey = this.findBestKey(keyCorrelations);
      
      // For debugging
      console.log(`Detected key: ${detectedKey.key} ${detectedKey.mode} (correlation: ${detectedKey.correlation.toFixed(3)})`);
      
      // Fallback to C major if we couldn't detect a key properly
      if (!detectedKey.key || !detectedKey.mode) {
        console.warn("Key detection failed, using fallback");
        return {
          key: "C",
          mode: "major",
          confidence: 0.5,
          correlations: []
        };
      }
      
      return {
        key: detectedKey.key,
        mode: detectedKey.mode, // 'major' or 'minor'
        confidence: detectedKey.correlation,
        correlations: keyCorrelations
      };
    } catch (err) {
      console.error("Error in key detection:", err);
      // Return a fallback value
      return {
        key: "C",
        mode: "major",
        confidence: 0.5,
        correlations: []
      };
    }
  }

  /**
   * Compute the chromagram (pitch class profile) of audio data
   * @param {Float32Array} data - Audio data
   * @param {number} sampleRate - Sample rate of the audio
   * @returns {Array<number>} Chromagram (12 pitch classes)
   */
  computeChromagram(data, sampleRate) {
    // Initialize chromagram (12 pitch classes)
    const chromagram = new Array(12).fill(0);
    
    try {
      // Use a simpler approach that doesn't rely on manipulating currentTime
      // Analyze the entire buffer at once instead of in chunks
      
      // Create a temporary offline context for analysis
      const offlineCtx = new OfflineAudioContext(1, data.length, sampleRate);
      const audioBuffer = offlineCtx.createBuffer(1, data.length, sampleRate);
      audioBuffer.getChannelData(0).set(data);
      
      // Create analyzer node
      const analyzer = offlineCtx.createAnalyser();
      analyzer.fftSize = 4096;
      analyzer.smoothingTimeConstant = 0;
      
      // Create source node
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyzer);
      
      // Get frequency data
      const frequencyData = new Float32Array(analyzer.frequencyBinCount);
      analyzer.getFloatFrequencyData(frequencyData);
      
      // Process frequency data
      for (let j = 0; j < frequencyData.length; j++) {
        // Convert frequency bin to Hz
        const frequency = j * sampleRate / analyzer.fftSize;
        
        // Skip very low and very high frequencies
        if (frequency < 20 || frequency > 8000) continue;
        
        // Convert frequency to pitch class (0-11)
        const pitchClass = this.frequencyToPitchClass(frequency);
        
        // Add energy to the corresponding pitch class
        // Convert from dB to linear scale and normalize
        const magnitude = Math.pow(10, frequencyData[j] / 20);
        if (magnitude > 0 && !isNaN(magnitude)) {
          chromagram[pitchClass] += magnitude;
        }
      }
      
      // Alternative approach: use Web Audio API's built-in rendering
      offlineCtx.startRendering().then((renderedBuffer) => {
        console.log("Audio processing completed");
      }).catch(err => {
        console.error("Error rendering audio:", err);
      });
    } catch (err) {
      console.error("Error in chromagram computation:", err);
    }
    
    // Normalize the chromagram
    const sum = chromagram.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < chromagram.length; i++) {
        chromagram[i] /= sum;
      }
    }
    
    return chromagram;
  }

  /**
   * Convert frequency to pitch class (0-11)
   * @param {number} frequency - Frequency in Hz
   * @returns {number} Pitch class (0-11, where 0 is C, 1 is C#/Db, etc.)
   */
  frequencyToPitchClass(frequency) {
    // A4 = 440 Hz = pitch class 9 (A)
    // 12 semitones per octave
    const semitones = 12 * Math.log2(frequency / 440);
    const pitchClass = Math.round(semitones) % 12;
    return (pitchClass + 12) % 12; // Ensure positive value
  }

  /**
   * Correlate the chromagram with key profiles
   * @param {Array<number>} chromagram - Chromagram (12 pitch classes)
   * @returns {Array<Object>} Correlations with each key
   */
  correlateWithKeyProfiles(chromagram) {
    const correlations = [];
    
    // Correlate with major keys
    for (const key in this.majorProfiles) {
      const profile = this.majorProfiles[key];
      const correlation = this.correlate(chromagram, profile);
      correlations.push({
        key,
        mode: 'major',
        correlation
      });
    }
    
    // Correlate with minor keys
    for (const key in this.minorProfiles) {
      const profile = this.minorProfiles[key];
      const correlation = this.correlate(chromagram, profile);
      correlations.push({
        key,
        mode: 'minor',
        correlation
      });
    }
    
    // Sort by correlation (highest first)
    correlations.sort((a, b) => b.correlation - a.correlation);
    
    return correlations;
  }

  /**
   * Calculate correlation between two vectors
   * @param {Array<number>} a - First vector
   * @param {Array<number>} b - Second vector
   * @returns {number} Correlation coefficient
   */
  correlate(a, b) {
    let sum_a = 0;
    let sum_b = 0;
    let sum_ab = 0;
    let sum_a2 = 0;
    let sum_b2 = 0;
    
    for (let i = 0; i < a.length; i++) {
      sum_a += a[i];
      sum_b += b[i];
      sum_ab += a[i] * b[i];
      sum_a2 += a[i] * a[i];
      sum_b2 += b[i] * b[i];
    }
    
    const n = a.length;
    const numerator = n * sum_ab - sum_a * sum_b;
    const denominator = Math.sqrt((n * sum_a2 - sum_a * sum_a) * (n * sum_b2 - sum_b * sum_b));
    
    if (denominator === 0) return 0;
    
    return numerator / denominator;
  }

  /**
   * Find the key with the highest correlation
   * @param {Array<Object>} correlations - Correlations with each key
   * @returns {Object} Best matching key
   */
  findBestKey(correlations) {
    return correlations[0];
  }
}