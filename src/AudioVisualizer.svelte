<script>
  import { onMount, onDestroy } from 'svelte';
  
  // Props
  export let audioUrl = null;
  export let height = 100;
  export let barWidth = 2;
  export let barGap = 1;
  export let barColor = '#ccff00';
  export let backgroundColor = '#2a2a2a';
  
  // Local state
  let canvas;
  let canvasContext;
  let audioContext;
  let analyser;
  let source;
  let animationId;
  let isInitialized = false;
  
  // Initialize audio visualization
  async function initializeVisualization() {
    if (!audioUrl || !canvas || isInitialized) return;
    
    try {
      // Create audio context
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create analyser node
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      
      // Get canvas context
      canvasContext = canvas.getContext('2d');
      
      // Load audio
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Create source node
      source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Connect nodes
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      // Set flag
      isInitialized = true;
      
      // Start visualization
      startVisualization();
      
      console.log('Audio visualization initialized');
    } catch (error) {
      console.error('Error initializing audio visualization:', error);
    }
  }
  
  // Start visualization
  function startVisualization() {
    if (!isInitialized) return;
    
    // Set canvas size
    canvas.width = canvas.clientWidth;
    canvas.height = height;
    
    // Start animation
    animationFrame();
  }
  
  // Animation frame
  function animationFrame() {
    // Request next frame
    animationId = requestAnimationFrame(animationFrame);
    
    // Get frequency data
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    
    // Clear canvas
    canvasContext.fillStyle = backgroundColor;
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate bar count and width
    const totalBars = Math.floor(canvas.width / (barWidth + barGap));
    const barCount = Math.min(totalBars, bufferLength);
    
    // Draw bars
    for (let i = 0; i < barCount; i++) {
      // Calculate bar height
      const barHeight = (dataArray[i] / 255) * canvas.height;
      
      // Calculate bar position
      const x = i * (barWidth + barGap);
      const y = canvas.height - barHeight;
      
      // Draw bar
      canvasContext.fillStyle = barColor;
      canvasContext.fillRect(x, y, barWidth, barHeight);
    }
  }
  
  // Handle window resize
  function handleResize() {
    if (!canvas) return;
    
    // Update canvas size
    canvas.width = canvas.clientWidth;
    canvas.height = height;
  }
  
  onMount(() => {
    // Initialize visualization when component is mounted
    initializeVisualization();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
  });
  
  onDestroy(() => {
    // Stop animation
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    
    // Disconnect audio nodes
    if (source) {
      source.disconnect();
    }
    
    if (analyser) {
      analyser.disconnect();
    }
    
    // Close audio context
    if (audioContext) {
      audioContext.close();
    }
    
    // Remove resize listener
    window.removeEventListener('resize', handleResize);
  });
  
  // Update when audioUrl changes
  $: {
    if (audioUrl && canvas && !isInitialized) {
      initializeVisualization();
    }
  }
</script>

<style>
  .visualizer-container {
    width: 100%;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 10px;
    margin-bottom: 10px;
  }
  
  canvas {
    display: block;
    width: 100%;
  }
</style>

<div class="visualizer-container">
  <canvas bind:this={canvas}></canvas>
</div>
