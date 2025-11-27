/**
 * LocalStorage utility functions for Craftus
 * Handles storage operations with error handling and compression support
 */

const STORAGE_PREFIX = 'craftus_';
const COMPRESSION_THRESHOLD = 10000; // Compress items larger than 10KB

/**
 * Simple LZ-based compression for strings
 * Uses a basic run-length encoding approach
 */
const compress = (str: string): string => {
  if (str.length < COMPRESSION_THRESHOLD) return str;
  
  try {
    // Use btoa for base64 encoding as a simple compression
    // In production, consider using a library like lz-string
    return btoa(encodeURIComponent(str));
  } catch {
    return str;
  }
};

/**
 * Decompress a compressed string
 */
const decompress = (str: string): string => {
  try {
    // Try to decompress - if it fails, return original
    return decodeURIComponent(atob(str));
  } catch {
    return str;
  }
};

/**
 * Get item from LocalStorage with error handling and decompression
 */
export const getStorageItem = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!item) return null;
    
    // Check if item is compressed (starts with compression marker)
    const isCompressed = item.startsWith('__COMPRESSED__');
    const dataStr = isCompressed ? decompress(item.substring(14)) : item;
    
    return JSON.parse(dataStr) as T;
  } catch (error) {
    console.error(`Failed to get storage item "${key}":`, error);
    return null;
  }
};

/**
 * Set item in LocalStorage with error handling and compression
 */
export const setStorageItem = <T>(key: string, value: T): boolean => {
  try {
    const jsonStr = JSON.stringify(value);
    
    // Compress if data is large
    let dataToStore = jsonStr;
    if (jsonStr.length > COMPRESSION_THRESHOLD) {
      const compressed = compress(jsonStr);
      // Only use compression if it actually reduces size
      if (compressed.length < jsonStr.length) {
        dataToStore = '__COMPRESSED__' + compressed;
      }
    }
    
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, dataToStore);
    return true;
  } catch (error) {
    console.error(`Failed to set storage item "${key}":`, error);
    
    // Check if quota exceeded
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('LocalStorage quota exceeded. Consider clearing old projects.');
    }
    
    return false;
  }
};

/**
 * Remove item from LocalStorage
 */
export const removeStorageItem = (key: string): boolean => {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    return true;
  } catch (error) {
    console.error(`Failed to remove storage item "${key}":`, error);
    return false;
  }
};

/**
 * Clear all Craftus items from LocalStorage
 */
export const clearStorage = (): boolean => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    console.error('Failed to clear storage:', error);
    return false;
  }
};

/**
 * Get storage usage information
 */
export const getStorageInfo = (): { used: number; available: number; percentage: number } => {
  try {
    let used = 0;
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          used += item.length + key.length;
        }
      }
    });
    
    // Most browsers have 5-10MB limit, we'll assume 5MB
    const available = 5 * 1024 * 1024; // 5MB in bytes
    const percentage = (used / available) * 100;
    
    return {
      used,
      available,
      percentage: Math.min(percentage, 100),
    };
  } catch (error) {
    console.error('Failed to get storage info:', error);
    return { used: 0, available: 0, percentage: 0 };
  }
};

/**
 * Check if storage is available
 */
export const isStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * Serialize node data for storage
 * Handles all node types: MasterNode, InstructionNode, MaterialNode, ImageNode, ShapeNode, TextNode, DrawingNode
 *
 * This function ensures that all node data is properly formatted for JSON serialization
 * and includes validation to prevent storage of invalid data.
 * For MasterNode, callback functions are stripped (they will be re-attached when loaded).
 *
 * @param node - The node object to serialize
 * @returns Serialized node object safe for JSON storage
 */
