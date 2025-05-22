<script>
  import { onMount } from 'svelte';
  import AudioTimeline from './AudioTimeline.svelte';
  import AudioFileManager from './AudioFileManager.svelte';
  import LibraryDocs from './LibraryDocs.svelte';
  
  // Use a sample audio file from the local public directory
  let audioUrl = '/sample.mp3';
  let showFileManager = false;
  let activeTab = 'editor'; // 'editor' or 'docs'
  
  function handleFileSelected(event) {
    audioUrl = event.detail.url;
    showFileManager = false;
  }
  
  function setTab(tab) {
    activeTab = tab;
  }
</script>

<main>
  <header>
    <h1>Audio Peaks</h1>
    <p>High-Performance Audio Analysis & Manipulation</p>
  </header>
  
  <nav class="tabs">
    <button
      class="tab-button"
      class:active={activeTab === 'editor'}
      on:click={() => setTab('editor')}
    >
      Audio Editor
    </button>
    <button
      class="tab-button"
      class:active={activeTab === 'docs'}
      on:click={() => setTab('docs')}
    >
      Documentation
    </button>
  </nav>
  
  {#if activeTab === 'editor'}
    {#if showFileManager}
      <AudioFileManager on:fileSelected={handleFileSelected} />
    {:else}
      <AudioTimeline {audioUrl} />
      
      <div class="button-row">
        <button on:click={() => showFileManager = true}>
          Load Different Audio
        </button>
      </div>
    {/if}
  {:else if activeTab === 'docs'}
    <LibraryDocs />
  {/if}
</main>

<style>
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }
  
  header {
    text-align: center;
    margin-bottom: 30px;
  }
  
  h1 {
    color: var(--primary-color);
    margin-bottom: 5px;
  }
  
  p {
    color: var(--light-gray);
    margin-top: 0;
  }
  
  .button-row {
    margin-top: 20px;
    display: flex;
    justify-content: center;
  }
  
  button {
    background-color: var(--primary-color);
    color: var(--dark-bg);
    border: none;
    border-radius: 4px;
    padding: 10px 20px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.1s;
  }
  
  button:hover {
    background-color: rgba(0, 184, 169, 0.8);
  }
  
  button:active {
    transform: scale(0.98);
  }
  
  .tabs {
    display: flex;
    justify-content: center;
    margin-bottom: 30px;
    border-bottom: 1px solid var(--medium-gray);
    padding-bottom: 10px;
  }
  
  .tab-button {
    background-color: transparent;
    color: var(--light-gray);
    border: none;
    padding: 10px 20px;
    margin: 0 10px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  
  .tab-button:hover {
    color: var(--light-text);
    background-color: transparent;
  }
  
  .tab-button.active {
    color: var(--primary-color);
  }
  
  .tab-button.active::after {
    content: '';
    position: absolute;
    bottom: -11px;
    left: 0;
    width: 100%;
    height: 3px;
    background-color: var(--primary-color);
    border-radius: 3px 3px 0 0;
  }
  
  :global(:root) {
    /* Color palette */
    --primary-color: #00b8a9;
    --secondary-color: #4b5eab;
    --accent-color: #ccff00;
    --dark-bg: #1e1e1e;
    --darker-bg: #121212;
    --light-text: #ffffff;
    --medium-gray: #444444;
    --light-gray: #888888;
    --error-color: #ff5252;
  }
  
  :global(body) {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: var(--darker-bg);
    color: var(--light-text);
    margin: 0;
    padding: 0;
    line-height: 1.6;
  }
</style>
