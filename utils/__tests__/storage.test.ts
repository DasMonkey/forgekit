import { describe, it, expect } from 'vitest';
import { 
  serializeNodeData, 
  deserializeNodeData, 
  serializeCanvasState, 
  deserializeCanvasState 
} from '../storage';

describe('Node Serialization', () => {
  it('should serialize and deserialize ImageNode', () => {
    const imageNode = {
      id: 'img-1',
      type: 'imageNode',
      position: { x: 100, y: 100 },
      data: {
        imageUrl: 'data:image/png;base64,abc123',
        fileName: 'test.png',
        width: 300,
        height: 200,
      },
    };

    const serialized = serializeNodeData(imageNode);
    const deserialized = deserializeNodeData(serialized);

    expect(deserialized.data.imageUrl).toBe('data:image/png;base64,abc123');
    expect(deserialized.data.fileName).toBe('test.png');
    expect(deserialized.data.width).toBe(300);
    expect(deserialized.data.height).toBe(200);
  });

  it('should serialize and deserialize ShapeNode', () => {
    const shapeNode = {
      id: 'shape-1',
      type: 'shapeNode',
      position: { x: 200, y: 200 },
      data: {
        shapeType: 'circle',
        fillColor: '#ff0000',
        strokeColor: '#000000',
        strokeWidth: 3,
        width: 150,
        height: 150,
        text: 'Hello',
      },
    };

    const serialized = serializeNodeData(shapeNode);
    const deserialized = deserializeNodeData(serialized);

    expect(deserialized.data.shapeType).toBe('circle');
    expect(deserialized.data.fillColor).toBe('#ff0000');
    expect(deserialized.data.strokeColor).toBe('#000000');
    expect(deserialized.data.strokeWidth).toBe(3);
    expect(deserialized.data.width).toBe(150);
    expect(deserialized.data.height).toBe(150);
    expect(deserialized.data.text).toBe('Hello');
  });

  it('should serialize and deserialize TextNode', () => {
    const textNode = {
      id: 'text-1',
      type: 'textNode',
      position: { x: 300, y: 300 },
      data: {
        content: 'Sample text',
        fontSize: 18,
        fontFamily: 'Arial',
        color: '#ffffff',
        alignment: 'center',
      },
    };

    const serialized = serializeNodeData(textNode);
    const deserialized = deserializeNodeData(serialized);

    expect(deserialized.data.content).toBe('Sample text');
    expect(deserialized.data.fontSize).toBe(18);
    expect(deserialized.data.fontFamily).toBe('Arial');
    expect(deserialized.data.color).toBe('#ffffff');
    expect(deserialized.data.alignment).toBe('center');
  });

  it('should serialize and deserialize DrawingNode', () => {
    const drawingNode = {
      id: 'draw-1',
      type: 'drawingNode',
      position: { x: 400, y: 400 },
      data: {
        paths: [
          {
            points: [
              { x: 0, y: 0 },
              { x: 10, y: 10 },
              { x: 20, y: 5 },
            ],
            tool: 'pencil',
          },
          {
            points: [
              { x: 30, y: 30 },
              { x: 40, y: 40 },
            ],
            tool: 'pen',
          },
        ],
        strokeColor: '#00ff00',
        strokeWidth: 2,
      },
    };

    const serialized = serializeNodeData(drawingNode);
    const deserialized = deserializeNodeData(serialized);

    expect(deserialized.data.paths).toHaveLength(2);
    expect(deserialized.data.paths[0].points).toHaveLength(3);
    expect(deserialized.data.paths[0].tool).toBe('pencil');
    expect(deserialized.data.paths[1].tool).toBe('pen');
    expect(deserialized.data.strokeColor).toBe('#00ff00');
    expect(deserialized.data.strokeWidth).toBe(2);
  });

  it('should handle invalid shape types with defaults', () => {
    const invalidShapeNode = {
      id: 'shape-2',
      type: 'shapeNode',
      position: { x: 0, y: 0 },
      data: {
        shapeType: 'invalid-shape',
        fillColor: '#ffffff',
        strokeColor: '#000000',
        strokeWidth: 2,
        width: 100,
        height: 100,
      },
    };

    const deserialized = deserializeNodeData(invalidShapeNode);
    expect(deserialized.data.shapeType).toBe('rectangle'); // Default fallback
  });

  it('should limit text content length', () => {
    const longText = 'a'.repeat(10000);
    const textNode = {
      id: 'text-2',
      type: 'textNode',
      position: { x: 0, y: 0 },
      data: {
        content: longText,
        fontSize: 16,
        fontFamily: 'Arial',
        color: '#ffffff',
        alignment: 'left',
      },
    };

    const deserialized = deserializeNodeData(textNode);
    expect(deserialized.data.content.length).toBeLessThanOrEqual(5000);
  });

  it('should limit drawing path points', () => {
    const manyPoints = Array.from({ length: 2000 }, (_, i) => ({ x: i, y: i }));
    const drawingNode = {
      id: 'draw-2',
      type: 'drawingNode',
      position: { x: 0, y: 0 },
      data: {
        paths: [
          {
            points: manyPoints,
            tool: 'pencil',
          },
        ],
        strokeColor: '#ffffff',
        strokeWidth: 2,
      },
    };

    const serialized = serializeNodeData(drawingNode);
    expect(serialized.data.paths[0].points.length).toBeLessThanOrEqual(1000);
  });

  it('should preserve existing node types', () => {
    const masterNode = {
      id: 'master-1',
      type: 'masterNode',
      position: { x: 0, y: 0 },
      data: {
        label: 'Test',
        imageUrl: 'http://example.com/image.png',
        category: 'Papercraft',
      },
    };

    const serialized = serializeNodeData(masterNode);
    const deserialized = deserializeNodeData(serialized);

    expect(deserialized.type).toBe('masterNode');
    expect(deserialized.data.label).toBe('Test');
  });
});

