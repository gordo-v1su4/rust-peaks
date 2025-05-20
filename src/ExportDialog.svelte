<script>
  import { createEventDispatcher } from 'svelte';
  
  export let show = false;
  export let region = null;
  export let projectName = 'Untitled Project';
  
  const dispatch = createEventDispatcher();
  
  let exportFormat = 'mp3';
  let exportQuality = 'high';
  let exportName = '';
  
  $: if (region && region.id) {
    // Generate a default export name based on project and region
    exportName = `${projectName.replace(/\s+/g, '-').toLowerCase()}-region-${region.id.substring(0, 6)}`;
  }
  
  function closeDialog() {
    show = false;
  }
  
  function handleExport() {
    dispatch('export', {
      region,
      format: exportFormat,
      quality: exportQuality,
      name: exportName || `export-${Date.now()}`
    });
    
    closeDialog();
  }
  
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeDialog();
    }
  }
</script>

<style>
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .dialog {
    background-color: #18181b;
    border-radius: 8px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    border: 1px solid #3f3f46;
  }
  
  .dialog-header {
    padding: 15px 20px;
    border-bottom: 1px solid #3f3f46;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .dialog-title {
    font-size: 16px;
    font-weight: 600;
    color: #e6e6e6;
    margin: 0;
  }
  
  .close-button {
    background: transparent;
    border: none;
    color: #a1a1aa;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }
  
  .close-button:hover {
    color: #e6e6e6;
  }
  
  .dialog-content {
    padding: 20px;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  .form-label {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
    color: #a1a1aa;
  }
  
  .form-input {
    width: 100%;
    padding: 8px 10px;
    border-radius: 4px;
    border: 1px solid #3f3f46;
    background-color: #27272a;
    color: #e6e6e6;
    font-size: 14px;
  }
  
  .form-input:focus {
    outline: none;
    border-color: #00b8a9;
  }
  
  .form-select {
    width: 100%;
    padding: 8px 10px;
    border-radius: 4px;
    border: 1px solid #3f3f46;
    background-color: #27272a;
    color: #e6e6e6;
    font-size: 14px;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    background-size: 16px;
  }
  
  .form-select:focus {
    outline: none;
    border-color: #00b8a9;
  }
  
  .dialog-footer {
    padding: 15px 20px;
    border-top: 1px solid #3f3f46;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  
  .button {
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .cancel-button {
    background-color: transparent;
    color: #a1a1aa;
    border: 1px solid #3f3f46;
  }
  
  .cancel-button:hover {
    background-color: #27272a;
    color: #e6e6e6;
  }
  
  .export-button {
    background-color: #00b8a9;
    color: #121212;
    border: 1px solid transparent;
  }
  
  .export-button:hover {
    background-color: #00cebb;
    box-shadow: 0 2px 5px rgba(0, 184, 169, 0.3);
  }
  
  .region-info {
    background-color: #27272a;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 15px;
    font-size: 13px;
    color: #a1a1aa;
  }
  
  .region-info-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
  }
  
  .region-info-label {
    font-weight: 500;
  }
  
  .region-info-value {
    color: #e6e6e6;
  }
</style>

{#if show}
  <div 
    class="dialog-overlay" 
    on:click={closeDialog}
    on:keydown={handleKeydown}
  >
    <div 
      class="dialog" 
      on:click|stopPropagation={() => {}}
    >
      <div class="dialog-header">
        <h3 class="dialog-title">Export Region</h3>
        <button class="close-button" on:click={closeDialog}>×</button>
      </div>
      
      <div class="dialog-content">
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
        
        <div class="form-group">
          <label class="form-label" for="export-name">Export Name</label>
          <input 
            type="text" 
            id="export-name" 
            class="form-input" 
            bind:value={exportName} 
            placeholder="Enter a name for the export"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label" for="export-format">Format</label>
          <select id="export-format" class="form-select" bind:value={exportFormat}>
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
            <option value="ogg">OGG</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label" for="export-quality">Quality</label>
          <select id="export-quality" class="form-select" bind:value={exportQuality}>
            <option value="high">High (320kbps)</option>
            <option value="medium">Medium (192kbps)</option>
            <option value="low">Low (128kbps)</option>
          </select>
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="button cancel-button" on:click={closeDialog}>Cancel</button>
        <button class="button export-button" on:click={handleExport}>Export</button>
      </div>
    </div>
  </div>
{/if}