export const serializeNodeData = (node: any): any => {
  // Clone the node to avoid mutating the original
  const serialized = { ...node };
  
  // Handle node-specific data serialization
  if (node.type === 'imageNode' && node.data) {
    // ImageNode: Ensure all required fields are present
    serialized.data = {
      imageUrl: node.data.imageUrl || '',
      fileName: node.data.fileName || 'uploaded-image',
      width: node.data.width || 200,
      height: node.data.height || 200,
    };
  } else if (node.type === 'shapeNode' && node.data) {
    // ShapeNode: Serialize shape properties
    serialized.data = {
      shapeType: node.data.shapeType || 'rectangle',
      fillColor: node.data.fillColor || '#ffffff',
      strokeColor: node.data.strokeColor || '#000000',
      strokeWidth: node.data.strokeWidth || 2,
      width: node.data.width || 150,
      height: node.data.height || 150,
      text: node.data.text || undefined,
    };
  } else if (node.type === 'textNode' && node.data) {
    // TextNode: Serialize text properties
    serialized.data = {
      content: node.data.content || '',
      fontSize: node.data.fontSize || 16,
      fontFamily: node.data.fontFamily || 'Inter, sans-serif',
      color: node.data.color || '#ffffff',
      alignment: node.data.alignment || 'left',
    };
  } else if (node.type === 'drawingNode' && node.data) {
    // DrawingNode: Serialize drawing paths
    serialized.data = {
      paths: Array.isArray(node.data.paths) ? node.data.paths.map((path: any) => ({
        points: Array.isArray(path.points) ? path.points.slice(0, 1000) : [], // Limit points
        tool: path.tool || 'pencil',
      })) : [],
      strokeColor: node.data.strokeColor || '#ffffff',
      strokeWidth: node.data.strokeWidth || 2,
    };
  } else if (node.type === 'masterNode' && node.data) {
    // MasterNode: Serialize only data fields, strip callback functions
    serialized.data = {
      label: node.data.label || '',
      imageUrl: node.data.imageUrl || '',
      category: node.data.category,
      isDissecting: false,
      isDissected: node.data.isDissected || false,
      isGeneratingImage: false,
      magicSelectEnabled: false,
      // Callbacks (onDissect, onDissectSelected, onSelect, onDeselect) are stripped
      // They will be re-attached when the project is loaded
    };
  } else if (node.type === 'instructionNode' && node.data) {
    // InstructionNode: Serialize step data including generated images
    serialized.data = {
      stepNumber: node.data.stepNumber || 0,
      title: node.data.title || '',
      description: node.data.description || '',
      safetyWarning: node.data.safetyWarning || undefined,
      imageUrl: node.data.imageUrl || '',
      isGeneratingImage: false,
    };
  } else if (node.type === 'materialNode' && node.data) {
    // MaterialNode: Serialize materials list
    serialized.data = {
      items: Array.isArray(node.data.items) ? node.data.items : [],
    };
  }

  return serialized;
};

/**
 * Deserialize node data from storage
 * Handles all node types: MasterNode, InstructionNode, MaterialNode, ImageNode, ShapeNode, TextNode, DrawingNode
 *
 * This function validates and sanitizes stored node data to ensure it's safe to use.
 * It provides default values for missing fields and enforces limits on data sizes.
 * Backward compatibility: Old projects without new node types will continue to work.
 * Note: MasterNode callbacks must be re-attached by CanvasWorkspace after loading.
 *
 * @param node - The stored node object to deserialize
 * @returns Validated and sanitized node object
 */
