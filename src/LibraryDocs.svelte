<script>
  import { onMount } from 'svelte';
  import { Context7Analyzer } from './lib/audio-analysis/index.js';
  
  // Props
  export let libraryName = '';
  export let topic = '';
  
  // Local state
  let isLoading = false;
  let error = null;
  let docsResult = null;
  let analyzer = null;
  let availableTopics = [];
  
  // Library options with topics
  const libraryOptions = [
    {
      name: 'peaks.js',
      topics: ['waveform', 'audio visualization', 'segments', 'points', 'web audio']
    },
    {
      name: 'essentia.js',
      topics: ['algorithms', 'audio features', 'bpm detection', 'key detection', 'spectral analysis']
    },
    {
      name: 'tone.js',
      topics: ['audio processing', 'effects', 'synthesis', 'scheduling']
    },
    {
      name: 'web audio api',
      topics: ['audioworklet', 'audio processing', 'audio nodes', 'audio context']
    },
    {
      name: 'soundtouchjs',
      topics: ['pitch shifting', 'time stretching', 'audio effects']
    }
  ];
  
  // Initialize analyzer
  onMount(() => {
    analyzer = new Context7Analyzer({
      cacheResults: true,
      maxCacheAge: 3600000 // 1 hour
    });
  });
  
  // Fetch documentation when libraryName or topic changes
  $: {
    if (libraryName && analyzer) {
      updateAvailableTopics(libraryName);
      fetchDocs(libraryName, topic);
    }
  }
  
  // Update available topics when library changes
  function updateAvailableTopics(name) {
    const library = libraryOptions.find(lib => lib.name === name);
    availableTopics = library ? library.topics : [];
    
    // If current topic is not available for this library, reset it
    if (topic && availableTopics.length > 0 && !availableTopics.includes(topic)) {
      topic = '';
    }
  }
  
  // Fetch documentation
  async function fetchDocs(name, selectedTopic = '') {
    if (!name || !analyzer) return;
    
    isLoading = true;
    error = null;
    docsResult = null;
    
    try {
      const result = await analyzer.getLibraryDocs(name, selectedTopic);
      docsResult = result;
      console.log(`Loaded docs for ${name}${selectedTopic ? ` on topic: ${selectedTopic}` : ''}:`, docsResult);
    } catch (err) {
      console.error(`Error loading docs for ${name}:`, err);
      error = err.message || 'Failed to load documentation';
    } finally {
      isLoading = false;
    }
  }
  
  // Handle library selection
  function handleLibrarySelect(event) {
    libraryName = event.target.value;
    topic = ''; // Reset topic when library changes
  }
  
  // Handle topic selection
  function handleTopicSelect(event) {
    topic = event.target.value;
  }
  
  // Force refresh documentation
  async function refreshDocs() {
    if (!libraryName || !analyzer) return;
    
    isLoading = true;
    error = null;
    
    try {
      const result = await analyzer.getLibraryDocs(libraryName, topic, true); // Force refresh
      docsResult = result;
      console.log(`Refreshed docs for ${libraryName}:`, docsResult);
    } catch (err) {
      console.error(`Error refreshing docs for ${libraryName}:`, err);
      error = err.message || 'Failed to refresh documentation';
    } finally {
      isLoading = false;
    }
  }
</script>

