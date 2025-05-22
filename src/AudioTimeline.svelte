<script>
  import { onMount, onDestroy } from 'svelte';
  import Peaks from 'peaks.js';
  import AudioVisualizer from './AudioVisualizer.svelte';
  import { TransientDetector, EssentiaBPMDetector, EssentiaKeyDetector } from './lib/audio-analysis/index.js';
  
  // Props
  export let audioUrl = null;
  
  // Local state
  let peaks;
  let zoomviewContainer;
  let overviewContainer;
  let audioElement;
  let isPlaying = false;
  let duration = 0;
  let currentTime = 0;
  let isLoaded = false;
  let audioContext;
  let audioBuffer = null;
  
  // Project title functionality
  let projectName = 'Untitled Project';
  let isEditingTitle = false;
  
  // Segments state (equivalent to regions in WaveSurfer)
  let segments = [];
  let currentSegment = null;
  
  // Transient detection state
  let transientDetector;
  let transients = [];
  let transientDensity = 14;
  let transientRandomness = 12;
  let transientSensitivity = 38;
  let transientMinSpacing = 0.50;
  
  // Audio analysis state
  let bpmDetector;
  let keyDetector;
  let detectedBPM = null;
  let detectedKey = null;
  let detectedMode = null;
  
  onMount(() => {
    if (!zoomviewContainer || !overviewContainer || !audioElement) return;
    
    // Initialize audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Load audio and initialize Peaks.js
    if (audioUrl) {
      loadAudio(audioUrl);
    }
  });
  
  onDestroy(() => {
    if (peaks) {
      peaks.destroy();
    }
    
    if (audioContext) {
      audioContext.close();
    }
  });
  
  // Methods
  async function loadAudio(url) {
    console.log('Loading audio from URL:', url);
    isLoaded = false;
    
    try {
      // Create audio buffer for analysis
      await createAudioBuffer(url);
      
      // Set audio element source and wait for it to load
      audioElement.src = url;
      
      // Wait for the audio element to load metadata
      await new Promise((resolve) => {
        const onLoadedMetadata = () => {
          console.log('Audio metadata loaded');
          audioElement.removeEventListener('loadedmetadata', onLoadedMetadata);
          resolve();
        };
        
        if (audioElement.readyState >= 1) {
          console.log('Audio already has metadata');
          resolve();
        } else {
          audioElement.addEventListener('loadedmetadata', onLoadedMetadata);
        }
      });
      
      // Initialize Peaks.js
      initializePeaks();
    } catch (error) {
      console.error('Error loading audio:', error);
    }
  }
  
  async function createAudioBuffer(url) {
    try {
      console.log('Creating audio buffer from URL:', url);
      
      // Fetch the audio file
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      
      // Decode the audio data
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      console.log('Audio buffer created successfully:', audioBuffer);
      
      return audioBuffer;
    } catch (error) {
      console.error('Error creating audio buffer:', error);
      throw error;
    }
  }
  
  function initializePeaks() {
    console.log('Initializing Peaks.js...');
    console.log('Zoomview container:', zoomviewContainer);
    console.log('Overview container:', overviewContainer);
    console.log('Audio element:', audioElement);
    console.log('Audio buffer:', audioBuffer);
    
    // Make sure containers have dimensions
    if (zoomviewContainer.clientWidth === 0) {
      console.warn('Zoomview container has zero width');
    }
    
    if (overviewContainer.clientWidth === 0) {
      console.warn('Overview container has zero width');
    }
    
    const options = {
      containers: {
        zoomview: zoomviewContainer,
        overview: overviewContainer
      },
      mediaElement: audioElement,
      webAudio: {
        audioContext: audioContext,
        audioBuffer: audioBuffer
      },
      zoomLevels: [512, 1024, 2048, 4096],
      keyboard: true,
      pointMarkerColor: '#ccff00',
      segmentColor: 'rgba(0, 184, 169, 0.3)',
      segmentBorderColor: 'rgba(0, 184, 169, 0.7)',
      playheadColor: '#ccff00',
      playheadTextColor: '#ffffff',
      showPlayheadTime: true,
      waveformColor: 'rgba(0, 184, 169, 0.3)',
      highlightColor: 'rgba(0, 184, 169, 0.7)',
      height: 128
    };
    
    // Force a reflow to ensure containers have dimensions
    zoomviewContainer.getBoundingClientRect();
    overviewContainer.getBoundingClientRect();
    
    Peaks.init(options, (err, peaksInstance) => {
      if (err) {
        console.error('Error initializing Peaks.js:', err);
        return;
      }
      
      peaks = peaksInstance;
      console.log('Peaks.js initialized:', peaks);
      
      // Set up event listeners
      setupEventListeners();
      
      // Set duration and mark as loaded
      duration = audioElement.duration;
      isLoaded = true;
      
      console.log('Audio duration:', duration);
    });
  }
  
  function setupEventListeners() {
    // Listen for time update events
    audioElement.addEventListener('timeupdate', () => {
      currentTime = audioElement.currentTime;
    });
    
    // Listen for play/pause events
    audioElement.addEventListener('play', () => {
      isPlaying = true;
    });
    
    audioElement.addEventListener('pause', () => {
      isPlaying = false;
    });
    
    // Listen for segment events
    peaks.on('segments.add', (segment) => {
      segments = [...segments, segment];
      currentSegment = segment;
    });
    
    peaks.on('segments.click', (segment) => {
      currentSegment = segment;
    });
    
    peaks.on('segments.dragend', (segment) => {
      currentSegment = segment;
    });
    
    peaks.on('segments.remove_all', () => {
      segments = [];
      currentSegment = null;
    });
    
    peaks.on('segments.remove', (segment) => {
      segments = segments.filter(s => s.id !== segment.id);
      currentSegment = segments.length > 0 ? segments[segments.length - 1] : null;
    });
  }
  
  function togglePlay() {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
  }
  
  function stop() {
    if (!audioElement) return;
    
    audioElement.pause();
    audioElement.currentTime = 0;
    isPlaying = false;
  }
  
  function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Segment methods (equivalent to region methods in WaveSurfer)
  function createSegment() {
    if (!peaks) return;
    
    const start = currentTime;
    const end = Math.min(start + 5, duration);
    
    peaks.segments.add({
      startTime: start,
      endTime: end,
      color: 'rgba(0, 184, 169, 0.3)',
      borderColor: 'rgba(0, 184, 169, 0.7)',
      editable: true
    });
  }
  
  function playSegment() {
    if (!peaks || !currentSegment) return;
    
    // Set current time to segment start
    audioElement.currentTime = currentSegment.startTime;
    
    // Play audio
    audioElement.play();
  }
  
  function deleteSegment() {
    if (!peaks || !currentSegment) return;
    
    peaks.segments.removeById(currentSegment.id);
  }
  
  function exportSegment() {
    if (!peaks || !currentSegment) return;
    
    // In a real implementation, this would extract the audio data from the segment
    // and save it as a new file
    alert(`Segment exported: ${formatTime(currentSegment.startTime)} - ${formatTime(currentSegment.endTime)}`);
  }
  
  // Audio analysis methods
  function analyzeAudio() {
    console.log('Analyze Audio button clicked');
    console.log('Peaks.js instance:', peaks);
    console.log('Audio buffer:', audioBuffer);
    
    if (!peaks) {
      console.error('Peaks.js instance is not available');
      return;
    }
    
    if (!audioBuffer) {
      console.error('Audio buffer is not available');
      return;
    }
    
    // Initialize detectors if needed
    if (!transientDetector) {
      console.log('Initializing TransientDetector');
      transientDetector = new TransientDetector({
        density: transientDensity,
        randomness: transientRandomness,
        sensitivity: transientSensitivity,
        minSpacing: transientMinSpacing
      });
    }
    
    if (!bpmDetector) {
      console.log('Initializing EssentiaBPMDetector');
      bpmDetector = new EssentiaBPMDetector();
    }
    
    if (!keyDetector) {
      console.log('Initializing EssentiaKeyDetector');
      keyDetector = new EssentiaKeyDetector();
    }
    
    // Detect transients
    console.log('Detecting transients...');
    detectTransients();
    
    // Detect BPM and key
    console.log('Detecting BPM and key...');
    detectBPMAndKey();
  }
  
  async function detectTransients() {
    console.log('detectTransients called');
    
    if (!peaks) {
      console.error('Peaks.js instance is not available');
      return;
    }
    
    if (!audioBuffer) {
      console.error('Audio buffer is not available');
      return;
    }
    
    try {
      // Update transient detector settings
      console.log('Updating transient detector settings');
      transientDetector = new TransientDetector({
        density: transientDensity,
        randomness: transientRandomness,
        sensitivity: transientSensitivity,
        minSpacing: transientMinSpacing
      });
      
      // Detect transients
      console.log('Calling transientDetector.detectTransients with audioBuffer:', audioBuffer);
      transients = transientDetector.detectTransients(audioBuffer);
      console.log('Transients detected:', transients);
      
      // Clear existing point markers
      peaks.points.removeAll();
      
      // Add point markers for transients
      console.log('Adding point markers for transients');
      transients.forEach(time => {
        peaks.points.add({
          time,
          color: '#ccff00',
          labelText: 'T'
        });
      });
      
      console.log(`Detected ${transients.length} transients`);
    } catch (error) {
      console.error('Error detecting transients:', error);
    }
  }
  
  async function detectBPMAndKey() {
    console.log('detectBPMAndKey called');
    
    if (!peaks) {
      console.error('Peaks.js instance is not available');
      return;
    }
    
    if (!audioBuffer) {
      console.error('Audio buffer is not available');
      return;
    }
    
    try {
      // Detect BPM
      console.log('Calling bpmDetector.detectBPM with audioBuffer:', audioBuffer);
      const bpmResult = await bpmDetector.detectBPM(audioBuffer);
      console.log('BPM result:', bpmResult);
      detectedBPM = bpmResult.bpm;
      
      // Detect key
      console.log('Calling keyDetector.detectKey with audioBuffer:', audioBuffer);
      const keyResult = await keyDetector.detectKey(audioBuffer);
      console.log('Key result:', keyResult);
      detectedKey = keyResult.key;
      detectedMode = keyResult.mode;
      
      console.log(`Detected BPM: ${detectedBPM}, Key: ${detectedKey} ${detectedMode}`);
    } catch (error) {
      console.error('Error detecting BPM and key:', error);
    }
  }
  
  // Update audio URL when prop changes
  $: {
    if (audioUrl && audioElement && audioElement.src !== audioUrl) {
      loadAudio(audioUrl);
    }
  }
