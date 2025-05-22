# Audio Analysis Module

This module provides tools for analyzing audio files to identify song structure, detect transients, and analyze spectral content.

## Overview

The audio analysis module consists of several components:

1. **TransientDetector**: Detects sudden changes in amplitude (transients) in audio data
2. **SpectralAnalyzer**: Analyzes the frequency content of audio data
3. **SongStructureAnalyzer**: Combines transient detection and spectral analysis to identify song sections

## Usage

### Basic Usage

```javascript
import { analyzeAudio } from './lib/audio-analysis';

// Get an AudioBuffer from somewhere (e.g., Web Audio API)
const audioBuffer = /* ... */;

// Analyze the audio
const result = await analyzeAudio(audioBuffer);

// Use the results
console.log(`Found ${result.sections.length} sections`);
console.log(`Detected ${result.transients.length} transients`);
```

### Advanced Usage

For more control, you can use the individual analyzers directly:

```javascript
import { TransientDetector, SpectralAnalyzer, SongStructureAnalyzer } from './lib/audio-analysis';

// Create a transient detector with custom settings
const transientDetector = new TransientDetector({
  density: 50,        // Controls how many transients to detect (1-100)
  randomness: 30,     // Adds randomness to detection (0-100)
  sensitivity: 70,    // How sensitive detection is (1-100)
  minSpacing: 0.5     // Minimum time between transients in seconds
});

// Detect transients
const transients = transientDetector.detectTransients(audioBuffer);

// Create a spectral analyzer
const spectralAnalyzer = new SpectralAnalyzer({
  fftSize: 2048,      // Size of FFT
  segmentSize: 1      // Size of analysis segments in seconds
});

// Analyze spectrum
const spectralData = spectralAnalyzer.analyzeSpectrum(audioBuffer);

// Find potential section boundaries
const boundaries = spectralAnalyzer.findSectionBoundaries(spectralData);

// Create a song structure analyzer
const structureAnalyzer = new SongStructureAnalyzer({
  transient: {
    density: 50,
    randomness: 30,
    sensitivity: 70,
    minSpacing: 0.5
  },
  spectral: {
    fftSize: 2048,
    segmentSize: 1
  }
});

// Analyze song structure
const result = await structureAnalyzer.analyzeStructure(audioBuffer);
```

## How It Works

### Transient Detection

The transient detector works by analyzing the audio data to find sudden changes in amplitude. It:

1. Divides the audio into small windows
2. Calculates the RMS (root mean square) amplitude of each window
3. Detects significant increases in amplitude between consecutive windows
4. Applies filtering based on minimum spacing and randomness parameters

### Spectral Analysis

The spectral analyzer examines the frequency content of the audio. It:

1. Divides the audio into segments
2. Performs FFT (Fast Fourier Transform) on each segment
3. Calculates spectral features like energy distribution across frequency bands
4. Identifies changes in spectral content that might indicate section boundaries

### Song Structure Analysis

The song structure analyzer combines transient detection and spectral analysis to identify different sections of a song. It:

1. Detects transients and analyzes their density over time
2. Analyzes spectral content to find significant changes
3. Identifies potential section boundaries
4. Classifies sections based on their characteristics (e.g., intro, verse, chorus)
5. Creates a structured representation of the song

## Parameters

### TransientDetector

- **density**: Controls how many transients to detect (1-100)
- **randomness**: Adds randomness to detection (0-100)
- **sensitivity**: How sensitive detection is (1-100)
- **minSpacing**: Minimum time between transients in seconds

### SpectralAnalyzer

- **fftSize**: Size of FFT (default: 2048)
- **segmentSize**: Size of analysis segments in seconds (default: 1)

## Output

The analysis result includes:

- **duration**: Total duration of the audio in seconds
- **transients**: Array of transient positions in seconds
- **transientDensity**: Analysis of transient density over time
- **spectralData**: Spectral analysis data
- **potentialBoundaries**: Potential section boundaries
- **sections**: Identified song sections with start/end times and types