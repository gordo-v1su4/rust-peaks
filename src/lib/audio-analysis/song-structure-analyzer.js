/**
 * SongStructureAnalyzer - Analyzes song structure
 * 
 * This module combines transient detection and spectral analysis
 * to identify different sections of a song (intro, verse, chorus, etc.)
 */

import { TransientDetector } from './transient-detector.js';
import { SpectralAnalyzer } from './spectral-analyzer.js';

export class SongStructureAnalyzer {
  /**
   * Create a new SongStructureAnalyzer
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.transientDetector = new TransientDetector(options.transient);
    this.spectralAnalyzer = new SpectralAnalyzer(options.spectral);
    
    // Section colors with dark teal palette
    this.sectionColors = {
      intro: 'rgba(0, 104, 94, 0.4)',    // dark teal
      verse: 'rgba(0, 134, 124, 0.4)',   // medium teal
      pre: 'rgba(0, 154, 140, 0.4)',     // teal
      chorus: 'rgba(0, 184, 169, 0.4)',  // light teal
      bridge: 'rgba(0, 124, 114, 0.4)',  // dark teal
      outro: 'rgba(0, 104, 94, 0.4)'     // dark teal
    };
  }

  /**
   * Analyze the structure of a song
   * @param {AudioBuffer} audioBuffer - The audio buffer to analyze
   * @returns {Object} Analysis results including sections and transients
   */
  async analyzeStructure(audioBuffer) {
    if (!audioBuffer) {
      throw new Error('No audio data available');
    }

    const duration = audioBuffer.duration;
    
    // Step 1: Detect transients
    const transients = this.transientDetector.detectTransients(audioBuffer);
    
    // Step 2: Analyze transient density to help identify sections
    const transientDensity = this.transientDetector.analyzeTransientDensity(
      transients, 
      duration, 
      5 // 5-second segments
    );
    
    // Step 3: Perform spectral analysis
    const spectralData = this.spectralAnalyzer.analyzeSpectrum(audioBuffer);
    
    // Step 4: Find potential section boundaries
    const potentialBoundaries = this.spectralAnalyzer.findSectionBoundaries(spectralData);
    
    // Step 5: Combine all analyses to determine song structure
    const sections = this.determineSongStructure(
      duration, 
      transientDensity, 
      spectralData, 
      potentialBoundaries
    );
    
    return {
      duration,
      transients,
      transientDensity,
      spectralData,
      potentialBoundaries,
      sections
    };
  }

  /**
   * Determine song structure based on analysis data
   * @param {number} duration - Song duration in seconds
   * @param {Array<Object>} transientDensity - Transient density analysis
   * @param {Array<Object>} spectralData - Spectral analysis data
   * @param {Array<number>} potentialBoundaries - Potential section boundaries
   * @returns {Array<Object>} Song sections
   */
  determineSongStructure(duration, transientDensity, spectralData, potentialBoundaries) {
    // If we don't have enough data for a good analysis, fall back to time-based structure
    if (!potentialBoundaries.length || potentialBoundaries.length < 2) {
      return this.createTimeBasedStructure(duration);
    }
    
    console.log('Original potential boundaries:', potentialBoundaries);
    
    // Ensure we don't exceed the actual song duration
    potentialBoundaries = potentialBoundaries.filter(boundary => boundary <= duration);
    
    // Add important structural points based on typical song structure
    // Most songs have significant changes around these percentages of total duration
    const structuralPoints = [
      0,                  // Start
      duration * 0.1,     // Intro typically ends around 10%
      duration * 0.25,    // First verse typically ends around 25%
      duration * 0.4,     // First chorus typically ends around 40%
      duration * 0.6,     // Second verse typically ends around 60%
      duration * 0.75,    // Bridge or second chorus typically around 75%
      duration            // End
    ];
    
    // Combine structural points with detected boundaries
    let combinedBoundaries = [...potentialBoundaries, ...structuralPoints];
    
    // Sort and remove duplicates
    combinedBoundaries = [...new Set(combinedBoundaries)].sort((a, b) => a - b);
    
    console.log('Combined boundaries:', combinedBoundaries);
    
    // Filter boundaries to remove ones that are too close together
    const minSectionLength = Math.min(10, duration * 0.05); // Minimum section length in seconds (at least 5% of total duration)
    const filteredBoundaries = [0]; // Always start at 0
    
    for (let i = 1; i < combinedBoundaries.length; i++) {
      const boundary = combinedBoundaries[i];
      
      // Check if this boundary is far enough from the last one we added
      if (boundary - filteredBoundaries[filteredBoundaries.length - 1] >= minSectionLength) {
        filteredBoundaries.push(boundary);
      }
    }
    
    // Ensure the last boundary is exactly at the song duration
    if (filteredBoundaries[filteredBoundaries.length - 1] !== duration) {
      // If the last boundary is close to the duration, adjust it
      if (Math.abs(filteredBoundaries[filteredBoundaries.length - 1] - duration) < minSectionLength) {
        filteredBoundaries[filteredBoundaries.length - 1] = duration;
      } else {
        // Otherwise add the duration as the final boundary
        filteredBoundaries.push(duration);
      }
    }
    
    console.log('Filtered boundaries:', filteredBoundaries);
    
    // Now classify each section based on its characteristics
    const sections = [];
    
    for (let i = 0; i < filteredBoundaries.length - 1; i++) {
      const start = filteredBoundaries[i];
      const end = filteredBoundaries[i + 1];
      
      // Analyze this section's characteristics
      const sectionType = this.classifySection(
        start, 
        end, 
        i, 
        filteredBoundaries.length - 1,
        transientDensity, 
        spectralData
      );
      
      sections.push({
        id: `section-${sectionType}-${i}`,
        name: this.formatSectionName(sectionType, i),
        start,
        end,
        color: this.sectionColors[sectionType] || this.sectionColors.verse
      });
    }
    
    return sections;
  }

