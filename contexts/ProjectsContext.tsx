import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Project } from './AIContext';
import { Node, Edge, Viewport } from '@xyflow/react';
import { validateProjectData } from '../utils/security';
import { CraftCategory } from '../types';
import { serializeCanvasState, deserializeCanvasState } from '../utils/storage';

// Canvas State Interface
interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
}

// Extended Project with Canvas State
interface ProjectWithCanvas extends Project {
  canvasState: CanvasState;
}

// State Interface
interface ProjectsContextState {
  projects: ProjectWithCanvas[];
  currentProjectId: string | null;
}

// Action Types
type ProjectsAction =
  | { type: 'SAVE_PROJECT'; payload: { project: ProjectWithCanvas } }
  | { type: 'LOAD_PROJECT'; payload: { projectId: string } }
  | { type: 'DELETE_PROJECT'; payload: { projectId: string } }
  | { type: 'DUPLICATE_PROJECT'; payload: { projectId: string } }
  | { type: 'UPDATE_PROJECT'; payload: { projectId: string; updates: Partial<ProjectWithCanvas> } }
  | { type: 'LOAD_FROM_STORAGE'; payload: { projects: ProjectWithCanvas[] } };

// Context Interface
interface ProjectsContextValue {
  state: ProjectsContextState;
  saveProject: (project: ProjectWithCanvas) => void;
  loadProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  duplicateProject: (projectId: string) => void;
  updateProject: (projectId: string, updates: Partial<ProjectWithCanvas>) => void;
  publishToCommunity: (projectId: string) => Promise<void>;
}

// Initial State
const initialState: ProjectsContextState = {
  projects: [],
  currentProjectId: null,
};

// LocalStorage Key
const STORAGE_KEY = 'craftus_projects';

// Helper: Load from LocalStorage with validation
const loadFromStorage = (): ProjectWithCanvas[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    // Limit storage size to prevent DoS (5MB max)
    if (stored.length > 5 * 1024 * 1024) {
      console.error('Storage data exceeds safe size limit');
      return [];
    }
    
    const parsed = JSON.parse(stored);
    
    // Validate it's an array
    if (!Array.isArray(parsed)) {
      console.error('Invalid storage format: expected array');
      return [];
    }
    
    // Validate and sanitize each project
    return parsed
      .filter((p: any) => {
        // Validate project structure
        if (!validateProjectData(p)) {
          console.warn('Invalid project data detected, skipping');
          return false;
        }
        return true;
      })
      .slice(0, 100) // Limit to 100 projects max
      .map((p: any) => {
        // Safely reconstruct with validated data
        const project: ProjectWithCanvas = {
          id: String(p.id).slice(0, 100),
          name: String(p.name).slice(0, 200),
          category: p.category as CraftCategory,
          prompt: String(p.prompt).slice(0, 1000),
          masterImageUrl: String(p.masterImageUrl || ''),
          dissection: p.dissection || null,
          stepImages: new Map(
            Object.entries(p.stepImages || {}).map(([key, value]) => [Number(key), String(value)])
          ),
          createdAt: new Date(p.createdAt),
          lastModified: new Date(p.lastModified),
          canvasState: deserializeCanvasState(p.canvasState)
        };
        return project;
      });
  } catch (error) {
    console.error('Failed to load projects from storage:', error);
    // Clear corrupted storage
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
};