<style>
  .docs-container {
    background-color: #1e1e1e;
    border-radius: 8px;
    padding: 20px;
    margin-top: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .docs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-bottom: 1px solid #444;
    padding-bottom: 10px;
  }
  
  .header-controls {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  
  h2 {
    color: var(--primary-color);
    margin: 0;
  }
  
  select {
    background-color: #2a2a2a;
    color: #fff;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 14px;
  }
  
  select:focus {
    outline: none;
    border-color: var(--primary-color);
  }
  
  .refresh-button {
    background-color: #2a2a2a;
    color: #fff;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: all 0.2s;
  }
  
  .refresh-button:hover:not(:disabled) {
    background-color: #333;
    border-color: var(--primary-color);
  }
  
  .refresh-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .refresh-icon {
    display: inline-block;
    font-size: 16px;
  }
  
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: #888;
  }
  
  .loading-spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid rgba(0, 184, 169, 0.3);
    border-radius: 50%;
    border-top-color: var(--primary-color);
    animation: spin 1s ease-in-out infinite;
    margin-right: 10px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error {
    background-color: rgba(255, 82, 82, 0.1);
    border: 1px solid var(--error-color);
    color: var(--error-color);
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .retry-button {
    background-color: var(--error-color);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 5px 10px;
    cursor: pointer;
    font-size: 12px;
  }
  
  .docs-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    margin-bottom: 20px;
    padding: 10px;
    background-color: #2a2a2a;
    border-radius: 4px;
  }
  
  .docs-meta-item {
    font-size: 14px;
  }
  
  .docs-content {
    line-height: 1.6;
  }
  
  /*
   * The following selectors are used for dynamically injected HTML content
   */
  :global(.docs-content h3) {
    color: var(--accent-color);
    margin-top: 25px;
    margin-bottom: 15px;
    border-bottom: 1px solid #333;
    padding-bottom: 5px;
  }
  
  :global(.docs-content pre) {
    background-color: #2a2a2a;
    padding: 15px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 15px 0;
  }
  
  :global(.docs-content code) {
    font-family: 'Courier New', monospace;
    color: #ccff00;
  }
  
  :global(.docs-content p) {
    margin: 10px 0;
  }
  
  :global(.docs-content ul) {
    padding-left: 20px;
  }
  
  :global(.docs-content li) {
    margin-bottom: 5px;
  }
  
  .empty-state {
    text-align: center;
    padding: 40px;
    color: #888;
  }
  
  .library-options {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 20px;
    margin-bottom: 15px;
  }
  
  .library-button {
    background-color: #2a2a2a;
    color: #fff;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 8px 15px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .library-button:hover {
    background-color: #333;
    border-color: #555;
  }
  
  .library-button.active {
    background-color: var(--primary-color);
    color: #1e1e1e;
    border-color: var(--primary-color);
  }
  
  .topic-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
  }
  
  .topic-button {
    background-color: #2a2a2a;
    color: #fff;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 5px 10px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .topic-button:hover {
    background-color: #333;
    border-color: #555;
  }
  
  .topic-button.active {
    background-color: var(--accent-color);
    color: #1e1e1e;
    border-color: var(--accent-color);
  }
  
  .code-examples {
    margin-top: 30px;
    border-top: 1px solid #444;
    padding-top: 20px;
  }
  
  .code-example {
    margin-bottom: 25px;
  }
  
  .code-example h4 {
    color: var(--accent-color);
    margin-bottom: 10px;
  }
</style>

<div class="docs-container">
  <div class="docs-header">
    <h2>Library Documentation</h2>
    
    <div class="header-controls">
      <select value={libraryName} on:change={handleLibrarySelect}>
        <option value="" disabled>Select a library</option>
        {#each libraryOptions as option}
          <option value={option.name}>{option.name}</option>
        {/each}
      </select>
      
      {#if availableTopics.length > 0}
        <select value={topic} on:change={handleTopicSelect}>
          <option value="">General documentation</option>
          {#each availableTopics as topicOption}
            <option value={topicOption}>{topicOption}</option>
          {/each}
        </select>
      {/if}
      
      <button class="refresh-button" on:click={refreshDocs} disabled={isLoading || !libraryName}>
        <span class="refresh-icon">↻</span>
        Refresh
      </button>
    </div>
  </div>
  
  <div class="library-options">
    {#each libraryOptions as option}
      <button
        class="library-button"
        class:active={libraryName === option.name}
        on:click={() => { libraryName = option.name; topic = ''; }}
      >
        {option.name}
      </button>
    {/each}
  </div>
  
  {#if availableTopics.length > 0}
    <div class="topic-options">
      <button
        class="topic-button"
        class:active={topic === ''}
        on:click={() => topic = ''}
      >
        General
      </button>
      
      {#each availableTopics as topicOption}
        <button
          class="topic-button"
          class:active={topic === topicOption}
          on:click={() => topic = topicOption}
        >
          {topicOption}
        </button>
      {/each}
    </div>
  {/if}
  
  {#if isLoading}
    <div class="loading">
      <div class="loading-spinner"></div>
      <span>Loading documentation...</span>
    </div>
  {:else if error}
    <div class="error">
      <strong>Error:</strong> {error}
      <button class="retry-button" on:click={() => fetchDocs(libraryName, topic)}>Retry</button>
    </div>
  {:else if docsResult}
    <div class="docs-meta">
      <div class="docs-meta-item">
        <strong>Library:</strong> {docsResult.libraryName}
      </div>
      {#if docsResult.libraryId}
        <div class="docs-meta-item">
          <strong>ID:</strong> {docsResult.libraryId}
        </div>
      {/if}
      {#if topic}
        <div class="docs-meta-item">
          <strong>Topic:</strong> {topic}
        </div>
      {/if}
    </div>
    
    <div class="docs-content">
      {@html docsResult.docs.content || docsResult.docs}
    </div>
    
    {#if docsResult.docs.codeExamples && docsResult.docs.codeExamples.length > 0}
      <div class="code-examples">
        <h3>Code Examples</h3>
        {#each docsResult.docs.codeExamples as example}
          <div class="code-example">
            <h4>{example.title}</h4>
            <pre><code>{example.code}</code></pre>
          </div>
        {/each}
      </div>
    {/if}
  {:else}
    <div class="empty-state">
      <p>Select a library to view its documentation</p>
    </div>
  {/if}
</div>