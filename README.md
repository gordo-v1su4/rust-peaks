# Audio Analysis and Visualization Tool

This is a Svelte-based application for analyzing and visualizing audio files. It provides tools for detecting transients, analyzing spectral content, and identifying song structure.

## Features

- **Audio File Management**: Upload and manage audio files
- **Waveform Visualization**: Display audio waveforms with zoom and navigation controls
- **Transient Detection**: Identify sudden changes in amplitude (like drum hits or note attacks)
- **Song Structure Analysis**: Automatically identify different sections of a song (intro, verse, chorus, etc.)
- **Markers and Regions**: Create and manage markers and regions in the audio
- **Audio Visualization**: Real-time frequency visualization

## Project Structure

- `src/`: Source code
  - `lib/`: Library modules
    - `audio-analysis/`: Audio analysis modules
      - `transient-detector.js`: Detects transients in audio
      - `spectral-analyzer.js`: Analyzes spectral content
      - `song-structure-analyzer.js`: Identifies song structure
      - `index.js`: Exports all audio analysis modules
  - `App.svelte`: Main application component
  - `AudioFileManager.svelte`: Handles file uploads and selection
  - `AudioTimeline.svelte`: Core component with waveform display and analysis
  - `AudioVisualizer.svelte`: Frequency visualization using canvas
  - `ExportDialog.svelte`: Dialog for exporting regions

## Audio Analysis

The audio analysis module provides tools for analyzing audio files to identify song structure, detect transients, and analyze spectral content. See the [Audio Analysis README](src/lib/audio-analysis/README.md) for detailed documentation.

### Key Components

1. **TransientDetector**: Detects sudden changes in amplitude (transients) in audio data
2. **SpectralAnalyzer**: Analyzes the frequency content of audio data
3. **SongStructureAnalyzer**: Combines transient detection and spectral analysis to identify song sections

## Getting Started

### Installation

```bash
# Clone the repository


# Install dependencies
pnpm install
```

### Development

```bash
# Start the development server
pnpm run dev
```

Navigate to [localhost:8080](http://localhost:8080) to see the application running.

### Building for Production

```bash
# Create an optimized build
pnpm run build
```

## Usage

1. **Upload Audio**: Click "Open Audio File" to upload an audio file
2. **Visualize Waveform**: The audio waveform will be displayed in the timeline
3. **Detect Transients**: Adjust transient detection parameters and click "Detect Transients"
4. **Analyze Structure**: Click "Analyze Audio" to identify song sections
5. **Add Markers**: Click "Add Timestamp" to add markers at specific points
6. **Create Regions**: Click "Create Region" to create editable regions

## Technologies Used

- [Svelte](https://svelte.dev/): Front-end framework
- [WaveSurfer.js](https://wavesurfer-js.org/): Audio visualization
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API): Audio processing

## License

This project is licensed under the MIT License - see the LICENSE file for details.