// Helper: Save to LocalStorage with quota handling
const saveToStorage = (projects: ProjectWithCanvas[]) => {
  try {
    // Convert Map to object for JSON serialization and serialize canvas state
    const serializable = projects.map(p => ({
      ...p,
      stepImages: Object.fromEntries(p.stepImages),
      canvasState: serializeCanvasState(p.canvasState),
    }));

    const data = JSON.stringify(serializable);

    try {
      localStorage.setItem(STORAGE_KEY, data);
    } catch (quotaError) {
      // If quota exceeded, try to reduce data size
      if (quotaError instanceof DOMException && quotaError.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, attempting to reduce data...');

        // Strategy 1: Remove old projects (keep only most recent 10)
        const recentProjects = projects.slice(-10);
        const reducedData = JSON.stringify(recentProjects.map(p => ({
          ...p,
          stepImages: Object.fromEntries(p.stepImages),
          canvasState: serializeCanvasState(p.canvasState),
        })));

        try {
          localStorage.setItem(STORAGE_KEY, reducedData);
          console.log('Saved with reduced project count (10 most recent)');
          return;
        } catch {
          // Strategy 2: Keep only 5 most recent projects
          const minimalProjects = projects.slice(-5);
          const minimalData = JSON.stringify(minimalProjects.map(p => ({
            ...p,
            stepImages: Object.fromEntries(p.stepImages),
            canvasState: serializeCanvasState(p.canvasState),
          })));

          try {
            localStorage.setItem(STORAGE_KEY, minimalData);
            console.log('Saved with minimal project count (5 most recent)');
            return;
          } catch {
            // Final fallback: clear storage and save only current project
            console.error('LocalStorage quota severely exceeded. Clearing old data.');
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('craftus_api_usage');

            // Try to save just the most recent project
            if (projects.length > 0) {
              const lastProject = projects[projects.length - 1];
              const singleProject = JSON.stringify([{
                ...lastProject,
                stepImages: Object.fromEntries(lastProject.stepImages),
                canvasState: serializeCanvasState(lastProject.canvasState),
              }]);

              try {
                localStorage.setItem(STORAGE_KEY, singleProject);
                console.log('Saved only the most recent project');
              } catch {
                console.error('Cannot save even a single project. Storage may be full.');
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to save projects to storage:', error);
  }
};

// Reducer
const projectsReducer = (
  state: ProjectsContextState,
  action: ProjectsAction
): ProjectsContextState => {
  switch (action.type) {
    case 'SAVE_PROJECT': {
      const existingIndex = state.projects.findIndex(
        p => p.id === action.payload.project.id
      );
      
      let updatedProjects: ProjectWithCanvas[];
      if (existingIndex >= 0) {
        // Update existing project
        updatedProjects = [...state.projects];
        updatedProjects[existingIndex] = {
          ...action.payload.project,
          lastModified: new Date(),
        };
      } else {
        // Add new project
        updatedProjects = [...state.projects, action.payload.project];
      }
      
      saveToStorage(updatedProjects);
      return {
        ...state,
        projects: updatedProjects,
        currentProjectId: action.payload.project.id,
      };
    }
    
    case 'LOAD_PROJECT':
      return {
        ...state,
        currentProjectId: action.payload.projectId,
      };
    
    case 'DELETE_PROJECT': {
      const updatedProjects = state.projects.filter(
        p => p.id !== action.payload.projectId
      );
      saveToStorage(updatedProjects);
      return {
        ...state,
        projects: updatedProjects,
        currentProjectId:
          state.currentProjectId === action.payload.projectId
            ? null
            : state.currentProjectId,
      };
    }
    
    case 'DUPLICATE_PROJECT': {
      const original = state.projects.find(p => p.id === action.payload.projectId);
      if (!original) return state;
      
      const duplicate: ProjectWithCanvas = {
        ...original,
        id: `project-${Date.now()}`,
        name: `${original.name} (Copy)`,
        createdAt: new Date(),
        lastModified: new Date(),
      };
      
      const updatedProjects = [...state.projects, duplicate];
      saveToStorage(updatedProjects);
      return {
        ...state,
        projects: updatedProjects,
      };
    }
    
    case 'UPDATE_PROJECT': {
      const updatedProjects = state.projects.map(p =>
        p.id === action.payload.projectId
          ? { ...p, ...action.payload.updates, lastModified: new Date() }
          : p
      );
      saveToStorage(updatedProjects);
      return {
        ...state,
        projects: updatedProjects,
      };
    }
    
    case 'LOAD_FROM_STORAGE':
      return {
        ...state,
        projects: action.payload.projects,
      };
    
    default:
      return state;
  }
};

// Create Context
const ProjectsContext = createContext<ProjectsContextValue | undefined>(undefined);

// Provider Component
interface ProjectsProviderProps {
  children: ReactNode;
}

export const ProjectsProvider: React.FC<ProjectsProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(projectsReducer, initialState);

  // Load projects from LocalStorage on mount
  useEffect(() => {
    const projects = loadFromStorage();
    dispatch({ type: 'LOAD_FROM_STORAGE', payload: { projects } });
  }, []);

  const saveProject = (project: ProjectWithCanvas) => {
    dispatch({ type: 'SAVE_PROJECT', payload: { project } });
  };

  const loadProject = (projectId: string) => {
    dispatch({ type: 'LOAD_PROJECT', payload: { projectId } });
  };

  const deleteProject = (projectId: string) => {
    dispatch({ type: 'DELETE_PROJECT', payload: { projectId } });
  };

  const duplicateProject = (projectId: string) => {
    dispatch({ type: 'DUPLICATE_PROJECT', payload: { projectId } });
  };

  const updateProject = (projectId: string, updates: Partial<ProjectWithCanvas>) => {
    dispatch({ type: 'UPDATE_PROJECT', payload: { projectId, updates } });
  };

  const publishToCommunity = async (projectId: string) => {
    // TODO: Implement community publishing when backend is ready
    // For now, this is a placeholder
    console.log('Publishing project to community:', projectId);
    
    // In the future, this would:
    // 1. Upload master image to cloud storage
    // 2. Upload step images to cloud storage
    // 3. Save project metadata to database
    // 4. Return public project URL
    
    throw new Error('Community publishing not yet implemented');
  };

  const value: ProjectsContextValue = {
    state,
    saveProject,
    loadProject,
    deleteProject,
    duplicateProject,
    updateProject,
    publishToCommunity,
  };

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
};

// Custom Hook
export const useProjects = (): ProjectsContextValue => {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
};

// Export types
export type { ProjectWithCanvas, CanvasState };
