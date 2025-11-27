export enum CraftCategory {
  PAPERCRAFT = 'Papercraft',
  CLAY = 'Clay',
  COSTUME_PROPS = 'Costume & Props',
  WOODCRAFT = 'Woodcraft',
  JEWELRY = 'Jewelry',
  KIDS_CRAFTS = 'Kids Crafts',
  COLORING_BOOK = 'Coloring Book'
}

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