  /**
   * Classify a section based on its characteristics
   * @param {number} start - Section start time
   * @param {number} end - Section end time
   * @param {number} index - Section index
   * @param {number} totalSections - Total number of sections
   * @param {Array<Object>} transientDensity - Transient density analysis
   * @param {Array<Object>} spectralData - Spectral analysis data
   * @returns {string} Section type (intro, verse, chorus, etc.)
   */
  classifySection(start, end, index, totalSections, transientDensity, spectralData) {
    // Get relevant transient density segments for this section
    const relevantDensity = transientDensity.filter(
      segment => segment.start >= start && segment.end <= end
    );
    
    // Get relevant spectral data for this section
    const relevantSpectral = spectralData.filter(
      data => data.startTime >= start && data.endTime <= end
    );
    
    // Calculate average characteristics for this section
    const avgDensity = relevantDensity.reduce(
      (sum, segment) => sum + segment.density, 0
    ) / (relevantDensity.length || 1);
    
    const avgLowEnergy = relevantSpectral.reduce(
      (sum, data) => sum + data.lowEnergy, 0
    ) / (relevantSpectral.length || 1);
    
    const avgMidEnergy = relevantSpectral.reduce(
      (sum, data) => sum + data.midEnergy, 0
    ) / (relevantSpectral.length || 1);
    
    const avgHighEnergy = relevantSpectral.reduce(
      (sum, data) => sum + data.highEnergy, 0
    ) / (relevantSpectral.length || 1);
    
    const avgTotalEnergy = relevantSpectral.reduce(
      (sum, data) => sum + data.totalEnergy, 0
    ) / (relevantSpectral.length || 1);
    
    // Calculate section position as percentage of total duration
    const totalDuration = end - start;
    const sectionPosition = start / end;
    
    // Classification logic based on position and characteristics
    
    // Intro is typically the first section
    if (index === 0) {
      return 'intro';
    }
    
    // Outro is typically the last section
    if (index === totalSections - 1) {
      return 'outro';
    }
    
    // Typical song structure patterns
    const normalizedPosition = index / (totalSections - 1);
    
    // Chorus positions in typical songs (after intro, after verse, after bridge)
    if ((normalizedPosition > 0.2 && normalizedPosition < 0.3) ||
        (normalizedPosition > 0.5 && normalizedPosition < 0.6) ||
        (normalizedPosition > 0.8 && normalizedPosition < 0.9)) {
      
      // Chorus typically has higher energy, especially in mid and high frequencies
      if (avgTotalEnergy > 0.4 || avgMidEnergy > 0.3 || avgHighEnergy > 0.2) {
        return 'chorus';
      }
    }
    
    // Bridge often in the latter half of the song
    if (normalizedPosition > 0.6 && normalizedPosition < 0.8) {
      return 'bridge';
    }
    
    // Pre-chorus often comes before chorus
    if ((index + 1 < totalSections) &&
        ((normalizedPosition > 0.15 && normalizedPosition < 0.25) ||
         (normalizedPosition > 0.45 && normalizedPosition < 0.55))) {
      return 'pre';
    }
    
    // Default to verse
    return 'verse';
  }

