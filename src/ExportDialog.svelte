<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  // Props
  export let region = null;
  export let show = false;
  
  // Local state
  let name = '';
  let format = 'wav';
  let quality = 'high';
  
  // Reset form when dialog is shown
  $: if (show) {
    // Generate default name based on region
    name = region ? `Region_${formatTime(region.start)}-${formatTime(region.end)}` : 'Export';
  }
  
  // Format time in seconds to MM:SS format
  function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}_${secs.toString().padStart(2, '0')}`;
  }
  
  // Handle form submission
  function handleSubmit() {
    // Dispatch export event with form data
    dispatch('export', {
      region,
      name,
      format,
      quality
    });
    
    // Close dialog
    show = false;
  }
  
  // Handle cancel
  function handleCancel() {
    show = false;
  }
  
  // Handle click outside
  function handleClickOutside(event) {
    if (event.target.classList.contains('dialog-overlay')) {
      handleCancel();
    }
  }
  
  // Handle keydown
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      handleCancel();
    }
  }
</script>

<style>
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .dialog {
    background-color: #2a2a2a;
    border-radius: 8px;
    padding: 20px;
    width: 400px;
    max-width: 90%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
  
  .dialog-header {
    margin-bottom: 20px;
  }
  
  .dialog-title {
    color: #00b8a9;
    margin: 0;
    font-size: 20px;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  label {
    display: block;
    margin-bottom: 5px;
    color: #ccc;
  }
  
  input, select {
    width: 100%;
    padding: 8px 10px;
    background-color: #444;
    border: 1px solid #555;
    border-radius: 4px;
    color: #fff;
    font-size: 14px;
  }
  
  input:focus, select:focus {
    outline: none;
    border-color: #00b8a9;
  }
  
  .region-info {
    background-color: #1e1e1e;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 15px;
    font-family: monospace;
    font-size: 14px;
  }
  
  .region-info-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
  }
  
  .region-info-item:last-child {
    margin-bottom: 0;
  }
  
  .region-info-label {
    color: #888;
  }
  
  .region-info-value {
    color: #ccff00;
  }
  
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }
  
  button {
    padding: 8px 15px;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .cancel-button {
    background-color: #444;
    color: #fff;
  }
  
  .cancel-button:hover {
    background-color: #555;
  }
  
  .export-button {
    background-color: #00b8a9;
    color: #1e1e1e;
  }
  
  .export-button:hover {
    background-color: #00a598;
  }
</style>

{#if show}
  <div
    class="dialog-overlay"
    role="presentation"
    tabindex="-1"
    on:click={handleClickOutside}
    on:keydown={handleKeydown}
  >
    <div class="dialog" role="dialog" aria-labelledby="dialog-title">
      <div class="dialog-header">
        <h2 id="dialog-title" class="dialog-title">Export Audio Region</h2>
      </div>
      
      {#if region}
        <div class="region-info">
          <div class="region-info-item">
            <span class="region-info-label">Start:</span>
            <span class="region-info-value">{region.start.toFixed(2)}s</span>
          </div>
          <div class="region-info-item">
            <span class="region-info-label">End:</span>
            <span class="region-info-value">{region.end.toFixed(2)}s</span>
          </div>
          <div class="region-info-item">
            <span class="region-info-label">Duration:</span>
            <span class="region-info-value">{(region.end - region.start).toFixed(2)}s</span>
          </div>
        </div>
      {/if}
      
      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label for="export-name">Name</label>
          <input 
            type="text" 
            id="export-name" 
            bind:value={name} 
            required
          />
        </div>
        
        <div class="form-group">
          <label for="export-format">Format</label>
          <select id="export-format" bind:value={format}>
            <option value="wav">WAV</option>
            <option value="mp3">MP3</option>
            <option value="ogg">OGG</option>
            <option value="flac">FLAC</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="export-quality">Quality</label>
          <select id="export-quality" bind:value={quality}>
            <option value="low">Low (128kbps)</option>
            <option value="medium">Medium (256kbps)</option>
            <option value="high">High (320kbps)</option>
            <option value="lossless">Lossless</option>
          </select>
        </div>
        
        <div class="dialog-footer">
          <button 
            type="button" 
            class="cancel-button" 
            on:click={handleCancel}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            class="export-button"
          >
            Export
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