</script>

<style>
  /* Dark mode theme */
  .audio-timeline {
    background-color: #1e1e1e;
    color: #ffffff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .project-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .project-title {
    font-size: 24px;
    font-weight: bold;
    margin: 0;
    color: #00b8a9;
  }
  
  .project-title-button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    width: 100%;
  }
  
  .project-title-button:hover .project-title {
    text-decoration: underline;
  }
  
  .title-input {
    font-size: 24px;
    background-color: #2a2a2a;
    color: #ffffff;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 5px 10px;
    width: 100%;
  }
  
  .waveform-container {
    background-color: #2a2a2a;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 20px;
  }
  
  .zoomview-container {
    height: 128px;
    margin-bottom: 10px;
    width: 100%;
    background-color: #333;
    border: 1px solid #444;
  }
  
  .overview-container {
    height: 60px;
    width: 100%;
    background-color: #333;
    border: 1px solid #444;
  }
  
  .audio-element {
    display: none;
  }
  
  .controls {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .playback-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-right: 20px;
  }
  
  .time-display {
    font-family: monospace;
    font-size: 14px;
    margin-left: auto;
  }
  
  button {
    background-color: #00b8a9;
    color: #1e1e1e;
    border: none;
    border-radius: 4px;
    padding: 8px 15px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.2s;
  }
  
  button:hover {
    background-color: #00a598;
  }
  
  button:active {
    transform: scale(0.98);
  }
  
  .play-button, .stop-button {
    min-width: 80px;
  }
  
  .segment-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .segment-controls button {
    font-size: 12px;
    padding: 6px 10px;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .analysis-results {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
  }
  
  .analysis-result {
    background-color: #1e1e1e;
    border-radius: 4px;
    padding: 8px 15px;
    display: inline-block;
  }
  
  .analysis-result.bpm {
    background-color: #4b5eab;
  }
  
  .analysis-result.key {
    background-color: #00b8a9;
  }
  
  .result-value {
    font-weight: bold;
    font-size: 16px;
  }
  
  .slider-container {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
  }
  
  .slider-label {
    min-width: 80px;
  }
  
  input[type="range"] {
    flex: 1;
    -webkit-appearance: none;
    height: 6px;
    background: #444;
    border-radius: 3px;
    outline: none;
  }
  
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: #00b8a9;
    border-radius: 50%;
    cursor: pointer;
  }
  
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #00b8a9;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }
</style>