describe('Canvas State Serialization', () => {
  it('should serialize and deserialize complete canvas state', () => {
    const canvasState = {
      nodes: [
        {
          id: 'img-1',
          type: 'imageNode',
          position: { x: 100, y: 100 },
          data: {
            imageUrl: 'data:image/png;base64,abc',
            fileName: 'test.png',
            width: 200,
            height: 200,
          },
        },
        {
          id: 'shape-1',
          type: 'shapeNode',
          position: { x: 300, y: 300 },
          data: {
            shapeType: 'rectangle',
            fillColor: '#ffffff',
            strokeColor: '#000000',
            strokeWidth: 2,
            width: 150,
            height: 150,
          },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'img-1',
          target: 'shape-1',
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    const serialized = serializeCanvasState(canvasState);
    const deserialized = deserializeCanvasState(serialized);

    expect(deserialized.nodes).toHaveLength(2);
    expect(deserialized.edges).toHaveLength(1);
    expect(deserialized.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(deserialized.nodes[0].type).toBe('imageNode');
    expect(deserialized.nodes[1].type).toBe('shapeNode');
  });

  it('should handle null canvas state', () => {
    const deserialized = deserializeCanvasState(null);

    expect(deserialized.nodes).toEqual([]);
    expect(deserialized.edges).toEqual([]);
    expect(deserialized.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('should limit number of nodes and edges', () => {
    const manyNodes = Array.from({ length: 100 }, (_, i) => ({
      id: `node-${i}`,
      type: 'textNode',
      position: { x: i * 10, y: i * 10 },
      data: {
        content: `Node ${i}`,
        fontSize: 16,
        fontFamily: 'Arial',
        color: '#ffffff',
        alignment: 'left',
      },
    }));

    const manyEdges = Array.from({ length: 150 }, (_, i) => ({
      id: `edge-${i}`,
      source: `node-${i}`,
      target: `node-${i + 1}`,
    }));

    const canvasState = {
      nodes: manyNodes,
      edges: manyEdges,
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    const deserialized = deserializeCanvasState(canvasState);

    expect(deserialized.nodes.length).toBeLessThanOrEqual(50);
    expect(deserialized.edges.length).toBeLessThanOrEqual(100);
  });

  it('should handle backward compatibility with old projects', () => {
    // Old project without new node types
    const oldCanvasState = {
      nodes: [
        {
          id: 'master-1',
          type: 'masterNode',
          position: { x: 0, y: 0 },
          data: {
            label: 'Old Project',
            imageUrl: 'http://example.com/old.png',
          },
        },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    const deserialized = deserializeCanvasState(oldCanvasState);

    expect(deserialized.nodes).toHaveLength(1);
    expect(deserialized.nodes[0].type).toBe('masterNode');
    expect(deserialized.nodes[0].data.label).toBe('Old Project');
  });
});
