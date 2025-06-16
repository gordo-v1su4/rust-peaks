<script>
  import { onMount, onDestroy } from 'svelte';
  import WaveSurfer from 'wavesurfer.js';
  import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
  import { TransientDetector } from './lib/audio-analysis/transient-detector.js';
  import { SongStructureAnalyzer } from './lib/audio-analysis/song-structure-analyzer.js';
  import { BPMDetector } from './lib/audio-analysis/bpm-detector.js';
  import { KeyDetector } from './lib/audio-analysis/key-detector.js';
  import ExportDialog from './ExportDialog.svelte';
  import AudioVisualizer from './AudioVisualizer.svelte';

  export let audioUrl = null;
  export let projectName = 'Untitled Project';

  let wavesurfer;
  let container;
  let isPlaying = false;
  let currentTime = 0;
  let duration = 0;
  let zoom = 50;
  let volume = 75;
  let transients = [];
  let sections = [];
  let customRegions = [];
  let showExportDialog = false;
  let selectedRegion = null;
  let isLooping = false;
  let inPoint = null;
  let outPoint = null;
  let bpm = null;
  let key = null;

  // Analysis settings
  let density = 91;
  let randomness = 41;
  let sensitivity = 70;
  let minSpacing = 0.05;
  let snapThreshold = 0.55;
  let enableSnapping = true;
  let snapToTransients = true;
  let snapToBeats = false;

  // Create analyzers
  const transientDetector = new TransientDetector({
    density,
    randomness,
    sensitivity,
    minSpacing
  });

  const structureAnalyzer = new SongStructureAnalyzer();
  const bpmDetector = new BPMDetector();
  const keyDetector = new KeyDetector();

  onMount(() => {
    // Initialize WaveSurfer
    wavesurfer = WaveSurfer.create({
      container: container,
      waveColor: '#4a9eff',
      progressColor: '#1453e3',
      cursorColor: '#fff',
      height: 128,
      normalize: true,
      plugins: [
        RegionsPlugin.create()
      ]
    });

    // Event listeners
    wavesurfer.on('ready', () => {
      duration = wavesurfer.getDuration();
      wavesurfer.setVolume(volume / 100);
      wavesurfer.zoom(zoom);
    });

    wavesurfer.on('play', () => isPlaying = true);
    wavesurfer.on('pause', () => isPlaying = false);
    wavesurfer.on('timeupdate', (time) => {
      currentTime = time;
      if (isLooping && selectedRegion) {
        if (currentTime >= selectedRegion.end) {
          wavesurfer.setTime(selectedRegion.start);
        }
      }
    });

    // Load audio if URL is provided
    if (audioUrl) {
      wavesurfer.load(audioUrl);
    }
  });

  onDestroy(() => {
    if (wavesurfer) {
      wavesurfer.destroy();
    }
  });

  // Watch for audio URL changes
  $: if (wavesurfer && audioUrl) {
    wavesurfer.load(audioUrl);
    transients = [];
    sections = [];
    customRegions = [];
    inPoint = null;
    outPoint = null;
    bpm = null;
    key = null;
  }

  async function detectTransients() {
    const audioBuffer = wavesurfer.backend.buffer;
    if (!audioBuffer) return;

    transients = transientDetector.detectTransients(audioBuffer);
  }

  async function analyzeAudio() {
    const audioBuffer = wavesurfer.backend.buffer;
    if (!audioBuffer) return;

    // Detect BPM
    const bpmResult = bpmDetector.detectBPM(audioBuffer);
    bpm = Math.round(bpmResult.bpm);

    // Detect key
    const keyResult = keyDetector.detectKey(audioBuffer);
    key = `${keyResult.key} ${keyResult.mode}`;

    // Analyze structure
    const analysis = await structureAnalyzer.analyzeStructure(audioBuffer);
    sections = analysis.sections;
  }

  function findNearestTransient(time) {
    if (!enableSnapping) return time;
    
    if (snapToTransients && transients.length) {
      const nearest = transients.reduce((prev, curr) => {
        return Math.abs(curr - time) < Math.abs(prev - time) ? curr : prev;
      });
      
      if (Math.abs(nearest - time) <= snapThreshold) {
        return nearest;
      }
    }
    
    return time;
  }

  function addTimestamp() {
    const time = findNearestTransient(currentTime);
    
    if (!inPoint) {
      inPoint = time;
    } else if (!outPoint) {
      outPoint = time;
      createCustomRegion();
    }
  }

  function createCustomRegion() {
    if (!inPoint || !outPoint) return;

    const start = Math.min(inPoint, outPoint);
    const end = Math.max(inPoint, outPoint);
    
    const region = {
      id: `custom-${Date.now()}`,
      start,
      end,
      color: 'rgba(0, 184, 169, 0.2)',
      name: `Custom (${formatTime(start)} - ${formatTime(end)})`
    };

    customRegions = [...customRegions, region];
    
    // Create WaveSurfer region
    wavesurfer.addRegion({
      ...region,
      drag: false,
      resize: false
    });

    // Reset points
    inPoint = null;
    outPoint = null;
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function togglePlayPause() {
    if (wavesurfer) {
      wavesurfer.playPause();
    }
  }

  function toggleLoop() {
    isLooping = !isLooping;
  }

  function updateVolume(event) {
    const newVolume = event.target.value;
    if (wavesurfer) {
      wavesurfer.setVolume(newVolume / 100);
    }
    volume = newVolume;
  }

  function updateZoom(event) {
    const newZoom = event.target.value;
    if (wavesurfer) {
      wavesurfer.zoom(newZoom);
    }
    zoom = newZoom;
  }

  function exportRegion(region) {
    selectedRegion = region;
    showExportDialog = true;
  }

  function handleExport(event) {
    showExportDialog = false;
  }

  function seekToRegion(region) {
    if (wavesurfer) {
      wavesurfer.setTime(region.start);
      if (!isPlaying) {
        wavesurfer.play();
      }
    }
  }

  function playRegion(region) {
    if (wavesurfer) {
      selectedRegion = region;
      wavesurfer.setTime(region.start);
      wavesurfer.play();
    }
  }
</script>

<style>
  .timeline-container {
    background-color: #1a1a1a;
    border-radius: 4px;
    padding: 20px;
    margin-top: 20px;
  }

  .controls {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    align-items: center;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 10px;
    background-color: #121212;
    border-radius: 4px;
  }

  .button {
    background-color: #2a2a2a;
    color: #e6e6e6;
    border: 1px solid #3f3f46;
    border-radius: 4px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .button:hover {
    background-color: #3a3a3a;
    border-color: #00b8a9;
  }

  .button.active {
    background-color: #00b8a9;
    color: #121212;
    border-color: transparent;
  }

  .time-display {
    font-family: monospace;
    color: #888;
    margin-left: 10px;
    font-size: 14px;
  }

  .waveform {
    background-color: #121212;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 15px;
  }

  .analysis-panel {
    background-color: #121212;
    border-radius: 4px;
    padding: 15px;
    margin-bottom: 15px;
  }

  .analysis-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .analysis-title {
    color: #e6e6e6;
    font-size: 14px;
    font-weight: 500;
  }

  .analysis-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 15px;
  }

  .control-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .control-label {
    color: #888;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
  }

  .control-value {
    color: #00b8a9;
    font-size: 12px;
  }

  input[type="range"] {
    width: 100%;
    height: 4px;
    background: #2a2a2a;
    border-radius: 2px;
    -webkit-appearance: none;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: #00b8a9;
    border-radius: 50%;
    cursor: pointer;
  }

  .sections {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 15px;
  }

  .section-group {
    border-top: 1px solid #333;
    padding-top: 15px;
  }

  .section-group-title {
    color: #888;
    font-size: 12px;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .section-button {
    background-color: transparent;
    border: none;
    color: #e6e6e6;
    padding: 8px;
    cursor: pointer;
    width: 100%;
    text-align: left;
    border-radius: 4px;
    transition: background-color 0.2s;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .section-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .section-time {
    color: #888;
    font-size: 12px;
  }

  .marker-points {
    display: flex;
    gap: 10px;
    margin-top: 10px;
    padding: 10px;
    background-color: #2a2a2a;
    border-radius: 4px;
  }

  .marker-point {
    color: #888;
    font-family: monospace;
    font-size: 12px;
  }

  .marker-point.active {
    color: #00b8a9;
  }

  .snapping-controls {
    display: flex;
    gap: 15px;
    align-items: center;
    margin-top: 10px;
  }

  .radio-group {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .radio-label {
    color: #888;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .button-group {
    display: flex;
    gap: 5px;
  }

  .button-group .button {
    padding: 4px 8px;
    font-size: 12px;
  }

  .analysis-results {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }

  .result-badge {
    background-color: #2a2a2a;
    color: #e6e6e6;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
  }

  .result-badge.bpm {
    background-color: #4a5eff;
  }

  .result-badge.key {
    background-color: #00b8a9;
  }
</style>

<div class="timeline-container">
  <div class="controls">
    <div class="control-group">
      <button class="button" on:click={togglePlayPause}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <span class="time-display">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>

    <div class="control-group">
      <label for="volume-range">Volume</label>
      <input 
        id="volume-range"
        type="range" 
        min="0" 
        max="100" 
        bind:value={volume} 
        on:input={updateVolume}
      />
    </div>

    <div class="control-group">
      <label for="zoom-range">Zoom</label>
      <input 
        id="zoom-range"
        type="range" 
        min="1" 
        max="100" 
        bind:value={zoom} 
        on:input={updateZoom}
      />
    </div>
  </div>

  <div class="waveform" bind:this={container}></div>

  <div class="analysis-panel">
    <div class="analysis-header">
      <h3 class="analysis-title">Transient Detection</h3>
      <button class="button" on:click={detectTransients}>
        DETECT TRANSIENTS
      </button>
    </div>

    <div class="analysis-controls">
      <div class="control-item">
        <div class="control-label">
          <span>Density</span>
          <span class="control-value">{density}%</span>
        </div>
        <input type="range" min="1" max="100" bind:value={density} />
      </div>

      <div class="control-item">
        <div class="control-label">
          <span>Randomness</span>
          <span class="control-value">{randomness}%</span>
        </div>
        <input type="range" min="0" max="100" bind:value={randomness} />
      </div>

      <div class="control-item">
        <div class="control-label">
          <span>Sensitivity</span>
          <span class="control-value">{sensitivity}%</span>
        </div>
        <input type="range" min="1" max="100" bind:value={sensitivity} />
      </div>

      <div class="control-item">
        <div class="control-label">
          <span>Min Spacing</span>
          <span class="control-value">{minSpacing.toFixed(2)}s</span>
        </div>
        <input type="range" min="0.01" max="1" step="0.01" bind:value={minSpacing} />
      </div>
    </div>
  </div>

  <div class="analysis-panel">
    <div class="analysis-header">
      <h3 class="analysis-title">Audio Analysis</h3>
      <button class="button" on:click={analyzeAudio}>
        DETECT BPM & KEY
      </button>
    </div>

    {#if bpm || key}
      <div class="analysis-results">
        {#if bpm}
          <div class="result-badge bpm">{bpm} BPM</div>
        {/if}
        {#if key}
          <div class="result-badge key">{key}</div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="analysis-panel">
    <div class="analysis-header">
      <h3 class="analysis-title">Marker Snapping</h3>
    </div>

    <div class="snapping-controls">
      <label class="radio-label">
        <input 
          type="checkbox" 
          bind:checked={enableSnapping}
        />
        Enable Snapping
      </label>

      {#if enableSnapping}
        <div class="radio-group">
          <label class="radio-label">
            <input 
              type="radio" 
              bind:group={snapToTransients} 
              value={true}
              disabled={!enableSnapping}
            />
            Snap to Transients
          </label>

          <label class="radio-label">
            <input 
              type="radio" 
              bind:group={snapToTransients} 
              value={false}
              disabled={!enableSnapping}
            />
            Snap to Beats
          </label>
        </div>

        <div class="control-item" style="width: 200px;">
          <div class="control-label">
            <span>Snap Threshold</span>
            <span class="control-value">{snapThreshold.toFixed(2)}s</span>
          </div>
          <input 
            type="range" 
            min="0.01" 
            max="1" 
            step="0.01" 
            bind:value={snapThreshold}
            disabled={!enableSnapping}
          />
        </div>
      {/if}
    </div>
  </div>

  <div class="controls">
    <button class="button" on:click={addTimestamp}>
      Add Timestamp
    </button>
    <button 
      class="button {isLooping ? 'active' : ''}" 
      on:click={toggleLoop}
    >
      Loop Region
    </button>
  </div>

  <div class="marker-points">
    <div class="marker-point {inPoint !== null ? 'active' : ''}">
      In: {inPoint !== null ? formatTime(inPoint) : '--:--'}
    </div>
    <div class="marker-point {outPoint !== null ? 'active' : ''}">
      Out: {outPoint !== null ? formatTime(outPoint) : '--:--'}
    </div>
  </div>

  <div class="sections">
    {#if customRegions.length > 0}
      <div class="section-group">
        <div class="section-group-title">Custom Regions</div>
        {#each customRegions as region}
          <button 
            class="section-button"
            style="background-color: {region.color}"
            on:click={() => seekToRegion(region)}
          >
            <span>{region.name}</span>
            <div class="button-group">
              <button 
                class="button" 
                on:click|stopPropagation={() => playRegion(region)}
              >
                Play
              </button>
              <button 
                class="button" 
                on:click|stopPropagation={() => exportRegion(region)}
              >
                Export
              </button>
            </div>
          </button>
        {/each}
      </div>
    {/if}

    {#if sections.length > 0}
      <div class="section-group">
        <div class="section-group-title">Song Structure</div>
        {#each sections as section}
          <button 
            class="section-button"
            style="background-color: {section.color}"
            on:click={() => seekToRegion(section)}
          >
            <span>{section.name}</span>
            <span class="section-time">
              {formatTime(section.start)} - {formatTime(section.end)}
            </span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<ExportDialog
  show={showExportDialog}
  region={selectedRegion}
  bind:projectName={projectName}
  on:export={handleExport}
/>