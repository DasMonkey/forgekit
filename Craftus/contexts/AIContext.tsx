import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CraftCategory, DissectionResponse } from '../types';
import { generateCraftImage, dissectCraft, generateStepImage } from '../services/geminiService';

// State Interface
interface AIContextState {
  currentProject: Project | null;
  isGenerating: boolean;
  error: string | null;
}

// Project Interface
interface Project {
  id: string;
  name: string;
  category: CraftCategory;
  prompt: string;
  masterImageUrl: string;
  dissection: DissectionResponse | null;
  stepImages: Map<number, string>;
  createdAt: Date;
  lastModified: Date;
}

// Action Types
type AIAction =
  | { type: 'START_GENERATION' }
  | { type: 'GENERATION_SUCCESS'; payload: { project: Project } }
  | { type: 'GENERATION_ERROR'; payload: { error: string } }
  | { type: 'START_DISSECTION' }
  | { type: 'DISSECTION_SUCCESS'; payload: { dissection: DissectionResponse } }
  | { type: 'DISSECTION_ERROR'; payload: { error: string } }
  | { type: 'UPDATE_STEP_IMAGE'; payload: { stepNumber: number; imageUrl: string } }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_PROJECT' };

// Context Interface
interface AIContextValue {
  state: AIContextState;
  summonCraft: (prompt: string, category: CraftCategory) => Promise<void>;
  dissectCraft: (projectId: string) => Promise<void>;
  generateStepImages: (projectId: string) => Promise<void>;
  clearError: () => void;
  clearProject: () => void;
}

// Initial State
const initialState: AIContextState = {
  currentProject: null,
  isGenerating: false,
  error: null,
};

// Reducer
const aiReducer = (state: AIContextState, action: AIAction): AIContextState => {
  switch (action.type) {
    case 'START_GENERATION':
      return { ...state, isGenerating: true, error: null };
    
    case 'GENERATION_SUCCESS':
      return {
        ...state,
        isGenerating: false,
        currentProject: action.payload.project,
        error: null,
      };
    
    case 'GENERATION_ERROR':
      return {
        ...state,
        isGenerating: false,
        error: action.payload.error,
      };
    
    case 'START_DISSECTION':
      return { ...state, isGenerating: true, error: null };
    
    case 'DISSECTION_SUCCESS':
      return {
        ...state,
        isGenerating: false,
        currentProject: state.currentProject
          ? { ...state.currentProject, dissection: action.payload.dissection }
          : null,
        error: null,
      };
    
    case 'DISSECTION_ERROR':
      return {
        ...state,
        isGenerating: false,
        error: action.payload.error,
      };
    
    case 'UPDATE_STEP_IMAGE':
      if (!state.currentProject) return state;
      const updatedStepImages = new Map(state.currentProject.stepImages);
      updatedStepImages.set(action.payload.stepNumber, action.payload.imageUrl);
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          stepImages: updatedStepImages,
          lastModified: new Date(),
        },
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'CLEAR_PROJECT':
      return { ...state, currentProject: null };
    
    default:
      return state;
  }
};

// Create Context
const AIContext = createContext<AIContextValue | undefined>(undefined);

// Provider Component
interface AIProviderProps {
  children: ReactNode;
}

export const AIProvider: React.FC<AIProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(aiReducer, initialState);

  const summonCraft = async (prompt: string, category: CraftCategory) => {
    dispatch({ type: 'START_GENERATION' });
    
    try {
      const masterImageUrl = await generateCraftImage(prompt, category);
      
      const project: Project = {
        id: `project-${Date.now()}`,
        name: prompt.substring(0, 50), // Use first 50 chars of prompt as name
        category,
        prompt,
        masterImageUrl,
        dissection: null,
        stepImages: new Map(),
        createdAt: new Date(),
        lastModified: new Date(),
      };
      
      dispatch({ type: 'GENERATION_SUCCESS', payload: { project } });
    } catch (error: any) {
      dispatch({ 
        type: 'GENERATION_ERROR', 
        payload: { error: error.message || 'Failed to generate craft image' } 
      });
      throw error;
    }
  };

  const dissectCraftAction = async (projectId: string) => {
    if (!state.currentProject || state.currentProject.id !== projectId) {
      throw new Error('Project not found');
    }

    dispatch({ type: 'START_DISSECTION' });
    
    try {
      const dissection = await dissectCraft(
        state.currentProject.masterImageUrl,
        state.currentProject.prompt
      );
      
      dispatch({ type: 'DISSECTION_SUCCESS', payload: { dissection } });
    } catch (error: any) {
      dispatch({ 
        type: 'DISSECTION_ERROR', 
        payload: { error: error.message || 'Failed to dissect craft' } 
      });
      throw error;
    }
  };

  const generateStepImagesAction = async (projectId: string) => {
    if (!state.currentProject || state.currentProject.id !== projectId) {
      throw new Error('Project not found');
    }

    if (!state.currentProject.dissection) {
      throw new Error('Project must be dissected first');
    }

    const { dissection, masterImageUrl, category } = state.currentProject;
    
    // Generate step images sequentially
    for (const step of dissection.steps) {
      try {
        const stepImageUrl = await generateStepImage(
          masterImageUrl,
          step.description,
          category
        );
        
        dispatch({
          type: 'UPDATE_STEP_IMAGE',
          payload: { stepNumber: step.stepNumber, imageUrl: stepImageUrl },
        });
      } catch (error) {
        console.error(`Failed to generate image for step ${step.stepNumber}:`, error);
        // Continue with next step even if one fails
      }
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const clearProject = () => {
    dispatch({ type: 'CLEAR_PROJECT' });
  };

  const value: AIContextValue = {
    state,
    summonCraft,
    dissectCraft: dissectCraftAction,
    generateStepImages: generateStepImagesAction,
    clearError,
    clearProject,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};

// Custom Hook
export const useAI = (): AIContextValue => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

// Export Project type for use in other files
export type { Project };
