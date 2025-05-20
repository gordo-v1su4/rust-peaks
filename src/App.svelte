<script>
import { onMount } from 'svelte';
import AudioTimeline from './AudioTimeline.svelte';
import AudioFileManager from './AudioFileManager.svelte';

let selectedAudioUrl = null;
let projectName = 'Untitled Project';

function handleFileSelect(event) {
  selectedAudioUrl = event.detail.url;
}

onMount(() => {
  // Initialize any needed functionality here
});
</script>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #121212; /* pure dark background */
    color: #e6e6e6; /* light text */
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
    overflow-x: hidden; /* Prevent horizontal scrolling */
    box-sizing: border-box;
  }
  
  :global(*) {
    box-sizing: border-box;
  }

  :global(button) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    overflow-x: hidden;
  }
  
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #333;
  }
  
  .app-title {
    color: #00b8a9;
    font-size: 24px;
    font-weight: 600;
    margin: 0;
  }
  
  .project-title {
    font-size: 18px;
    color: #e6e6e6;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .project-title:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .title-input {
    background-color: #27272a;
    border: 1px solid #3f3f46;
    color: #e6e6e6;
    font-size: 18px;
    padding: 5px 10px;
    border-radius: 4px;
    width: 300px;
  }
  
  .title-input:focus {
    outline: none;
    border-color: #00b8a9;
  }
  
  .two-column {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 20px;
    width: 100%;
    max-width: 100%;
  }
  
  .main-content {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }
  
  @media (max-width: 768px) {
    .two-column {
      grid-template-columns: 1fr;
    }
  }
</style>

<div class="container">
  <div class="app-header">
    <h1 class="app-title">Audio Editor</h1>
    <div class="project-info">
      <span class="project-title">{projectName}</span>
    </div>
  </div>
  
  <div class="two-column">
    <div class="sidebar">
      <AudioFileManager on:select={handleFileSelect} />
    </div>
    
    <div class="main-content">
      <AudioTimeline 
        audioUrl={selectedAudioUrl} 
        bind:projectName={projectName}
      />
    </div>
  </div>
</div>
