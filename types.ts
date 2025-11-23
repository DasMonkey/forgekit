export enum CraftCategory {
  COSTUME = 'Costume & Cosplay',
  WOODWORKING = 'Woodworking',
  PAPER_CRAFT = 'Paper Craft',
  ELECTRONICS = 'Electronics & Robotics',
  TEXTILES = 'Sewing & Textiles',
  CLAY = 'Clay & Pottery',
  MISC = 'Miscellaneous'
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
  isDissecting: boolean;
  isDissected: boolean;
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