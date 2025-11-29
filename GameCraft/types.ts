// Game Asset Style Categories for GameCraft
export enum CraftCategory {
  PIXEL_ART = 'Pixel Art',
  HD_2D = 'HD 2D',
  AAA = 'AAA',
  LOW_POLY_3D = 'Low Poly 3D',
  VOXEL_ART = 'Voxel Art'
}

// Pixel art grid sizes
export type PixelGridSize = 16 | 32 | 64 | 128 | 320 | 640;

export const PIXEL_GRID_SIZES: { value: PixelGridSize; label: string }[] = [
  { value: 16, label: '16×16' },
  { value: 32, label: '32×32' },
  { value: 64, label: '64×64' },
  { value: 128, label: '128×128' },
  { value: 320, label: '320×320' },
  { value: 640, label: '640×640' },
];

export interface DissectionResponse {
  complexity: 'Simple' | 'Moderate' | 'Complex';
  complexityScore: number; // 1-10
  materials: string[];
  steps: {
    stepNumber: number;
    title: string;
    description: string;
    safetyWarning?: string;
  }[];
}

// Node Data Types for React Flow
export interface MasterNodeData {
  label: string;
  imageUrl: string;
  category: CraftCategory;
  pixelSize?: PixelGridSize;
  onDissect: (id: string, imageUrl: string) => void;
  onContextMenu?: (nodeId: string, element: HTMLElement) => void;
  onDissectSelected?: (id: string, selectedObjectImageUrl: string, fullImageUrl: string, label: string) => void;
  isDissecting: boolean;
  isDissected: boolean;
  isGeneratingImage?: boolean;
  onSelect?: (nodeId: string, element: HTMLElement, category?: CraftCategory) => void;
  onDeselect?: () => void;
  magicSelectEnabled?: boolean;
}

export interface InstructionNodeData {
  stepNumber: number;
  title: string;
  description: string;
  safetyWarning?: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
}

export interface MaterialNodeData {
  items: string[];
}

export interface ImageNodeData {
  imageUrl: string;
  fileName: string;
  width: number;
  height: number;
  isSelected?: boolean;
  isGeneratingImage?: boolean;
  isPixelSnapped?: boolean; // When true, uses nearest-neighbor rendering for crisp pixel art
  onSelect?: (nodeId: string, element: HTMLElement) => void;
  onDeselect?: () => void;
  onDelete?: (nodeId: string) => void;
}

export interface ShapeNodeData {
  shapeType: 'rectangle' | 'circle' | 'triangle' | 'star' | 'rectangle-text' | 'circle-text' | 'speech-bubble' | 'arrow-right' | 'arrow-left';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  width: number;
  height: number;
  text?: string;
}

export interface TextNodeData {
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  alignment: 'left' | 'center' | 'right';
}

export interface DrawingPath {
  points: { x: number; y: number }[];
  tool: 'pencil' | 'pen';
}

export interface DrawingNodeData {
  paths: DrawingPath[];
  strokeColor: string;
  strokeWidth: number;
}