<div class="audio-timeline">
  <!-- Project title editor -->
  <div class="project-header">
    {#if isEditingTitle}
      <input
        type="text"
        class="title-input"
        bind:value={projectName}
        on:blur={() => isEditingTitle = false}
        on:keydown={(e) => e.key === 'Enter' && (isEditingTitle = false)}
      />
    {:else}
      <button
        class="project-title-button"
        on:click={() => isEditingTitle = true}
        aria-label="Edit project title"
      >
        <h1 class="project-title">
          {projectName}
        </h1>
      </button>
    {/if}
  </div>
  
  <!-- Waveform display -->
  <div class="waveform-container">
    <div class="zoomview-container" bind:this={zoomviewContainer} role="img" aria-label="Audio waveform zoom view"></div>
    <div class="overview-container" bind:this={overviewContainer} role="img" aria-label="Audio waveform overview"></div>
    <audio bind:this={audioElement} class="audio-element" controls></audio>
  </div>
  
  <!-- Playback controls -->
  <div class="controls">
    <div class="playback-controls">
      <button class="play-button" on:click={togglePlay}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button class="stop-button" on:click={stop}>Stop</button>
    </div>
    <div class="time-display">
      {formatTime(currentTime)} / {formatTime(duration)}
    </div>
  </div>

  <!-- Segment controls -->
  {#if isLoaded}
    <div class="segment-controls">
      <button on:click={createSegment}>Create Segment</button>
      <button on:click={playSegment} disabled={!currentSegment}>Play Segment</button>
      <button on:click={deleteSegment} disabled={!currentSegment}>Delete Segment</button>
      <button on:click={exportSegment} disabled={!currentSegment}>Export Segment</button>
      <button on:click={analyzeAudio} disabled={!isLoaded}>Analyze Audio</button>
    </div>
    
    <!-- Transient detection controls -->
    <div class="slider-container">
      <span class="slider-label">Density</span>
      <input type="range" min="1" max="100" bind:value={transientDensity} />
      <span>{transientDensity}</span>
    </div>
    
    <div class="slider-container">
      <span class="slider-label">Randomness</span>
      <input type="range" min="0" max="100" bind:value={transientRandomness} />
      <span>{transientRandomness}</span>
    </div>
    
    <div class="slider-container">
      <span class="slider-label">Sensitivity</span>
      <input type="range" min="1" max="100" bind:value={transientSensitivity} />
      <span>{transientSensitivity}</span>
    </div>
    
    <div class="slider-container">
      <span class="slider-label">Min Spacing</span>
      <input type="range" min="0.1" max="2" step="0.1" bind:value={transientMinSpacing} />
      <span>{transientMinSpacing}s</span>
    </div>
  {/if}
  
  <!-- Audio Analysis Results -->
  {#if isLoaded && (detectedBPM || detectedKey)}
    <div class="analysis-results">
      {#if detectedBPM}
        <div class="analysis-result bpm">
          <span class="result-value">{Math.round(detectedBPM)} BPM</span>
        </div>
      {/if}
      
      {#if detectedKey}
        <div class="analysis-result key">
          <span class="result-value">{detectedKey} {detectedMode}</span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Audio Visualizer -->
  {#if isLoaded && audioUrl}
    <AudioVisualizer audioUrl={audioUrl} />
  {/if}
</div>