export const deserializeNodeData = (node: any): any => {
  // Clone the node to avoid mutating the original
  const deserialized = { ...node };
  
  // Handle node-specific data deserialization and validation
  if (node.type === 'imageNode' && node.data) {
    // ImageNode: Validate and restore data
    deserialized.data = {
      imageUrl: String(node.data.imageUrl || ''),
      fileName: String(node.data.fileName || 'uploaded-image'),
      width: Number(node.data.width) || 200,
      height: Number(node.data.height) || 200,
    };
  } else if (node.type === 'shapeNode' && node.data) {
    // ShapeNode: Validate and restore data
    const validShapeTypes = ['rectangle', 'circle', 'triangle', 'star', 'rectangle-text', 'circle-text', 'speech-bubble', 'arrow-right', 'arrow-left'];
    deserialized.data = {
      shapeType: validShapeTypes.includes(node.data.shapeType) ? node.data.shapeType : 'rectangle',
      fillColor: String(node.data.fillColor || '#ffffff'),
      strokeColor: String(node.data.strokeColor || '#000000'),
      strokeWidth: Number(node.data.strokeWidth) || 2,
      width: Number(node.data.width) || 150,
      height: Number(node.data.height) || 150,
      text: node.data.text ? String(node.data.text).slice(0, 200) : undefined,
    };
  } else if (node.type === 'textNode' && node.data) {
    // TextNode: Validate and restore data
    const validAlignments = ['left', 'center', 'right'];
    deserialized.data = {
      content: String(node.data.content || '').slice(0, 5000),
      fontSize: Math.max(8, Math.min(Number(node.data.fontSize) || 16, 72)),
      fontFamily: String(node.data.fontFamily || 'Inter, sans-serif'),
      color: String(node.data.color || '#ffffff'),
      alignment: validAlignments.includes(node.data.alignment) ? node.data.alignment : 'left',
    };
  } else if (node.type === 'drawingNode' && node.data) {
    // DrawingNode: Validate and restore data
    const validTools = ['pencil', 'pen'];
    deserialized.data = {
      paths: Array.isArray(node.data.paths)
        ? node.data.paths.slice(0, 20).map((path: any) => ({
            points: Array.isArray(path.points)
              ? path.points.slice(0, 1000).map((p: any) => ({
                  x: Number(p.x) || 0,
                  y: Number(p.y) || 0,
                }))
              : [],
            tool: validTools.includes(path.tool) ? path.tool : 'pencil',
          }))
        : [],
      strokeColor: String(node.data.strokeColor || '#ffffff'),
      strokeWidth: Math.max(1, Math.min(Number(node.data.strokeWidth) || 2, 20)),
    };
  } else if (node.type === 'masterNode' && node.data) {
    // MasterNode: Validate and restore data (callbacks will be re-attached by CanvasWorkspace)
    deserialized.data = {
      label: String(node.data.label || ''),
      imageUrl: String(node.data.imageUrl || ''),
      category: node.data.category,
      isDissecting: false,
      isDissected: Boolean(node.data.isDissected),
      isGeneratingImage: false,
      magicSelectEnabled: false,
      // Callbacks will be re-attached when loaded in CanvasWorkspace
    };
  } else if (node.type === 'instructionNode' && node.data) {
    // InstructionNode: Validate and restore step data
    deserialized.data = {
      stepNumber: Number(node.data.stepNumber) || 0,
      title: String(node.data.title || ''),
      description: String(node.data.description || ''),
      safetyWarning: node.data.safetyWarning ? String(node.data.safetyWarning) : undefined,
      imageUrl: String(node.data.imageUrl || ''),
      isGeneratingImage: false,
    };
  } else if (node.type === 'materialNode' && node.data) {
    // MaterialNode: Validate and restore materials list
    deserialized.data = {
      items: Array.isArray(node.data.items)
        ? node.data.items.map((item: any) => String(item)).slice(0, 100)
        : [],
    };
  }

  return deserialized;
};

/**
 * Serialize canvas state for storage
 * Handles all node types including new ones (ImageNode, ShapeNode, TextNode, DrawingNode)
 * 
 * This function serializes the entire canvas state including nodes, edges, and viewport.
 * It applies node-specific serialization to ensure all data is properly formatted.
 * 
 * @param canvasState - The canvas state object containing nodes, edges, and viewport
 * @returns Serialized canvas state safe for JSON storage
 */
export const serializeCanvasState = (canvasState: any): any => {
  if (!canvasState) return null;
  
  return {
    nodes: Array.isArray(canvasState.nodes) 
      ? canvasState.nodes.map(serializeNodeData)
      : [],
    edges: Array.isArray(canvasState.edges) 
      ? canvasState.edges.slice(0, 100) 
      : [],
    viewport: canvasState.viewport || { x: 0, y: 0, zoom: 1 },
  };
};

/**
 * Deserialize canvas state from storage
 * Handles backward compatibility for projects without new node types
 * 
 * This function validates and restores canvas state from storage.
 * It ensures backward compatibility with old projects that don't have the new node types.
 * Limits are enforced on the number of nodes (50 max) and edges (100 max) for performance.
 * 
 * @param canvasState - The stored canvas state object
 * @returns Validated canvas state with nodes, edges, and viewport
 */
export const deserializeCanvasState = (canvasState: any): any => {
  if (!canvasState) {
    return {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
  }
  
  return {
    nodes: Array.isArray(canvasState.nodes) 
      ? canvasState.nodes.slice(0, 50).map(deserializeNodeData)
      : [],
    edges: Array.isArray(canvasState.edges) 
      ? canvasState.edges.slice(0, 100)
      : [],
    viewport: canvasState.viewport || { x: 0, y: 0, zoom: 1 },
  };
};
