/**
 * Audio Analysis Library - High-performance audio analysis and processing
 * 
 * This library provides professional-grade audio analysis and processing capabilities
 * using WebAssembly-based libraries and custom AudioWorklet processors for maximum performance.
 */

// Import audio analysis components
import TransientDetector from './transient-detector.js';
import SongStructureAnalyzer from './song-structure-analyzer.js';
import SpectralAnalyzer from './spectral-analyzer.js';
import EssentiaBPMDetector from './essentia-bpm-detector.js';
import EssentiaKeyDetector from './essentia-key-detector.js';
import Context7Analyzer from './context7-analyzer.js';

// Import audio processing
import AudioProcessor from '../audio-processing/audio-processor.js';

// Export all components
export {
  // Analysis components
  TransientDetector,
  SongStructureAnalyzer,
  SpectralAnalyzer,
  
  // High-performance components
  EssentiaBPMDetector,
  EssentiaKeyDetector,
  Context7Analyzer,
  
  // Audio processing
  AudioProcessor
};

// Export default object with all components
export default {
  TransientDetector,
  SongStructureAnalyzer,
  SpectralAnalyzer,
  EssentiaBPMDetector,
  EssentiaKeyDetector,
  Context7Analyzer,
  AudioProcessor
};