  /**
   * Format a section name based on type and index
   * @param {string} type - Section type
   * @param {number} index - Section index
   * @returns {string} Formatted section name
   */
  formatSectionName(type, index) {
    // Track counts of each section type
    if (!this._sectionCounts) {
      this._sectionCounts = {
        intro: 0,
        verse: 0,
        pre: 0,
        chorus: 0,
        bridge: 0,
        outro: 0
      };
    }
    
    // Increment count for this type
    this._sectionCounts[type]++;
    
    // Special cases that don't need numbers
    if (type === 'intro' || type === 'outro' || type === 'bridge') {
      return type.charAt(0).toUpperCase() + type.slice(1);
    }
    
    // Add number to other section types
    return `${type.charAt(0).toUpperCase() + type.slice(1)} ${this._sectionCounts[type]}`;
  }

  /**
   * Create a time-based song structure when analysis is insufficient
   * @param {number} duration - Song duration in seconds
   * @returns {Array<Object>} Song sections
   */
  createTimeBasedStructure(duration) {
    const sections = [];
    let currentTime = 0;
    
    // Calculate section lengths based on total duration
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
    
    // Intro
    sections.push({
      id: 'section-intro',
      name: 'Intro',
      start: currentTime,
      end: introLength,
      color: this.sectionColors.intro
    });
    currentTime += introLength;
    
    // First verse
    sections.push({
      id: 'section-verse1',
      name: 'Verse 1',
      start: currentTime,
      end: currentTime + verseLength,
      color: this.sectionColors.verse
    });
    currentTime += verseLength;
    
    // Pre-chorus if we have one
    if (preChorusLength > 0) {
      sections.push({
        id: 'section-pre1',
        name: 'Pre-Chorus',
        start: currentTime,
        end: currentTime + preChorusLength,
        color: this.sectionColors.pre
      });
      currentTime += preChorusLength;
    }
    
    // First chorus
    sections.push({
      id: 'section-chorus1',
      name: 'Chorus 1',
      start: currentTime,
      end: currentTime + chorusLength,
      color: this.sectionColors.chorus
    });
    currentTime += chorusLength;
    
    // Second verse if we have enough time
    if (duration > 90) {
      sections.push({
        id: 'section-verse2',
        name: 'Verse 2',
        start: currentTime,
        end: currentTime + verseLength,
        color: this.sectionColors.verse
      });
      currentTime += verseLength;
      
      // Pre-chorus if we have one
      if (preChorusLength > 0) {
        sections.push({
          id: 'section-pre2',
          name: 'Pre-Chorus',
          start: currentTime,
          end: currentTime + preChorusLength,
          color: this.sectionColors.pre
        });
        currentTime += preChorusLength;
      }
      
      // Second chorus
      sections.push({
        id: 'section-chorus2',
        name: 'Chorus 2',
        start: currentTime,
        end: currentTime + chorusLength,
        color: this.sectionColors.chorus
      });
      currentTime += chorusLength;
    }
    
    // Bridge if we have enough time
    if (bridgeLength > 0) {
      sections.push({
        id: 'section-bridge',
        name: 'Bridge',
        start: currentTime,
        end: currentTime + bridgeLength,
        color: this.sectionColors.bridge
      });
      currentTime += bridgeLength;
      
      // Final chorus after bridge
      sections.push({
        id: 'section-chorus3',
        name: 'Chorus 3',
        start: currentTime,
        end: currentTime + chorusLength,
        color: this.sectionColors.chorus
      });
      currentTime += chorusLength;
    }
    
    // Outro
    if (currentTime < duration) {
      sections.push({
        id: 'section-outro',
        name: 'Outro',
        start: currentTime,
        end: duration,
        color: this.sectionColors.outro
      });
    }
    
    return sections;
  }
}