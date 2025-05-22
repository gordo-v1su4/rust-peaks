/**
 * Audio Analysis Module
 *
 * This module provides tools for analyzing audio files, including:
 * - Transient detection (finding sudden changes in amplitude)
 * - Spectral analysis (analyzing frequency content)
 * - Song structure analysis (identifying sections like intro, verse, chorus)
 * - BPM detection (finding the tempo of the audio)
 * - Key detection (identifying the musical key)
 */

export { TransientDetector } from './transient-detector.js';
export { SpectralAnalyzer } from './spectral-analyzer.js';
export { SongStructureAnalyzer } from './song-structure-analyzer.js';
export { BPMDetector } from './bpm-detector.js';
export { KeyDetector } from './key-detector.js';

/**
 * Analyze an audio file to detect transients and identify song structure
 * @param {AudioBuffer} audioBuffer - The audio buffer to analyze
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeAudio(audioBuffer, options = {}) {
  const analyzer = new SongStructureAnalyzer(options);
  return await analyzer.analyzeStructure(audioBuffer);
}