/**
 * BPMDetector - Detects beats per minute (tempo) of audio
 * 
 * This module analyzes audio data to find the tempo using
 * various techniques including onset detection and autocorrelation.
 */

export class BPMDetector {
  /**
   * Create a new BPMDetector
   * @param {Object} options - Configuration options
   * @param {number} options.minBPM - Minimum BPM to detect (default: 60)
   * @param {number} options.maxBPM - Maximum BPM to detect (default: 200)
   * @param {number} options.sensitivity - Detection sensitivity (0-100, default: 70)
   */
  constructor(options = {}) {
    this.minBPM = options.minBPM ?? 60;
    this.maxBPM = options.maxBPM ?? 200;
    this.sensitivity = options.sensitivity ?? 70;
  }

  /**
   * Detect BPM of audio data
   * @param {AudioBuffer} audioBuffer - The audio buffer to analyze
   * @returns {Object} BPM analysis results
   */
  detectBPM(audioBuffer) {
    if (!audioBuffer) {
      throw new Error('No audio data available');
    }

    // Get audio data from the first channel
    const rawData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Step 1: Find onsets (sudden increases in amplitude)
    const onsets = this.findOnsets(rawData, sampleRate);
    
    // Step 2: Calculate intervals between onsets
    const intervals = this.calculateIntervals(onsets);
    
    // Step 3: Find the most common interval (tempo)
    const bpm = this.findTempo(intervals, sampleRate);
    
    // Step 4: Generate beat positions based on the detected tempo
    const beats = this.generateBeats(bpm, audioBuffer.duration);
    
    return {
      bpm,
      confidence: this.calculateConfidence(intervals, bpm, sampleRate),
      beats,
      onsets
    };
  }

  /**
   * Find onsets (sudden increases in amplitude) in audio data
   * @param {Float32Array} data - Audio data
   * @param {number} sampleRate - Sample rate of the audio
   * @returns {Array<number>} Array of onset positions in seconds
   */
  findOnsets(data, sampleRate) {
    const onsets = [];
    const windowSize = Math.floor(sampleRate * 0.01); // 10ms window
    const hopSize = Math.floor(windowSize / 2); // 50% overlap
    
    // Sensitivity factor (higher value = less sensitive)
    const sensitivityFactor = 1 - (this.sensitivity / 100);
    
    let prevEnergy = 0;
    let energyHistory = new Array(8).fill(0);
    
    // Step through audio data
    for (let i = 0; i < data.length - windowSize; i += hopSize) {
      // Calculate energy (sum of squared amplitudes) for this window
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += data[i + j] * data[i + j];
      }
      energy = Math.sqrt(energy / windowSize);
      
      // Calculate local average energy from history
      const avgEnergy = energyHistory.reduce((sum, e) => sum + e, 0) / energyHistory.length;
      
      // Detect sudden increase in energy
      if (energy > avgEnergy * (1.5 + sensitivityFactor) && energy > 0.01) {
        // Convert sample position to seconds
        const time = i / sampleRate;
        onsets.push(time);
        
        // Skip forward to avoid detecting the same onset multiple times
        i += windowSize;
      }
      
      // Update energy history
      energyHistory.shift();
      energyHistory.push(energy);
      prevEnergy = energy;
    }
    
