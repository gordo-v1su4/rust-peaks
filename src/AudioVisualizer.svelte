<script>
  import { onMount, onDestroy } from 'svelte';
  
  export let audioUrl = null;
  export let height = 80;
  export let barWidth = 2;
  export let barGap = 1;
  export let barColor = '#00b8a9';
  
  let canvas;
  let audioContext;
  let analyser;
  let source;
  let audio;
  let animationId;
  let isPlaying = false;
  
  onMount(() => {
    if (!canvas) return;
    
    // Initialize audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    // Set up canvas
    const ctx = canvas.getContext('2d');
    
    // Load audio if URL is provided
    if (audioUrl) {
      loadAudio(audioUrl);
    }
  });
  
  onDestroy(() => {
    cancelAnimationFrame(animationId);
    if (source) {
      source.disconnect();
    }
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    if (audioContext) {
      audioContext.close();
    }
  });
  
  function loadAudio(url) {
    if (!audioContext || !analyser) return;
    
    // Create audio element
    audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = url;
    audio.addEventListener('canplay', () => {
      // Connect audio to analyser
      source = audioContext.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
    });
    
    // Set up play/pause events
    audio.addEventListener('play', () => {
      isPlaying = true;
      visualize();
    });
    
    audio.addEventListener('pause', () => {
      isPlaying = false;
      cancelAnimationFrame(animationId);
    });
    
    audio.addEventListener('ended', () => {
      isPlaying = false;
      cancelAnimationFrame(animationId);
    });
  }
  
  function visualize() {
    if (!canvas || !analyser) return;
    
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    
    function draw() {
      animationId = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = 'rgba(18, 18, 18, 0.2)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      
      const barCount = Math.floor(WIDTH / (barWidth + barGap));
      const barStep = Math.ceil(bufferLength / barCount);
      
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.min(i * barStep, bufferLength - 1);
        const barHeight = (dataArray[dataIndex] / 255) * HEIGHT;
        
        const x = i * (barWidth + barGap);
        const y = HEIGHT - barHeight;
        
        // Create gradient for bars
        const gradient = ctx.createLinearGradient(0, HEIGHT, 0, 0);
        gradient.addColorStop(0, barColor);
        gradient.addColorStop(1, '#ccff00');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    }
    
    draw();
  }
  
  // Function used by parent component
  function togglePlay() {
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      // Resume AudioContext if it was suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      audio.play();
    }
  }
  
  // Update audio URL when prop changes
  $: {
    if (audioUrl && canvas) {
      if (source) {
        source.disconnect();
      }
      if (audio) {
        audio.pause();
        audio.src = '';
      }
      loadAudio(audioUrl);
    }
  }
</script>

<style>
  .visualizer-container {
    width: 100%;
    background-color: #121212;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 15px;
    border: 1px solid #333;
  }
  
  canvas {
    display: block;
    width: 100%;
  }
</style>

<div class="visualizer-container">
  <canvas 
    bind:this={canvas} 
    width={window.innerWidth} 
    height={height}
  ></canvas>
</div>
