<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let dragActive = false;
  let fileInput;
  let errorMessage = '';
  
  // Handle file selection
  function handleFileChange(event) {
    const files = event.target.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }
  
  // Handle drag events
  function handleDragEnter(event) {
    event.preventDefault();
    dragActive = true;
  }
  
  function handleDragOver(event) {
    event.preventDefault();
    dragActive = true;
  }
  
  function handleDragLeave() {
    dragActive = false;
  }
  
  function handleDrop(event) {
    event.preventDefault();
    dragActive = false;
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }
  
  // Process the selected file
  function processFile(file) {
    // Check if file is an audio file
    if (!file.type.startsWith('audio/')) {
      errorMessage = 'Please select an audio file.';
      return;
    }
    
    errorMessage = '';
    
    // Create object URL for the file
    const url = URL.createObjectURL(file);
    
    // Dispatch event with file info
    dispatch('fileSelected', {
      file,
      url,
      name: file.name,
      type: file.type,
      size: file.size
    });
  }
  
  // Trigger file input click
  function openFileDialog() {
    fileInput.click();
  }
</script>

<style>
  .file-manager {
    background-color: #1e1e1e;
    border-radius: 8px;
    padding: 30px;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .drop-zone {
    border: 2px dashed #444;
    border-radius: 8px;
    padding: 40px 20px;
    margin-bottom: 20px;
    transition: all 0.3s ease;
    cursor: pointer;
  }
  
  .drop-zone.active {
    border-color: #00b8a9;
    background-color: rgba(0, 184, 169, 0.1);
  }
  
  .drop-zone:hover {
    border-color: #00b8a9;
  }
  
  h2 {
    color: #00b8a9;
    margin-top: 0;
    margin-bottom: 20px;
  }
  
  p {
    color: #ccc;
    margin-bottom: 20px;
  }
  
  .icon {
    font-size: 48px;
    color: #444;
    margin-bottom: 20px;
  }
  
  .drop-zone.active .icon {
    color: #00b8a9;
  }
  
  .file-input {
    display: none;
  }
  
  .browse-button {
    background-color: #00b8a9;
    color: #1e1e1e;
    border: none;
    border-radius: 4px;
    padding: 10px 20px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .browse-button:hover {
    background-color: #00a598;
  }
  
  .error-message {
    color: #ff5252;
    margin-top: 20px;
    font-weight: bold;
  }
  
  .supported-formats {
    color: #888;
    font-size: 14px;
    margin-top: 20px;
  }
</style>

<div class="file-manager">
  <h2>Upload Audio File</h2>
  
  <div
    class="drop-zone"
    class:active={dragActive}
    role="button"
    tabindex="0"
    aria-label="Upload audio file"
    on:click={openFileDialog}
    on:keydown={(e) => e.key === 'Enter' && openFileDialog()}
    on:dragenter={handleDragEnter}
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
  >
    <div class="icon">🎵</div>
    <p>Drag and drop your audio file here</p>
    <p>or</p>
    <button class="browse-button">Browse Files</button>
  </div>
  
  <input
    type="file"
    class="file-input"
    accept="audio/*"
    bind:this={fileInput}
    on:change={handleFileChange}
  />
  
  {#if errorMessage}
    <div class="error-message">{errorMessage}</div>
  {/if}
  
  <div class="supported-formats">
    Supported formats: MP3, WAV, OGG, FLAC, AAC
  </div>
</div>