    return onsets;
  }

  /**
   * Calculate intervals between consecutive onsets
   * @param {Array<number>} onsets - Array of onset positions in seconds
   * @returns {Array<number>} Array of intervals in seconds
   */
  calculateIntervals(onsets) {
    const intervals = [];
    
    for (let i = 1; i < onsets.length; i++) {
      const interval = onsets[i] - onsets[i - 1];
      intervals.push(interval);
    }
    
    return intervals;
  }

  /**
   * Find the tempo based on onset intervals
   * @param {Array<number>} intervals - Array of intervals in seconds
   * @param {number} sampleRate - Sample rate of the audio
   * @returns {number} Detected tempo in BPM
   */
  findTempo(intervals, sampleRate) {
    if (intervals.length === 0) {
      return 120; // Default to 120 BPM if no intervals
    }
    
    // Convert intervals to BPM values
    const bpmValues = intervals.map(interval => 60 / interval);
    
    // Filter out unreasonable BPM values
    const filteredBPM = bpmValues.filter(bpm =>
      bpm >= this.minBPM && bpm <= this.maxBPM
    );
    
    if (filteredBPM.length === 0) {
      return 120; // Default to 120 BPM if no valid BPM values
    }
    
    // Use a histogram approach for more accurate BPM detection
    const histogram = this.createBPMHistogram(filteredBPM);
    
    // Find peaks in the histogram
    const peaks = this.findHistogramPeaks(histogram);
    
    // If we have peaks, use the highest one
    if (peaks.length > 0) {
      // Sort peaks by count (descending)
      peaks.sort((a, b) => b.count - a.count);
      
      // Check if we have a strong peak at 120-125 BPM (common in many songs)
      const commonBpmPeak = peaks.find(peak =>
        peak.bpm >= 120 && peak.bpm <= 125 && peak.count > peaks[0].count * 0.8
      );
      
      if (commonBpmPeak) {
        return commonBpmPeak.bpm;
      }
      
      // Use the highest peak
      return peaks[0].bpm;
    }
    
    // Fallback to the old method if histogram approach fails
    // Group similar BPM values
    const bpmGroups = this.groupSimilarValues(filteredBPM, 1.0);
    
    // Find the largest group
    let largestGroup = [];
    let largestCount = 0;
    
    for (const group of bpmGroups) {
      if (group.length > largestCount) {
        largestCount = group.length;
        largestGroup = group;
      }
    }
    
    // Calculate the average BPM of the largest group
    const avgBPM = largestGroup.reduce((sum, bpm) => sum + bpm, 0) / largestGroup.length;
    
    // Round to nearest integer
    return Math.round(avgBPM);
  }
  
  /**
   * Create a histogram of BPM values
   * @param {Array<number>} bpmValues - Array of BPM values
   * @returns {Object} Histogram of BPM values
   */
  createBPMHistogram(bpmValues) {
    const histogram = {};
    const binSize = 1; // 1 BPM per bin
    
    // Create histogram
    for (const bpm of bpmValues) {
      // Round to nearest bin
      const bin = Math.round(bpm / binSize) * binSize;
      
      if (!histogram[bin]) {
        histogram[bin] = 0;
      }
      
      histogram[bin]++;
    }
    
    return histogram;
  }
  
  /**
   * Find peaks in the BPM histogram
   * @param {Object} histogram - Histogram of BPM values
   * @returns {Array<Object>} Array of peaks
   */
  findHistogramPeaks(histogram) {
    const peaks = [];
    const bins = Object.keys(histogram).map(Number).sort((a, b) => a - b);
    
    // Find local maxima
    for (let i = 1; i < bins.length - 1; i++) {
      const bin = bins[i];
      const count = histogram[bin];
      const prevCount = histogram[bins[i - 1]];
      const nextCount = histogram[bins[i + 1]];
      
      // Check if this is a local maximum
      if (count > prevCount && count > nextCount) {
        peaks.push({
          bpm: bin,
          count: count
        });
      }
    }
    
    // Also check first and last bins
    if (bins.length > 0) {
      const firstBin = bins[0];
      if (histogram[firstBin] > histogram[bins[1]]) {
        peaks.push({
          bpm: firstBin,
          count: histogram[firstBin]
        });
      }
      
      const lastBin = bins[bins.length - 1];
      if (histogram[lastBin] > histogram[bins[bins.length - 2]]) {
        peaks.push({
          bpm: lastBin,
          count: histogram[lastBin]
        });
      }
    }
    
    return peaks;
  }

  /**
   * Group similar values together
   * @param {Array<number>} values - Array of values to group
   * @param {number} tolerance - Tolerance for grouping (percentage)
   * @returns {Array<Array<number>>} Array of groups
   */
  groupSimilarValues(values, tolerance) {
    const groups = [];
    const sortedValues = [...values].sort((a, b) => a - b);
    
    let currentGroup = [sortedValues[0]];
    
    for (let i = 1; i < sortedValues.length; i++) {
      const currentValue = sortedValues[i];
      const prevValue = sortedValues[i - 1];
      
      // If the current value is within tolerance of the previous value, add to current group
      if (currentValue <= prevValue * (1 + tolerance) && 
          currentValue >= prevValue * (1 - tolerance)) {
        currentGroup.push(currentValue);
      } else {
        // Otherwise, start a new group
        groups.push(currentGroup);
        currentGroup = [currentValue];
      }
    }
    
    // Add the last group
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }

  /**
   * Calculate confidence in the BPM detection
   * @param {Array<number>} intervals - Array of intervals in seconds
   * @param {number} bpm - Detected BPM
   * @param {number} sampleRate - Sample rate of the audio
   * @returns {number} Confidence value (0-1)
   */
  calculateConfidence(intervals, bpm, sampleRate) {
    if (intervals.length === 0) {
      return 0;
    }
    
    // Expected interval for the detected BPM
    const expectedInterval = 60 / bpm;
    
    // Count how many intervals are close to the expected interval
    let matchCount = 0;
    
    for (const interval of intervals) {
      // Check if this interval is close to the expected interval or its multiples/divisions
      if (this.isCloseToMultiple(interval, expectedInterval, 0.1)) {
        matchCount++;
      }
    }
    
    // Calculate confidence as the percentage of matching intervals
    return matchCount / intervals.length;
  }

  /**
   * Check if a value is close to a multiple or division of another value
   * @param {number} value - Value to check
   * @param {number} base - Base value
   * @param {number} tolerance - Tolerance (percentage)
   * @returns {boolean} True if close to a multiple or division
   */
  isCloseToMultiple(value, base, tolerance) {
    // Check multiples (1x, 2x, 3x, 4x)
    for (let i = 1; i <= 4; i++) {
      const multiple = base * i;
      if (value >= multiple * (1 - tolerance) && 
          value <= multiple * (1 + tolerance)) {
        return true;
      }
    }
    
    // Check divisions (1/2, 1/3, 1/4)
    for (let i = 2; i <= 4; i++) {
      const division = base / i;
      if (value >= division * (1 - tolerance) && 
          value <= division * (1 + tolerance)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate beat positions based on the detected tempo
   * @param {number} bpm - Detected BPM
   * @param {number} duration - Duration of the audio in seconds
   * @returns {Array<number>} Array of beat positions in seconds
   */
  generateBeats(bpm, duration) {
    const beatInterval = 60 / bpm; // Time between beats in seconds
    const beats = [];
    
    // Generate beats starting from 0
    for (let time = 0; time < duration; time += beatInterval) {
      beats.push(time);
    }
    
    return beats;
  }
}