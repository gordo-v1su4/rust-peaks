<script>
  import { onMount, onDestroy } from 'svelte';
  import WaveSurfer from 'wavesurfer.js';
  import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
  import { TransientDetector } from './lib/audio-analysis/transient-detector.js';
  import { SongStructureAnalyzer } from './lib/audio-analysis/song-structure-analyzer.js';
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
  let transients = [];
  let sections = [];
  let customRegions = [];
  let showExportDialog = false;
  let selectedRegion = null;
  let isLooping = false;
  let inPoint = null;
  let outPoint = null;

  // Create transient detector
  const transientDetector = new TransientDetector({
    density: 50,
    randomness: 30,
    sensitivity: 70,
    minSpacing: 0.1
  });

  // Create song structure analyzer
  const structureAnalyzer = new SongStructureAnalyzer();

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
      detectTransients();
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
  }

  async function detectTransients() {
    const audioBuffer = wavesurfer.backend.buffer;
    if (!audioBuffer) return;

    // Detect transients
    transients = transientDetector.detectTransients(audioBuffer);

    // Analyze song structure
    const analysis = await structureAnalyzer.analyzeStructure(audioBuffer);
    sections = analysis.sections;
  }

  function findNearestTransient(time) {
    if (!transients.length) return time;
    
    return transients.reduce((prev, curr) => {
      return Math.abs(curr - time) < Math.abs(prev - time) ? curr : prev;
    });
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

  function exportRegion(region) {
    selectedRegion = region;
    showExportDialog = true;
  }

  function handleExport(event) {
    // Handle export logic here
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

  .button-group {
    display: flex;
    gap: 5px;
  }

  .button-group .button {
    padding: 4px 8px;
    font-size: 12px;
  }
</style>

<div class="timeline-container">
  <div class="controls">
    <button class="button" on:click={togglePlayPause}>
      {isPlaying ? 'Pause' : 'Play'}
    </button>
    <button class="button" on:click={addTimestamp}>
      Add Timestamp
    </button>
    <button 
      class="button {isLooping ? 'active' : ''}" 
      on:click={toggleLoop}
    >
      Loop Region
    </button>
    <span class="time-display">
      {formatTime(currentTime)} / {formatTime(duration)}
    </span>
  </div>

  <div class="marker-points">
    <div class="marker-point {inPoint !== null ? 'active' : ''}">
      In: {inPoint !== null ? formatTime(inPoint) : '--:--'}
    </div>
    <div class="marker-point {outPoint !== null ? 'active' : ''}">
      Out: {outPoint !== null ? formatTime(outPoint) : '--:--'}
    </div>
  </div>

  <div class="waveform" bind:this={container}></div>

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