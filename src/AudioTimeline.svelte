<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import WaveSurfer from 'wavesurfer.js';
  import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
  import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js';
  import ExportDialog from './ExportDialog.svelte';
  import AudioVisualizer from './AudioVisualizer.svelte';
  
  // Props
  export let audioUrl = null;
  export let height = 128;
  export let waveColor = 'rgba(0, 184, 169, 0.3)';
  export let progressColor = 'rgba(0, 184, 169, 0.7)';
  export let cursorColor = '#ccff00';
  export let cursorWidth = 2;
  
  // Local state
  let wavesurfer;
  let regionsPlugin;
  let container;
  let timelineContainer;
  let isPlaying = false;
  let duration = 0;
  let currentTime = 0;
  let volume = 1;
  let zoom = 1; // Start with minimum zoom to ensure entire track fits
  // Properties for regions and markers
  let regions = [];
  let markers = [];
  let activeRegion = null;
  let isLoaded = false;
  let isAnalyzing = false;
  let songStructure = [];
  let showStructureOverlay = false;
  let markerName = '';
  let showExportDialog = false;
  
  // Transient detection variables
  let isDetectingTransients = false;
  let transientDensity = 50; // Default value, range 0-100
  let transientRandomness = 30; // Default value, range 0-100
  let transientSensitivity = 70; // How sensitive detection is, range 0-100
  let transientMinSpacing = 0.5; // Minimum time (in seconds) between transients
  let transientMarkers = []; // Store transient markers separately
  let isTransientHit = false; // Indicator for transient detection light
  let transientHitTimeout = null; // Timeout for turning off the hit indicator
  
  // Generate unique shades of blue and purple for markers
  function generateMarkerColor(index) {
    // Create different shades of blue and purple
    const hue = 230 + (index * 15) % 60; // Range from 230 (blue) to 290 (purple)
    const saturation = 60 + (index * 5) % 20; // Range from 60% to 80%
    const lightness = 40 + (index * 3) % 20; // Range from 40% to 60%
    return `hsla(${hue}, ${saturation}%, ${lightness}%, 0.6)`;
  }
  
  // Generate colors for transient markers from yellow to red
  function generateTransientColor(position) {
    // Use position (0-1) to interpolate between yellow and red
    const hue = 60 - (position * 60); // 60 is yellow, 0 is red
    const saturation = 80 + (position * 10); // 80-90%
    const lightness = 50 - (position * 15); // 50-35%
    return `hsla(${hue}, ${saturation}%, ${lightness}%, 0.7)`;
  }
  
  // Create a unique ID for this instance
  const id = `waveform-${Math.random().toString(36).substring(2, 9)}`;
  const timelineId = `timeline-${Math.random().toString(36).substring(2, 9)}`;
  
  // Project title functionality from AudioEditor
  let projectName = 'Untitled Project';
  let isEditingTitle = false;
  
  // Toggle project title editing
  function toggleTitleEdit() {
    isEditingTitle = !isEditingTitle;
  }
  
  // Handle title input blur
  function handleTitleBlur() {
    isEditingTitle = false;
    // Trim and set default if empty
    projectName = projectName.trim() || 'Untitled Project';
  }
  
  // Handle title input keydown
  function handleTitleKeydown(event) {
    if (event.key === 'Enter') {
      handleTitleBlur();
    }
  }
  
  onMount(() => {
    if (!container) return;
    
    // Create WaveSurfer instance
    wavesurfer = WaveSurfer.create({
      container,
      height,
      waveColor,
      progressColor,
      cursorColor,
      cursorWidth,
      normalize: true,
      minimap: true,
      backend: 'WebAudio',
      // Ensure we're zoomed out to see the entire track initially
      fillParent: true,
      responsive: true,
      // Add this to prevent horizontal overflow
      scrollParent: false,
      // Make sure waveform fits within container
      autoCenter: true,
      plugins: [
        // Store the regions plugin reference for later use
        regionsPlugin = RegionsPlugin.create({
          dragSelection: true,
          slop: 5, // Additional pixels for regions to extend beyond their boundaries for easier selection
          opacity: 0.3
        }),
        TimelinePlugin.create({
          container: timelineContainer,
          primaryLabelInterval: 10,
          secondaryLabelInterval: 5,
          primaryColor: 'rgba(0, 0, 0, 1)',
          secondaryColor: 'rgba(0, 0, 0, 0.5)',
          primaryFontColor: '#000',
          secondaryFontColor: '#000'
        })
      ]
    });
    
    // Event listeners
    wavesurfer.on('ready', () => {
      duration = wavesurfer.getDuration();
      isLoaded = true;
      
      // Calculate the perfect zoom level to fit the entire track
      const containerWidth = container.clientWidth;
      if (containerWidth && duration) {
        // Calculate pixels per second to fit perfectly
        const minPxPerSec = containerWidth / duration;
        wavesurfer.zoom(minPxPerSec);
        zoom = 1; // Set UI zoom slider to minimum
      } else {
        // Fallback to minimum zoom
        setZoom(1);
      }
    });
    
    wavesurfer.on('audioprocess', () => {
      currentTime = wavesurfer.getCurrentTime();
      
      // Check if we're hitting any transient markers
      checkTransientHit(currentTime);
    });
    
    wavesurfer.on('play', () => {
      isPlaying = true;
    });
    
    wavesurfer.on('pause', () => {
      isPlaying = false;
    });
    
    wavesurfer.on('region-created', region => {
      regions = [...regions, region];
      activeRegion = region;
    });
    
    wavesurfer.on('region-updated', region => {
      regions = regions.map(r => r.id === region.id ? region : r);
    });
    
    wavesurfer.on('region-clicked', region => {
      activeRegion = region;
    });
    
    wavesurfer.on('region-removed', region => {
      regions = regions.filter(r => r.id !== region.id);
      if (activeRegion && activeRegion.id === region.id) {
        activeRegion = null;
      }
    });
    
    // Load audio if URL is provided
    if (audioUrl) {
      loadAudio(audioUrl);
    }
  });
  
  onDestroy(() => {
    if (wavesurfer) {
      wavesurfer.destroy();
    }
    
    // Clean up transient hit timeout
    if (transientHitTimeout) {
      clearTimeout(transientHitTimeout);
    }
  });
  
  // Methods
  function loadAudio(url) {
    if (!wavesurfer) return;
    isLoaded = false;
    
    // Clear any existing markers and regions when loading a new file
    clearRegions();
    markers = [];
    clearTransientMarkers();
    
    wavesurfer.load(url);
    
    // Reset zoom when loading a new file
    wavesurfer.once('ready', () => {
      // Set a slight delay to ensure the waveform is fully loaded
      setTimeout(() => {
        // Calculate the perfect zoom level to fit the entire track
        const containerWidth = container.clientWidth;
        if (containerWidth && wavesurfer.getDuration()) {
          // Calculate pixels per second to fit perfectly
          const minPxPerSec = containerWidth / wavesurfer.getDuration();
          wavesurfer.zoom(minPxPerSec);
          zoom = 1; // Set UI zoom slider to minimum
        } else {
          // Fallback to minimum zoom
          setZoom(1);
        }
      }, 100);
    });
  }
  
  function togglePlay() {
    if (!wavesurfer) return;
    wavesurfer.playPause();
  }
  
  function stop() {
    if (!wavesurfer) return;
    wavesurfer.stop();
    isPlaying = false;
  }
  
  function setVolume(value) {
    if (!wavesurfer) return;
    volume = value;
    wavesurfer.setVolume(volume);
  }
  
  function setZoom(value) {
    if (!wavesurfer) return;
    zoom = value;
    
    // Calculate appropriate minPxPerSec based on current zoom level and container width
    const containerWidth = container.clientWidth;
    const trackDuration = wavesurfer.getDuration();
    
    if (trackDuration && containerWidth) {
      // At minimum zoom (1), we want the entire track to fit exactly in the container
      // At maximum zoom (100), we want much more detail
      const minPxPerSec = zoom === 1 ? 
        (containerWidth / trackDuration) : // Perfect fit at zoom level 1
        (containerWidth / trackDuration) * (1 + (zoom * 0.3)); // Gradually increase detail
        
      // Apply zoom with the calculated pixels per second
      wavesurfer.zoom(minPxPerSec);
    } else {
      // Fallback to simple zoom if we can't calculate optimal value
      wavesurfer.zoom(value);
    }
    
    // Ensure the waveform stays centered and contained
    if (wavesurfer.drawer && wavesurfer.drawer.recenter) {
      wavesurfer.drawer.recenter(wavesurfer.getCurrentTime() / wavesurfer.getDuration());
    }
  }
  
  function seekTo(position) {
    if (!wavesurfer) return;
    wavesurfer.seekTo(position / duration);
  }
  
  function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  function createRegion() {
    if (!wavesurfer) return;
    const region = wavesurfer.addRegion({
      start: currentTime,
      end: Math.min(currentTime + 5, duration),
      color: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.2)`,
      drag: true,
      resize: true
    });
    
    activeRegion = region;
  }
  
  function deleteRegion() {
    if (!activeRegion) return;
    activeRegion.remove();
  }
  
  function playRegion() {
    if (!activeRegion || !wavesurfer) return;
    
    // Set playback position to region start
    wavesurfer.setTime(activeRegion.start);
    
    // Start playback
    wavesurfer.play();
  }
  
  // This is intentionally removed to fix the duplicate function issue
  
  function handleExport(event) {
    const { region, format, quality, name } = event.detail;
    
    // In a real app, you would use Web Audio API to extract and convert the audio
    // For now, we'll just show an alert with the export details
    alert(`Exporting region as ${format.toUpperCase()}:
    Name: ${name}
    Start: ${region.start.toFixed(2)}s
    End: ${region.end.toFixed(2)}s
    Quality: ${quality}
    `);
  }
  
  function exportRegion() {
    if (!activeRegion || !wavesurfer) return;
    showExportDialog = true;
  }
  
  // Marker functions
  function createMarker() {
    if (!wavesurfer || !isLoaded) return;
    
    const timePosition = wavesurfer.getCurrentTime();
    const markerId = `marker-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create marker label based on timestamp
    // Find nearest existing markers to determine number
    let markerNumber;
    
    if (markers.length === 0) {
      markerNumber = 1;
    } else {
      // Sort markers by time
      const sortedMarkers = [...markers].sort((a, b) => a.start - b.start);
      
      // Find position in the sorted array
      let insertIndex = sortedMarkers.findIndex(m => m.start > timePosition);
      if (insertIndex === -1) {
        // If it should be placed at the end
        insertIndex = sortedMarkers.length;
      }
      
      // Determine marker number
      if (insertIndex === 0) {
        // Before the first marker
        markerNumber = sortedMarkers[0].data.number / 2;
      } else if (insertIndex === sortedMarkers.length) {
        // After the last marker
        markerNumber = sortedMarkers[sortedMarkers.length - 1].data.number + 1;
      } else {
        // Between two markers
        markerNumber = (sortedMarkers[insertIndex - 1].data.number + sortedMarkers[insertIndex].data.number) / 2;
      }
    }
    
    // Generate marker color based on its number
    const markerColor = generateMarkerColor(Math.floor(markerNumber * 10));
    
    // Create a marker (using a region with small width)
    const marker = regionsPlugin.addRegion({
      id: markerId,
      start: timePosition,
      end: timePosition + 0.01, // Very small to act as a marker
      color: markerColor,
      drag: false,
      resize: false,
      data: { 
        type: 'marker', 
        number: markerNumber,
        timestamp: formatTime(timePosition)
      }
    });
    
    // Add visual indicator for the marker
    marker.element.style.width = '2px';
    marker.element.style.borderRadius = '0';
    marker.element.style.cursor = 'pointer';
    
    // Add marker label
    const label = document.createElement('div');
    label.className = 'marker-label';
    label.textContent = markerNumber.toFixed(1);
    label.style.position = 'absolute';
    label.style.top = '-20px';
    label.style.left = '50%';
    label.style.transform = 'translateX(-50%)';
    label.style.fontSize = '10px';
    label.style.color = '#fff';
    label.style.backgroundColor = markerColor;
    label.style.padding = '1px 3px';
    label.style.borderRadius = '2px';
    marker.element.appendChild(label);
    
    markers = [...markers, marker];
    
    // Initialize song structure overlay if not already shown
    if (!showStructureOverlay && markers.length === 1) {
      showStructureOverlay = true;
      
      // Create a basic structure if none exists
      if (songStructure.length === 0) {
        songStructure = [{
          id: 'full-track',
          name: 'Full Track',
          start: 0,
          end: duration,
          color: 'rgba(0, 184, 169, 0.2)',
          startPercent: 0,
          widthPercent: 100
        }];
      }
    }
  }
  
  function deleteMarker(markerId) {
    if (!wavesurfer) return;
    
    // Find and remove the marker from the regions plugin
    const marker = regionsPlugin.getRegions().find(r => r.id === markerId);
    if (marker) {
      marker.remove();
      markers = markers.filter(m => m.id !== markerId);
    }
  }
  
  // Simplified audio analysis that creates reliable regions
  async function analyzeAudio() {
    if (!wavesurfer || !isLoaded) return;
    
    isAnalyzing = true;
    console.log('Starting audio analysis...');
    
    try {
      // First destroy any existing regions completely
      if (wavesurfer.getRegions) {
        const existingRegions = wavesurfer.getRegions();
        if (existingRegions && existingRegions.length > 0) {
          existingRegions.forEach(region => {
            try {
              if (region && region.remove) {
                region.remove();
              }
            } catch (e) {
              console.log('Error cleaning up region:', e);
            }
          });
        }
      }
      
      // Reset our regions array
      regions = [];
      
      // Wait for regions to be fully cleared
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get audio duration from wavesurfer
      const duration = wavesurfer.getDuration();
      if (!duration || duration <= 0) {
        console.error('Invalid audio duration');
        return;
      }
      
      console.log('Audio duration:', duration);
      
      // Use a consistent teal/yellow color palette for a professional look
      // Define section colors with dark teal palette
      const sectionColors = {
        intro: 'rgba(0, 104, 94, 0.4)',    // dark teal
        verse: 'rgba(0, 134, 124, 0.4)',   // medium teal
        pre: 'rgba(0, 154, 140, 0.4)',     // teal
        chorus: 'rgba(0, 184, 169, 0.4)',  // light teal
        bridge: 'rgba(0, 124, 114, 0.4)',  // dark teal
        outro: 'rgba(0, 104, 94, 0.4)'     // dark teal
      };
      
      // Create a standard song structure - simplified approach that won't cause errors
      const structureData = [];
      // We already have regions variable declared at the top
      
      // Calculate section lengths based on song duration
      let introLength, verseLength, preChorusLength, chorusLength, bridgeLength, outroLength;
      
      // Adjust section lengths based on total duration
      if (duration <= 60) { // Short track (< 1 min)
        introLength = duration * 0.1;
        outroLength = duration * 0.1;
        // No bridge for short tracks
        bridgeLength = 0;
        
        // Split remaining time between verse and chorus
        const remainingTime = duration - (introLength + outroLength);
        verseLength = remainingTime * 0.6;
        chorusLength = remainingTime * 0.4;
        preChorusLength = 0;
      } 
      else if (duration <= 180) { // Medium track (1-3 min)
        introLength = duration * 0.1;
        outroLength = duration * 0.1;
        bridgeLength = duration * 0.1;
        preChorusLength = duration * 0.1;
        
        // Split remaining time between verse and chorus
        const remainingTime = duration - (introLength + outroLength + bridgeLength + preChorusLength);
        verseLength = remainingTime * 0.6;
        chorusLength = remainingTime * 0.4;
      } 
      else { // Long track (> 3 min)
        introLength = duration * 0.08;
        outroLength = duration * 0.08;
        bridgeLength = duration * 0.12;
        preChorusLength = duration * 0.1;
        
        // Split remaining time between verse and chorus
        const remainingTime = duration - (introLength + outroLength + bridgeLength + preChorusLength);
        verseLength = remainingTime * 0.55;
        chorusLength = remainingTime * 0.45;
      }
      
      // Create each section without using wavesurfer regions first
      // This avoids race conditions
      
      // Intro
      let currentTime = 0;
      structureData.push({
        id: 'section-intro',
        name: 'Intro',
        start: currentTime,
        end: introLength,
        color: sectionColors.intro
      });
      currentTime += introLength;
      
      // First verse
      structureData.push({
        id: 'section-verse1',
        name: 'Verse 1',
        start: currentTime,
        end: currentTime + verseLength,
        color: sectionColors.verse
      });
      currentTime += verseLength;
      
      // Pre-chorus if we have one
      if (preChorusLength > 0) {
        structureData.push({
          id: 'section-pre1',
          name: 'Pre-Chorus',
          start: currentTime,
          end: currentTime + preChorusLength,
          color: sectionColors.pre
        });
        currentTime += preChorusLength;
      }
      
      // First chorus
      structureData.push({
        id: 'section-chorus1',
        name: 'Chorus 1',
        start: currentTime,
        end: currentTime + chorusLength,
        color: sectionColors.chorus
      });
      currentTime += chorusLength;
      
      // Second verse if we have enough time
      if (duration > 90) {
        structureData.push({
          id: 'section-verse2',
          name: 'Verse 2',
          start: currentTime,
          end: currentTime + verseLength,
          color: sectionColors.verse
        });
        currentTime += verseLength;
        
        // Pre-chorus if we have one
        if (preChorusLength > 0) {
          structureData.push({
            id: 'section-pre2',
            name: 'Pre-Chorus',
            start: currentTime,
            end: currentTime + preChorusLength,
            color: sectionColors.pre
          });
          currentTime += preChorusLength;
        }
        
        // Second chorus
        structureData.push({
          id: 'section-chorus2',
          name: 'Chorus 2',
          start: currentTime,
          end: currentTime + chorusLength,
          color: sectionColors.chorus
        });
        currentTime += chorusLength;
      }
      
      // Bridge if we have enough time
      if (bridgeLength > 0) {
        structureData.push({
          id: 'section-bridge',
          name: 'Bridge',
          start: currentTime,
          end: currentTime + bridgeLength,
          color: sectionColors.bridge
        });
        currentTime += bridgeLength;
        
        // Final chorus after bridge
        structureData.push({
          id: 'section-chorus3',
          name: 'Chorus 3',
          start: currentTime,
          end: currentTime + chorusLength,
          color: sectionColors.chorus
        });
        currentTime += chorusLength;
      }
      
      // Outro
      if (currentTime < duration) {
        structureData.push({
          id: 'section-outro',
          name: 'Outro',
          start: currentTime,
          end: duration,
          color: sectionColors.outro
        });
      }
      
      // Now create the visual display of the structure without using wavesurfer regions
      // This ensures we always have a visual representation even if region creation fails
      showStructureOverlay = true;
      
      // Create a deep copy for UI purposes
      const uiStructure = structureData.map(section => ({
        ...section,
        startPercent: (section.start / duration) * 100,
        widthPercent: ((section.end - section.start) / duration) * 100
      }));
      
      // Update the song structure in the UI
      songStructure = uiStructure;
      
      console.log('Song structure created:', uiStructure);
    } catch (error) {
      console.error('Error analyzing audio:', error);
      
      // Fallback to a simple structure without regions
      try {
        const duration = wavesurfer.getDuration();
        songStructure = [{
          id: 'fallback-section',
          name: 'Full Track',
          start: 0,
          end: duration,
          color: 'rgba(0, 184, 169, 0.5)', // teal
          startPercent: 0,
          widthPercent: 100
        }];
        showStructureOverlay = true;
      } catch (e) {
        console.error('Final fallback failed:', e);
      }
    } finally {
      isAnalyzing = false;
    }
  }
  
  // Helper function to clear all regions
  function clearRegions() {
    // Clear existing regions
    if (regions.length > 0) {
      regions.forEach(region => {
        try {
          if (region && region.remove) {
            region.remove();
          }
        } catch (e) {
          console.log('Error removing region:', e);
        }
      });
      regions = [];
    }
  }
  
  // Jump to a specific section in the song
  function jumpToSection(sectionId) {
    if (!wavesurfer) return;
    
    const section = songStructure.find(s => s.id === sectionId);
    if (section) {
      wavesurfer.seekTo(section.start / duration);
      currentTime = section.start;
      // Highlight the active region visually
      regions.forEach(region => {
        if (region.id === sectionId) {
          activeRegion = region;
          region.setOptions({ opacity: 0.5 });
        } else {
          region.setOptions({ opacity: 0.3 });
        }
      });
    }
  }
  
  // Update audio URL when prop changes
  $: {
    if (wavesurfer && audioUrl) {
      loadAudio(audioUrl);
    }
  }
  
  // Detect transients in audio file
  async function detectTransients() {
    if (!wavesurfer || !isLoaded || isDetectingTransients) return;
    
    isDetectingTransients = true;
    
    try {
      // First clean up any existing transient markers
      clearTransientMarkers();
      
      // Get audio buffer from wavesurfer
      const audioBuffer = wavesurfer.getDecodedData();
      if (!audioBuffer) {
        console.error('No audio data available');
        return;
      }
      
      // Get audio data from the first channel
      const rawData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      
      // Parameter adjustments based on sliders
      const skipFactor = Math.max(1, Math.round((101 - transientDensity) * 0.2)); // Higher density = fewer samples skipped
      const randomThreshold = transientRandomness / 100; // Probability of keeping a detected transient
      const sensitivity = 1 - (transientSensitivity / 100); // Lower value = more sensitive
      const minSpacingSamples = Math.floor(transientMinSpacing * sampleRate); // Convert seconds to samples

      // Basic transient detection using amplitude differential
      const transients = [];
      let prevAvg = 0;
      let windowSize = Math.floor(sampleRate * 0.01); // 10ms window
      let lastTransientSample = -minSpacingSamples; // Initialize to ensure first transient is considered
      
      // Step through audio data in window-sized chunks
      for (let i = 0; i < rawData.length; i += windowSize * skipFactor) {
        // Calculate RMS of current window
        let sum = 0;
        for (let j = 0; j < windowSize; j++) {
          if (i + j < rawData.length) {
            sum += rawData[i + j] * rawData[i + j];
          }
        }
        const rms = Math.sqrt(sum / windowSize);
        
        // Detect sudden increase in amplitude
        if (rms > prevAvg * (1 + sensitivity) && rms > 0.01) {
          // Check if we're far enough from the last detected transient
          if (i - lastTransientSample >= minSpacingSamples) {
            // Apply randomness factor
            if (Math.random() > randomThreshold) {
              const time = i / sampleRate;
              if (time > 0 && time < duration) {
                transients.push(time);
                lastTransientSample = i; // Update last transient position
              }
            }
          }
        }
        prevAvg = (prevAvg + rms) / 2; // Smooth the comparison
      }
      
      console.log(`Detected ${transients.length} transients with density ${transientDensity}, randomness ${transientRandomness}, sensitivity ${transientSensitivity}, min spacing ${transientMinSpacing}s`);
      
      // Create markers for detected transients
      transients.forEach((time, index) => {
        createTransientMarker(time, index, transients.length);
      });
      
    } catch (err) {
      console.error('Error detecting transients:', err);
    } finally {
      isDetectingTransients = false;
    }
  }
  
  // Create a marker for a detected transient
  function createTransientMarker(time, index, total) {
    if (!wavesurfer || !regionsPlugin) return;
    
    const position = index / total; // Normalized position (0-1) for color gradient
    const markerId = `transient-${Math.random().toString(36).substring(2, 9)}`;
    const markerColor = generateTransientColor(position);
    
    // Create a marker using a region
    const marker = regionsPlugin.addRegion({
      id: markerId,
      start: time,
      end: time + 0.01, // Very small to act as a marker
      color: markerColor,
      drag: false,
      resize: false,
      data: { 
        type: 'transient',
        index: index + 1,
        timestamp: formatTime(time)
      }
    });
    
    // Style the marker
    marker.element.style.width = '1px';
    marker.element.style.borderRadius = '0';
    marker.element.style.opacity = '0.8';
    
    // Store the marker
    transientMarkers.push(marker);
  }
  
  // Clear all transient markers
  function clearTransientMarkers() {
    if (transientMarkers.length > 0) {
      transientMarkers.forEach(marker => {
        try {
          if (marker && marker.remove) {
            marker.remove();
          }
        } catch (e) {
          console.log('Error removing transient marker:', e);
        }
      });
      transientMarkers = [];
    }
  }
  
  // Check if the current playback position is close to any transient marker
  function checkTransientHit(time) {
    if (!isPlaying || transientMarkers.length === 0) return;
    
    // Define "hit" tolerance in seconds
    const hitTolerance = 0.05; // 50ms tolerance
    
    // Check if we're within the tolerance of any transient marker
    const isHit = transientMarkers.some(marker => 
      Math.abs(marker.start - time) < hitTolerance
    );
    
    // If we hit a marker and we're not already in a hit state
    if (isHit && !isTransientHit) {
      // Set hit state
      isTransientHit = true;
      
      // Clear any existing timeout
      if (transientHitTimeout) {
        clearTimeout(transientHitTimeout);
      }
      
      // Set timeout to turn off the hit indicator after a short time
      transientHitTimeout = setTimeout(() => {
        isTransientHit = false;
      }, 150); // Light stays on for 150ms
    }
  }
</script>

<style>
  /* Dark mode theme */
  .audio-timeline {
    width: 100%;
    padding: 15px;
    background-color: #1e1e1e;
    border-radius: 8px;
    margin-bottom: 20px;
    color: #e4e4e7; /* zinc-200 */
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow-x: hidden;
  }
  
  .project-header {
    display: flex;
    justify-content: center;
    margin-bottom: 15px;
  }
  
  .project-title {
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    padding: 5px 10px;
    border-radius: 4px;
    color: #e4e4e7; /* zinc-200 */
    transition: background-color 0.2s;
    display: inline-block;
  }
  
  .project-title:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .title-input {
    background-color: #27272a; /* zinc-800 */
    border: 1px solid #52525b; /* zinc-600 */
    color: #e4e4e7; /* zinc-200 */
    font-size: 18px;
    padding: 5px 10px;
    border-radius: 4px;
    text-align: center;
  }
  
  .title-input:focus {
    outline: none;
    border-color: #00b8a9;
  }

  .waveform-container {
    width: 100%;
    background-color: #18181b; /* zinc-900 */
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    background-color: #121212;
    box-sizing: border-box;
    max-width: 100%;
  }

  .timeline-container {
    width: 100%;
    height: 30px;
    background-color: #27272a; /* zinc-800 */
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
    border-top: 1px solid #3f3f46; /* zinc-700 */
    overflow: hidden;
    box-sizing: border-box;
  }

  .controls {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .transport-controls {
    display: flex;
    gap: 5px;
  }

  .button {
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

  .button:hover {
    background-color: #1a1a1a;
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.5);
    border-color: #00b8a9;
  }

  .button:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .button:disabled {
    background-color: #1a1a1a;
    border-color: #333;
    color: #666;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .time-info {
    font-size: 14px;
    color: #a1a1aa; /* zinc-400 */
    margin: 0 10px;
    min-width: 100px;
    font-weight: 500;
  }

  .slider-container {
    display: flex;
    align-items: center;
    margin-left: 10px;
  }

  .slider-label {
    margin-right: 5px;
    font-size: 14px;
    color: #a1a1aa; /* zinc-400 */
    font-weight: 500;
  }

  .slider {
    -webkit-appearance: none;
    appearance: none;
    width: 80px;
    height: 4px;
    border-radius: 2px;
    background: #333;
    outline: none;
  }

  .slider-teal::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    background: #00b8a9;
    cursor: pointer;
  }
  
  .slider-teal::-moz-range-thumb {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    background: #00b8a9;
    cursor: pointer;
    border: none;
  }

  .region-controls {
    display: flex;
    align-items: center;
    margin-top: 15px;
    gap: 10px;
    flex-wrap: wrap;
  }

  .analyze-button {
    background-color: #00b8a9;
    color: #121212;
    border-color: transparent;
  }

  .analyze-button:hover {
    background-color: #00cebb;
    box-shadow: 0 3px 8px rgba(0, 184, 169, 0.4);
  }

  .analyze-button:active {
    background-color: #00a396;
  }

  .analyze-button:disabled {
    background-color: #1a1a1a;
    color: #666;
    border-color: #333;
  }

  .song-structure {
    margin-top: 20px;
    padding: 15px;
    background-color: #18181b; /* zinc-900 */
    border-radius: 8px;
    border: 1px solid #3f3f46; /* zinc-700 */
  }

  .structure-overlay {
    position: relative;
    height: 30px;
    width: 100%;
    background-color: #27272a; /* zinc-800 */
    border-radius: 4px;
    margin-bottom: 10px;
    overflow: hidden;
    border: 1px solid #3f3f46; /* zinc-700 */
  }
  
  /* Used in the song section display */
  .section-item {
    background-color: rgba(0, 184, 169, 0.15);
    padding: 4px 6px;
    border-radius: 3px;
    margin-bottom: 3px;
    cursor: pointer;
    font-size: 11px;
    border: 1px solid rgba(0, 184, 169, 0.3);
  }

  .structure-section {
    position: absolute;
    top: 0;
    height: 100%;
    min-width: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-right: 1px solid rgba(255, 255, 255, 0.3);
  }
  
  .section-label {
    color: white;
    font-size: 10px;
    font-weight: bold;
    white-space: nowrap;
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.7);
    padding: 0 4px;
  }

  .song-structure h3 {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 14px;
    color: #e6e6e6;
  }
  
  .structure-sections {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .section-button {
    padding: 3px 6px;
    border: none;
    border-radius: 2px;
    color: #fff;
    font-size: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    background-color: rgba(0, 134, 124, 0.7);
    border: 1px solid rgba(0, 184, 169, 0.3);
  }
  
  .section-button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100px;
    width: 100%;
    font-style: italic;
    color: #666;
  }

  .marker-item {
    position: absolute;
    bottom: 30px;
    transform: translateX(-50%);
    background-color: #2d2d2d;
    border-radius: 3px;
    padding: 2px 4px;
    font-size: 9px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    white-space: nowrap;
    z-index: 10;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s ease;
  }
  
  .marker-item:hover {
    transform: translateX(-50%) translateY(-2px);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
  }
  
  .marker-timestamp {
    color: #e4e4e7;
    font-weight: 500;
  }
  
  .marker-number {
    opacity: 0.8;
    margin-right: 3px;
  }
  
  .marker-indicator {
    position: absolute;
    width: 2px;
    height: 100%;
    top: 0;
    transform: translateX(-50%);
  }
  
  .marker-delete {
    background: none;
    border: none;
    color: #ff6b6b;
    cursor: pointer;
    font-size: 11px;
    padding: 0 0 0 3px;
    margin-left: 3px;
    line-height: 1;
    opacity: 0.6;
  }
  
  .marker-delete:hover {
    opacity: 1;
  }

  .marker-button {
    background-color: #4b5eab; /* Blue-purple shade */
    color: white;
    border-color: transparent;
  }
  
  .marker-button:hover {
    background-color: #5b6ecb;
    box-shadow: 0 3px 8px rgba(75, 94, 171, 0.4);
  }
  
  .marker-button:active {
    background-color: #3b4e9b;
  }
  
  .marker-button:disabled {
    background-color: #1a1a1a;
    color: #666;
    border-color: #333;
  }
  
  .transient-controls {
    margin-top: 20px;
    padding: 15px;
    background-color: #18181b; /* zinc-900 */
    border-radius: 8px;
    border: 1px solid #3f3f46; /* zinc-700 */
  }
  
  .transient-controls h3 {
    margin-top: 0;
    margin-bottom: 15px;
    font-size: 14px;
    color: #e6e6e6;
  }
  
  .transient-sliders {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  
  @media (max-width: 992px) {
    .transient-sliders {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  @media (max-width: 576px) {
    .transient-sliders {
      grid-template-columns: 1fr;
    }
  }
  
  .slider-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  
  .slider-group label {
    font-size: 12px;
    color: #a1a1aa;
  }
  
  .slider-value {
    font-size: 11px;
    color: #a1a1aa;
    margin-left: 5px;
    opacity: 0.8;
  }
  
  .detect-button {
    background-color: #e9b83c; /* amber/yellow */
    color: #121212;
    border-color: transparent;
    margin-top: 15px;
  }
  
  .detect-button:hover {
    background-color: #f9d862;
    box-shadow: 0 3px 8px rgba(233, 184, 60, 0.4);
  }
  
  .detect-button:active {
    background-color: #d9a82c;
  }
  
  .detect-button:disabled {
    background-color: #1a1a1a;
    color: #666;
    border-color: #333;
  }
  
  .transient-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }
  
  .detection-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: #333;
    border: 1px solid #444;
    transition: all 0.1s ease;
    position: relative;
  }
  
  .detection-indicator.hit {
    background-color: #f5a623; /* Orange/yellow */
    box-shadow: 0 0 8px 2px rgba(245, 166, 35, 0.7);
    border-color: #f5a623;
  }
  
  .detection-indicator::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border-radius: 50%;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  .detection-indicator.hit::after {
    opacity: 1;
  }
</style>

<div class="audio-timeline">
  <!-- Project title editor (from AudioEditor) -->
  <div class="project-header">
    {#if isEditingTitle}
      <input
        type="text"
        class="title-input"
        bind:value={projectName}
        on:blur={handleTitleBlur}
        on:keydown={handleTitleKeydown}
      />
    {:else}
      <div 
        class="project-title" 
        on:click={toggleTitleEdit}
        on:keydown={(e) => e.key === 'Enter' && toggleTitleEdit()}
        tabindex="0"
        role="button"
        aria-label="Edit project title">
        {projectName}
      </div>
    {/if}
  </div>
  
  <div class="waveform-container" bind:this={container} id={id}></div>
  <div class="timeline-container" bind:this={timelineContainer} id={timelineId}></div>
  
  {#if !isLoaded && audioUrl}
    <div class="loading">Loading audio waveform...</div>
  {/if}
  
  <div class="controls">
    <div class="transport-controls">
      <button 
        class="button" 
        on:click={togglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {#if isPlaying}
          Stop
        {:else}
          Play
        {/if}
      </button>
    </div>
    
    <div class="time-info">
      {formatTime(currentTime)} / {formatTime(duration)}
    </div>
    
    <div class="slider-container">
      <span class="slider-label">Volume</span>
      <input
        type="range"
        class="slider slider-teal"
        min="0"
        max="1"
        step="0.05"
        bind:value={volume}
        on:input={() => setVolume(volume)}
      />
    </div>

    <div class="slider-container">
      <span class="slider-label">Zoom</span>
      <input
        type="range"
        class="slider slider-teal"
        min="1"
        max="20"
        step="0.5"
        bind:value={zoom}
        on:input={() => setZoom(zoom)}
      />
    </div>
  </div>
  
  <div class="region-controls">
    <button
      class="button"
      on:click={createRegion}
      disabled={!isLoaded}
    >
      Create Region
    </button>

    <button
      class="button"
      on:click={playRegion}
      disabled={!activeRegion}
    >
      Play Region
    </button>

    <button
      class="button"
      on:click={deleteRegion}
      disabled={!activeRegion}
    >
      Delete Region
    </button>

    <button
      class="button"
      on:click={exportRegion}
      disabled={!activeRegion}
    >
      Export Region
    </button>
    
    <button
      class="button marker-button"
      on:click={createMarker}
      disabled={!isLoaded}
    >
      Add Timestamp
    </button>
    
    <button
      class="button analyze-button"
      on:click={analyzeAudio}
      disabled={!isLoaded || isAnalyzing}
    >
      {#if isAnalyzing}
        <span class="loading"></span> Analyzing...
      {:else}
        Analyze Audio
      {/if}
    </button>
  </div>
  
  <!-- Transient Detection Controls -->
  <div class="transient-controls">
    <div class="transient-header">
      <h3>Transient Detection</h3>
      <div class="detection-indicator" class:hit={isTransientHit}></div>
    </div>
    
    <div class="transient-sliders">
      <div class="slider-group">
        <label for="density-slider">Density <span class="slider-value">{transientDensity}%</span></label>
        <input
          id="density-slider"
          type="range"
          class="slider slider-teal"
          min="1"
          max="100"
          bind:value={transientDensity}
        />
      </div>
      
      <div class="slider-group">
        <label for="randomness-slider">Randomness <span class="slider-value">{transientRandomness}%</span></label>
        <input
          id="randomness-slider"
          type="range"
          class="slider slider-teal"
          min="0"
          max="100"
          bind:value={transientRandomness}
        />
      </div>
      
      <div class="slider-group">
        <label for="sensitivity-slider">Sensitivity <span class="slider-value">{transientSensitivity}%</span></label>
        <input
          id="sensitivity-slider"
          type="range"
          class="slider slider-teal"
          min="1"
          max="100"
          bind:value={transientSensitivity}
        />
      </div>
      
      <div class="slider-group">
        <label for="spacing-slider">Min Spacing <span class="slider-value">{transientMinSpacing.toFixed(2)}s</span></label>
        <input
          id="spacing-slider"
          type="range"
          class="slider slider-teal"
          min="0"
          max="2"
          step="0.05"
          bind:value={transientMinSpacing}
        />
      </div>
    </div>
    
    <button
      class="button detect-button"
      on:click={detectTransients}
      disabled={!isLoaded || isDetectingTransients}
    >
      {#if isDetectingTransients}
        <span class="loading"></span> Detecting Transients...
      {:else}
        Detect Transients
      {/if}
    </button>
  </div>
  
  {#if songStructure.length > 0}
    <div class="song-structure">
      <h3>Song Structure</h3>
      
      {#if showStructureOverlay}
        <div class="structure-overlay">
          {#each songStructure as section}
            <div 
              class="structure-section" 
              style="left: {section.startPercent}%; width: {section.widthPercent}%; background-color: {section.color};"
              title="{section.name}: {formatTime(section.start)} - {formatTime(section.end)}"
            >
              <span class="section-label">{section.name}</span>
            </div>
          {/each}
          
          <!-- Render user-created markers -->
          {#each markers as marker}
            <div
              class="marker-indicator"
              style="left: {(marker.start / duration) * 100}%; background-color: {marker.color};"
            ></div>
            <div 
              class="marker-item"
              style="left: {(marker.start / duration) * 100}%; border-color: {marker.color};"
            >
              <span class="marker-number">{marker.data && marker.data.number ? marker.data.number.toFixed(1) : ''}</span>
              <span class="marker-timestamp">{marker.data && marker.data.timestamp ? marker.data.timestamp : formatTime(marker.start)}</span>
              <button 
                class="marker-delete" 
                aria-label="Delete marker"
                on:click={() => deleteMarker(marker.id)}
              >
                ×
              </button>
            </div>
          {/each}
          
          <!-- Render transient markers (just the indicator lines, not the labels to avoid clutter) -->
          {#each transientMarkers as marker}
            <div
              class="marker-indicator transient-indicator"
              style="left: {(marker.start / duration) * 100}%; background-color: {marker.color}; opacity: 0.6;"
              title="Transient at {marker.data && marker.data.timestamp ? marker.data.timestamp : formatTime(marker.start)}"
            ></div>
          {/each}
        </div>
      {/if}
      
      <div class="structure-sections">
        {#each songStructure as section}
          <div class="section-item">
            <button 
              class="section-button"
              style="background-color: {section.color};"
              on:click={() => jumpToSection(section.id)}
            >
              {section.name} ({formatTime(section.start)} - {formatTime(section.end)})
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
  
  <!-- File upload is handled by AudioFileManager component -->
</div>

<!-- Export Dialog -->
<ExportDialog 
  bind:show={showExportDialog}
  region={activeRegion}
  projectName={projectName}
  on:export={handleExport}
/>

<!-- Audio Visualizer (now without its own play button) -->
{#if isLoaded && audioUrl}
  <AudioVisualizer audioUrl={audioUrl} />
{/if}
