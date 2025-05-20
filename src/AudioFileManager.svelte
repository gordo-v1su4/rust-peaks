<script>
  import { createEventDispatcher } from 'svelte';
  
  // Props
  export let maxFiles = 5;
  
  // Local state
  let audioFiles = [];
  let selectedFile = null;
  const dispatch = createEventDispatcher();
  
  // Methods
  function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;
    
    // Create URL objects for each file
    const newFiles = files.map(file => ({
      id: `file-${Math.random().toString(36).substring(2, 9)}`,
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      file
    }));
    
    // Add new files to the list (up to maxFiles)
    audioFiles = [...audioFiles, ...newFiles].slice(0, maxFiles);
    
    // Select the first new file
    if (!selectedFile && audioFiles.length > 0) {
      selectFile(audioFiles[0]);
    }
    
    // Reset the input
    event.target.value = '';
  }
  
  function selectFile(file) {
    selectedFile = file;
    dispatch('select', file);
  }
  
  function removeFile(id) {
    // Revoke object URL to prevent memory leaks
    const fileToRemove = audioFiles.find(file => file.id === id);
    if (fileToRemove) {
      URL.revokeObjectURL(fileToRemove.url);
    }
    
    // Remove file from list
    audioFiles = audioFiles.filter(file => file.id !== id);
    
    // If the selected file was removed, select another one if available
    if (selectedFile && selectedFile.id === id) {
      selectedFile = audioFiles.length > 0 ? audioFiles[0] : null;
      dispatch('select', selectedFile);
    }
  }
  
  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
</script>

<style>
  .audio-file-manager {
    background-color: #121212;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 15px;
    border: 1px solid #333;
  }
  
  h3 {
    margin-top: 0;
    margin-bottom: 12px;
    color: #00b8a9;
    font-size: 16px;
    font-weight: 500;
    letter-spacing: 0.5px;
  }
  
  .file-list {
    max-height: 200px;
    overflow-y: auto;
    margin-top: 15px;
    border: 1px solid #333;
    border-radius: 4px;
    background-color: #121212;
  }
  
  .file-item {
    background-color: transparent;
    padding: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    border-radius: 4px;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
  }
  
  .file-item:hover {
    background-color: rgba(0, 184, 169, 0.1);
  }
  
  .file-item.selected {
    background-color: rgba(0, 184, 169, 0.1);
    border-left: 2px solid #00b8a9;
  }
  
  .bullet {
    color: #00b8a9;
    margin-right: 8px;
    font-size: 12px;
    line-height: 1;
  }
  
  .file-info {
    flex: 1;
  }
  
  .file-name {
    font-size: 14px;
    margin-bottom: 2px;
    color: #e6e6e6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .file-meta {
    font-size: 11px;
    color: #888;
  }
  
  .remove-button {
    background-color: transparent;
    color: #666;
    border: none;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s ease;
    font-size: 16px;
  }
  
  .file-item:hover .remove-button {
    opacity: 1;
  }
  
  .remove-button:hover {
    color: #e03c31;
  }
  
  .empty-message {
    padding: 12px;
    text-align: center;
    color: #666;
    font-style: italic;
    font-size: 13px;
  }
  
  .file-input {
    display: none;
  }
  
  .file-label {
    background-color: #121212;
    color: #e6e6e6;
    border: 1px solid #333;
    border-radius: 3px;
    padding: 4px 8px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    letter-spacing: 0.5px;
    font-family: 'Inter', sans-serif;
    text-transform: uppercase;
    min-width: 70px;
  }
  
  .file-label:hover {
    background-color: #1a1a1a;
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.5);
    border-color: #00b8a9;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    text-align: center;
    border: 1px dashed #333;
    border-radius: 4px;
    margin-top: 15px;
  }

  .empty-icon {
    font-size: 24px;
    margin-bottom: 10px;
  }

  .empty-hint {
    font-size: 12px;
    color: #888;
    margin-top: 5px;
  }
</style>

<div class="audio-file-manager">
  <h3>Audio Files</h3>
  <input
    type="file"
    id="audio-upload"
    class="file-input"
    accept="audio/*"
    multiple
    on:change={handleFileUpload}
  />
  <label for="audio-upload" class="file-label">
    Open Audio File
  </label>
  
  {#if audioFiles.length > 0}
    <div class="file-list">
      {#each audioFiles as file}
        <div
          class="file-item {selectedFile && selectedFile.id === file.id ? 'selected' : ''}"
          on:click={() => selectFile(file)}
          on:keydown={(e) => e.key === 'Enter' && selectFile(file)}
          tabindex="0"
          role="option"
          aria-selected={selectedFile && selectedFile.id === file.id}
        >
          <span class="bullet">•</span>
          <div class="file-info">
            <div class="file-name">{file.name}</div>
            <div class="file-meta">{formatFileSize(file.size)}</div>
          </div>
          <button
            class="remove-button"
            on:click|stopPropagation={() => removeFile(file)}
            aria-label="Remove file"
          >
            ×
          </button>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <div class="empty-icon">🎵</div>
      <div class="empty-message">No audio files uploaded yet</div>
      <div class="empty-hint">Click "Open Audio File" to get started</div>
    </div>
  {/if}
</div>
