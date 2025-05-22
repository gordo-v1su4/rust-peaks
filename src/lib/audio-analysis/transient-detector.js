/**
 * TransientDetector - Detects transients in audio data
 * 
 * This module analyzes audio data to find sudden changes in amplitude
 * that indicate transients (like drum hits, note attacks, etc.)
 */

class TransientDetector {
  /**
   * Create a new TransientDetector
   * @param {Object} options - Configuration options
   * @param {number} options.density - Controls how many transients to detect (1-100)
   * @param {number} options.randomness - Adds randomness to detection (0-100)
   * @param {number} options.sensitivity - How sensitive detection is (1-100)
   * @param {number} options.minSpacing - Minimum time between transients in seconds
   */
  constructor(options = {}) {
    this.density = options.density ?? 50;
    this.randomness = options.randomness ?? 30;
    this.sensitivity = options.sensitivity ?? 70;
    this.minSpacing = options.minSpacing ?? 0.5;
  }

  /**
   * Detect transients in audio data
   * @param {AudioBuffer} audioBuffer - The audio buffer to analyze
   * @returns {Array<number>} Array of transient positions in seconds
   */
  detectTransients(audioBuffer) {
    if (!audioBuffer) {
      throw new Error('No audio data available');
    }

    // Get audio data from the first channel
    const rawData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;

    // Parameter adjustments based on properties
    const skipFactor = Math.max(1, Math.round((101 - this.density) * 0.2)); // Higher density = fewer samples skipped
    const randomThreshold = this.randomness / 100; // Probability of keeping a detected transient
    const sensitivity = 1 - (this.sensitivity / 100); // Lower value = more sensitive
    const minSpacingSamples = Math.floor(this.minSpacing * sampleRate); // Convert seconds to samples

    // Basic transient detection using amplitude differential
    const transients = [];
    let prevAvg = 0;
    let windowSize = Math.floor(sampleRate * 0.01); // 10ms window
    let lastTransientSample = -minSpacingSamples; // Initialize to ensure first transient is considered

    // Step through audio data in window-sized chunks
    for (let i = 0; i < rawData.length; i += windowSize * skipFactor) {
      // Calculate RMS of current window
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        if (i + j < rawData.length) {
          sum += rawData[i + j] * rawData[i + j];
        }
      }
      const rms = Math.sqrt(sum / windowSize);

      // Detect sudden increase in amplitude
      if (rms > prevAvg * (1 + sensitivity) && rms > 0.01) {
        // Check if we're far enough from the last detected transient
        if (i - lastTransientSample >= minSpacingSamples) {
          // Apply randomness factor
          if (Math.random() > randomThreshold) {
            const time = i / sampleRate;
            if (time > 0 && time < duration) {
              transients.push(time);
              lastTransientSample = i; // Update last transient position
            }
          }
        }
      }
      prevAvg = (prevAvg + rms) / 2; // Smooth the comparison
    }

    console.log(`Detected ${transients.length} transients with density ${this.density}, randomness ${this.randomness}, sensitivity ${this.sensitivity}, min spacing ${this.minSpacing}s`);
    
    return transients;
  }

  /**
   * Analyze transient density over time
   * @param {Array<number>} transients - Array of transient positions in seconds
   * @param {number} duration - Total duration of the audio in seconds
   * @param {number} segmentSize - Size of each segment in seconds
   * @returns {Array<Object>} Array of segment data with transient counts
   */
  analyzeTransientDensity(transients, duration, segmentSize = 5) {
    if (!transients || !duration) {
      return [];
    }

    const segments = [];
    const numSegments = Math.ceil(duration / segmentSize);

    // Initialize segments
    for (let i = 0; i < numSegments; i++) {
      segments.push({
        start: i * segmentSize,
        end: Math.min((i + 1) * segmentSize, duration),
        count: 0,
        density: 0
      });
    }

    // Count transients in each segment
    transients.forEach(time => {
      const segmentIndex = Math.min(Math.floor(time / segmentSize), numSegments - 1);
      segments[segmentIndex].count++;
    });

    // Calculate density (transients per second)
    segments.forEach(segment => {
      const segmentDuration = segment.end - segment.start;
      segment.density = segment.count / segmentDuration;
    });

    return segments;
  }
}

export default TransientDetector;