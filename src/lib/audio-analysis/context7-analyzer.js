/**
 * Context7Analyzer - Audio analysis using Context7 MCP server
 * 
 * This class provides integration with the Context7 MCP server to enhance
 * audio analysis capabilities with library documentation and code examples.
 */

class Context7Analyzer {
  /**
   * Create a new Context7Analyzer
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      cacheResults: options.cacheResults !== undefined ? options.cacheResults : true,
      maxCacheAge: options.maxCacheAge || 3600000, // 1 hour in milliseconds
      ...options
    };
    
    // State
    this.isInitialized = false;
    
    // Cache for library documentation
    this.docsCache = new Map();
    
    // Track pending requests to avoid duplicates
    this.pendingRequests = new Map();
  }
  
  /**
   * Initialize the analyzer
   * @private
   */
  async _initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('Initializing Context7Analyzer...');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Context7Analyzer:', error);
      throw new Error('Failed to initialize Context7Analyzer');
    }
  }
  
  /**
   * Get library documentation for audio processing
   * @param {string} libraryName - Name of the library to get documentation for
   * @returns {Promise<Object>} - Documentation for the library
   */
  async getLibraryDocs(libraryName, topic = '', forceRefresh = false) {
    await this._initialize();
    
    try {
      console.log(`Getting documentation for ${libraryName}${topic ? ` on topic: ${topic}` : ''}...`);
      
      // Check cache first if not forcing refresh
      const cacheKey = `${libraryName}:${topic}`;
      if (!forceRefresh && this.options.cacheResults && this.docsCache.has(cacheKey)) {
        const cachedResult = this.docsCache.get(cacheKey);
        const cacheAge = Date.now() - cachedResult.timestamp;
        
        if (cacheAge < this.options.maxCacheAge) {
          console.log(`Using cached documentation for ${libraryName}`);
          return cachedResult.data;
        }
      }
      
      // Check if there's already a pending request for this library
      if (this.pendingRequests.has(cacheKey)) {
        console.log(`Waiting for pending request for ${libraryName}...`);
        return await this.pendingRequests.get(cacheKey);
      }
      
      // Create a promise for this request
      const requestPromise = (async () => {
        // First resolve the library ID
        const libraryIdResult = await this._resolveLibraryId(libraryName);
        
        if (!libraryIdResult || !libraryIdResult.libraryId) {
          throw new Error(`Could not resolve library ID for ${libraryName}`);
        }
        
        // Then get the documentation
        const docs = await this._getLibraryDocs(libraryIdResult.libraryId, topic);
        
        const result = {
          libraryName,
          libraryId: libraryIdResult.libraryId,
          topic,
          docs
        };
        
        // Cache the result
        if (this.options.cacheResults) {
          this.docsCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
        }
        
        return result;
      })();
      
      // Store the promise so other calls can wait for it
      this.pendingRequests.set(cacheKey, requestPromise);
      
      // Wait for the request to complete
      const result = await requestPromise;
      
      // Remove from pending requests
      this.pendingRequests.delete(cacheKey);
      
      return result;
    } catch (error) {
      console.error(`Error getting documentation for ${libraryName}:`, error);
      
      // Remove from pending requests on error
      this.pendingRequests.delete(`${libraryName}:${topic}`);
      
      throw new Error(`Failed to get documentation for ${libraryName}: ${error.message}`);
    }
  }
  
  /**
   * Resolve a library name to a Context7-compatible library ID
   * @private
   * @param {string} libraryName - Name of the library
   * @returns {Promise<Object>} - Result with library ID
   */
  async _resolveLibraryId(libraryName) {
    try {
      // Use the Context7 MCP server to resolve the library ID
      const result = await window.mcp.use_mcp_tool({
        server_name: 'Context7',
        tool_name: 'resolve-library-id',
        arguments: {
          libraryName
        }
      });
      
      return result;
    } catch (error) {
      console.error(`Error resolving library ID for ${libraryName}:`, error);
      throw error;
    }
  }
  
  /**
   * Get library documentation
   * @private
   * @param {string} libraryId - Context7-compatible library ID
   * @param {string} topic - Optional topic to focus on
   * @returns {Promise<Object>} - Documentation
   */
  async _getLibraryDocs(libraryId, topic = '') {
    try {
      console.log(`Fetching docs for library ID: ${libraryId}${topic ? ` on topic: ${topic}` : ''}`);
      
      // Use the Context7 MCP server to get library documentation
      const result = await this._callMcpTool('Context7', 'get-library-docs', {
        context7CompatibleLibraryID: libraryId,
        topic: topic,
        tokens: 10000 // Increased token limit for more comprehensive documentation
      });
      
      return result;
    } catch (error) {
      console.error(`Error getting library docs for ${libraryId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to call MCP tools
   * @private
   * @param {string} serverName - MCP server name
   * @param {string} toolName - Tool name
   * @param {Object} args - Tool arguments
   * @returns {Promise<any>} - Tool result
   */
  async _callMcpTool(serverName, toolName, args) {
    if (!window.mcp) {
      throw new Error('MCP not available in window context');
    }
    
    return await window.mcp.use_mcp_tool({
      server_name: serverName,
      tool_name: toolName,
      arguments: args
    });
  }
  
  /**
   * Get documentation for audio analysis libraries
   * @returns {Promise<Object>} - Documentation for audio analysis libraries
   */
  async getAudioAnalysisLibraryDocs(forceRefresh = false) {
    await this._initialize();
    
    // Get documentation for popular audio analysis libraries
    const libraries = [
      { name: 'essentia.js', topics: ['algorithms', 'audio features', 'bpm detection', 'key detection'] },
      { name: 'tone.js', topics: ['audio processing', 'effects'] },
      { name: 'web audio api', topics: ['audioworklet', 'audio processing'] },
      { name: 'soundtouchjs', topics: ['pitch shifting', 'time stretching'] }
    ];
    
    const results = {};
    const promises = [];
    
    for (const library of libraries) {
      // Get general documentation
      promises.push(
        this.getLibraryDocs(library.name, '', forceRefresh)
          .then(docs => {
            results[library.name] = { general: docs };
          })
          .catch(error => {
            console.error(`Error getting docs for ${library.name}:`, error);
            results[library.name] = { general: { error: error.message } };
          })
      );
      
      // Get topic-specific documentation
      for (const topic of library.topics) {
        promises.push(
          this.getLibraryDocs(library.name, topic, forceRefresh)
            .then(docs => {
              if (!results[library.name]) {
                results[library.name] = {};
              }
              results[library.name][topic] = docs;
            })
            .catch(error => {
              console.error(`Error getting docs for ${library.name} on topic ${topic}:`, error);
              if (!results[library.name]) {
                results[library.name] = {};
              }
              results[library.name][topic] = { error: error.message };
            })
        );
      }
    }
    
    // Wait for all requests to complete
    await Promise.allSettled(promises);
    
    return results;
  }
  
  /**
   * Get code examples for audio analysis
   * @param {string} task - Task to get code examples for
   * @returns {Promise<Object>} - Code examples
   */
  async getCodeExamples(task, libraryName = null) {
    await this._initialize();
    
    try {
      console.log(`Getting code examples for ${task}${libraryName ? ` using ${libraryName}` : ''}...`);
      
      // Get library docs with a focus on the task
      let docs;
      if (libraryName) {
        docs = await this.getLibraryDocs(libraryName, task);
      } else {
        // If no library specified, try to find the best library for the task
        const taskToLibraryMap = {
          'bpm detection': 'essentia.js',
          'key detection': 'essentia.js',
          'pitch shifting': 'soundtouchjs',
          'time stretching': 'soundtouchjs',
          'audio effects': 'tone.js',
          'audio visualization': 'web audio api'
        };
        
        const bestLibrary = taskToLibraryMap[task.toLowerCase()] || 'web audio api';
        docs = await this.getLibraryDocs(bestLibrary, task);
      }
      
      // Extract code examples from the documentation
      const examples = this._extractCodeExamples(docs, task);
      
      return {
        task,
        libraryName: libraryName || docs.libraryName,
        examples
      };
    } catch (error) {
      console.error(`Error getting code examples for ${task}:`, error);
      throw new Error(`Failed to get code examples for ${task}: ${error.message}`);
    }
  }
  
  /**
   * Extract code examples from documentation
   * @private
   * @param {Object} docs - Documentation object
   * @param {string} task - Task to find examples for
   * @returns {Array<Object>} - Array of code examples
   */
  _extractCodeExamples(docs, task) {
    // This is a simplified implementation
    // In a real implementation, you would parse the documentation to find code examples
    
    if (!docs || !docs.docs || !docs.docs.content) {
      return [];
    }
    
    const content = docs.docs.content;
    const examples = [];
    
    // Look for code blocks in the content
    const codeBlockRegex = /```(?:javascript|js|typescript|ts)?\s*([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const code = match[1].trim();
      
      // Only include examples that seem relevant to the task
      const taskWords = task.toLowerCase().split(/\s+/);
      const isRelevant = taskWords.some(word =>
        code.toLowerCase().includes(word) ||
        content.substring(Math.max(0, match.index - 200), match.index).toLowerCase().includes(word)
      );
      
      if (isRelevant) {
        examples.push({
          title: this._generateExampleTitle(code, task),
          code
        });
      }
    }
    
    return examples;
  }
  
  /**
   * Generate a title for a code example
   * @private
   * @param {string} code - Code example
   * @param {string} task - Task the example is for
   * @returns {string} - Generated title
   */
  _generateExampleTitle(code, task) {
    // Look for comments at the beginning of the code
    const commentMatch = code.match(/^\/\/\s*(.*?)$/m) || code.match(/^\/\*\s*(.*?)\s*\*\//);
    
    if (commentMatch) {
      return commentMatch[1].trim();
    }
    
    // Look for function declarations
    const functionMatch = code.match(/function\s+([a-zA-Z0-9_]+)/);
    
    if (functionMatch) {
      return `${task} using ${functionMatch[1]}()`;
    }
    
    // Default title
    return `${task} Example`;
  }
}

export default Context7Analyzer;