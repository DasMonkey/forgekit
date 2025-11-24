import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  BackgroundVariant,
  useReactFlow,
} from '@xyflow/react';
import { Sparkles, Keyboard, Scissors } from 'lucide-react';
import { MasterNode, InstructionNode, MaterialNode, ImageNode, ShapeNode, TextNode, DrawingNode } from '../components/CustomNodes';
import { ChatInterface } from '../components/ChatInterface';
import { FloatingMenuBar } from '../components/FloatingMenuBar';
import { LeftToolbar, ToolType } from '../components/LeftToolbar';
import { ContextMenu, ContextMenuItem } from '../components/ContextMenu';
import { UploadSubmenu } from '../components/UploadSubmenu';
import { ShapesSubmenu, ShapeType } from '../components/ShapesSubmenu';
import { PencilSubmenu, PencilMode } from '../components/PencilSubmenu';
import { calculateNodeMenuPosition } from '../utils/contextMenuPosition';
import { handleFileUpload } from '../utils/fileUpload';
import { dissectCraft, dissectSelectedObject, generateStepImage, identifySelectedObject } from '../services/geminiService';
import { CraftCategory, DissectionResponse } from '../types';
import { useProjects } from '../contexts/ProjectsContext';
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts';
import { useToolKeyboardShortcuts } from '../utils/useToolKeyboardShortcuts';
import { useDrawingState } from '../utils/useDrawingState';
import { DrawingPath } from '../types';
import { getToolCursor } from '../utils/toolCursors';

// Maximum number of step images to generate
const MAX_STEP_IMAGES = 6;

// Type for instruction step
type InstructionStep = DissectionResponse['steps'][number];

/**
 * Groups instruction steps to ensure we never exceed MAX_STEP_IMAGES
 * When steps > 6, combines multiple steps into groups
 */
interface StepGroup {
  stepNumbers: number[];
  combinedTitle: string;
  combinedDescription: string;
  safetyWarnings: string[];
  originalSteps: InstructionStep[];
}

const groupStepsForImageGeneration = (steps: InstructionStep[]): StepGroup[] => {
  if (steps.length <= MAX_STEP_IMAGES) {
    // No grouping needed - return each step as its own group
    return steps.map(step => ({
      stepNumbers: [step.stepNumber],
      combinedTitle: step.title,
      combinedDescription: step.description,
      safetyWarnings: step.safetyWarning ? [step.safetyWarning] : [],
      originalSteps: [step],
    }));
  }

  // Need to group steps - calculate how many steps per group
  const stepsPerGroup = Math.ceil(steps.length / MAX_STEP_IMAGES);
  const groups: StepGroup[] = [];

  for (let i = 0; i < steps.length; i += stepsPerGroup) {
    const groupSteps = steps.slice(i, i + stepsPerGroup);
    const stepNumbers = groupSteps.map(s => s.stepNumber);

    // Combine titles and descriptions
    const combinedTitle = groupSteps.map(s => s.title).join(' + ');
    const combinedDescription = groupSteps
      .map((s, idx) => `Step ${s.stepNumber}: ${s.description}`)
      .join(' | ');

    const safetyWarnings = groupSteps
      .filter(s => s.safetyWarning)
      .map(s => s.safetyWarning!);

    groups.push({
      stepNumbers,
      combinedTitle,
      combinedDescription,
      safetyWarnings,
      originalSteps: groupSteps,
    });
  }

  return groups;
};

// Define custom node types outside component to prevent re-renders
const nodeTypes = {
  masterNode: MasterNode,
  instructionNode: InstructionNode,
  materialNode: MaterialNode,
  imageNode: ImageNode,
  shapeNode: ShapeNode,
  textNode: TextNode,
  drawingNode: DrawingNode,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

interface CanvasWorkspaceProps {
  projectId?: string;
  readOnly?: boolean;
}

const CanvasWorkspaceContent: React.FC<CanvasWorkspaceProps> = ({ projectId: propProjectId, readOnly = false }) => {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const projectId = propProjectId || urlProjectId;
  const { state: projectsState, saveProject, updateProject } = useProjects();
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Custom handler for node changes to sync dimensions for ShapeNodes
  const handleNodesChange = useCallback((changes: any[]) => {
    // Apply the changes first
    onNodesChange(changes);

    // Then sync dimensions for any resize changes
    changes.forEach((change: any) => {
      if (change.type === 'dimensions' && change.dimensions) {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === change.id && node.type === 'shapeNode') {
              return {
                ...node,
                data: {
                  ...node.data,
                  width: change.dimensions.width,
                  height: change.dimensions.height,
                },
              };
            }
            return node;
          })
        );
      }
    });
  }, [onNodesChange, setNodes]);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    nodeId: string | null;
  }>({
    visible: false,
    position: { x: 0, y: 0 },
    nodeId: null,
  });
  const [toolSubmenu, setToolSubmenu] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    tool: ToolType | null;
  }>({
    visible: false,
    position: { x: 0, y: 0 },
    tool: null,
  });
  const [textCreationMode, setTextCreationMode] = useState(false);
  const [pencilMode, setPencilMode] = useState<PencilMode>('pencil');
  const [drawingMode, setDrawingMode] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{
    fromNode: string;
    fromHandle: string | null;
    position: { x: number; y: number };
  } | null>(null);

  // Track the current drawing node ID and start position
  const [currentDrawingNodeId, setCurrentDrawingNodeId] = useState<string | null>(null);
  const [drawingStartPos, setDrawingStartPos] = useState<{ x: number; y: number } | null>(null);
  const updateFrameRef = useRef<number | null>(null);

  // Drawing state management
  const drawingState = useDrawingState({
    mode: pencilMode,
    strokeColor: '#10b981',
    strokeWidth: 2,
    onDrawingComplete: (paths: DrawingPath[]) => {
      // Don't auto-switch back to select - keep drawing mode active
      setCurrentDrawingNodeId(null);
      setDrawingStartPos(null);
    },
  });
  
  // Enable keyboard shortcuts for canvas navigation
  useKeyboardShortcuts(!readOnly);

  // Handle Escape key to cancel drawing
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawingMode && drawingState.isDrawing) {
        drawingState.cancelDrawing();
        setCurrentDrawingNodeId(null);
        setDrawingStartPos(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [drawingMode, drawingState]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (updateFrameRef.current !== null) {
        cancelAnimationFrame(updateFrameRef.current);
      }
    };
  }, []);

  // Enable keyboard shortcuts for tool switching
  useToolKeyboardShortcuts({
    enabled: !readOnly,
    onToolChange: (tool) => {
      // If switching away from pencil while drawing, cancel the drawing
      if (activeTool === 'pencil' && tool !== 'pencil' && drawingState.isDrawing) {
        drawingState.cancelDrawing();
        setCurrentDrawingNodeId(null);
        setDrawingStartPos(null);
      }
      setActiveTool(tool);
    },
  });

  // Get current project for displaying name in menu bar
  const currentProject = projectId 
    ? projectsState.projects.find(p => p.id === projectId)
    : null;

  // Handle tool-specific behaviors
  useEffect(() => {
    if (activeTool === 'select') {
      // Select tool is active - React Flow's default behavior handles everything
      // Users can drag nodes, select them, and create connections
      setTextCreationMode(false);
      setDrawingMode(false);
    } else if (activeTool === 'text') {
      // Text tool is active - enable text creation mode
      setTextCreationMode(true);
      setDrawingMode(false);
    } else if (activeTool === 'pencil') {
      // Pencil tool is active - enable drawing mode
      setTextCreationMode(false);
      setDrawingMode(true);
    } else {
      setTextCreationMode(false);
      setDrawingMode(false);
    }
  }, [activeTool]);

  // Load project from storage if projectId is provided
  useEffect(() => {
    if (projectId) {
      const project = projectsState.projects.find(p => p.id === projectId);
      if (project && project.canvasState) {
        // Add handlers to text nodes when loading
        const nodesWithHandlers = (project.canvasState.nodes || []).map(node => {
          if (node.type === 'textNode') {
            return {
              ...node,
              data: {
                ...node.data,
                onEdit: handleTextEdit,
                onFinishEdit: handleTextFinishEdit,
              },
            };
          }
          return node;
        });
        setNodes(nodesWithHandlers);
        setEdges(project.canvasState.edges || []);
      }
    }
  }, [projectId, projectsState.projects, setNodes, setEdges]);

  // Auto-save canvas state when nodes or edges change
  useEffect(() => {
    if (projectId && nodes.length > 0) {
      const project = projectsState.projects.find(p => p.id === projectId);
      if (project) {
        updateProject(projectId, {
          canvasState: {
            nodes,
            edges,
            viewport: { x: 0, y: 0, zoom: 1 }
          }
        });
      }
    }
  }, [nodes, edges, projectId, projectsState.projects, updateProject]);

  // Prevent body scrolling on canvas page
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return;
      const newEdge = {
        ...params,
        animated: true,
        style: { stroke: '#f97316', strokeWidth: 2 },
        type: 'smoothstep',
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, readOnly],
  );

  /**
   * Handle connection end - show shapes menu if not connected to a node
   */
  const onConnectEnd = useCallback(
    (event: any, connectionState: any) => {
      if (readOnly) return;

      // Only show menu if connection was not completed (no target node)
      if (!connectionState.toNode && connectionState.fromNode) {
        // Get mouse position
        const position = {
          x: event.clientX,
          y: event.clientY,
        };

        // Store pending connection info
        setPendingConnection({
          fromNode: connectionState.fromNode.id,
          fromHandle: connectionState.fromHandle?.id || null,
          position,
        });

        // Open shapes submenu at mouse position
        setToolSubmenu({
          visible: true,
          position,
          tool: 'shapes',
        });
      }
    },
    [readOnly],
  );

  /**
   * Handle context menu for master node
   */
  const handleNodeContextMenu = useCallback((nodeId: string, element: HTMLElement) => {
    const position = calculateNodeMenuPosition(element);
    setContextMenu({
      visible: true,
      position,
      nodeId,
    });
  }, []);

  /**
   * Close context menu
   */
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({
      visible: false,
      position: { x: 0, y: 0 },
      nodeId: null,
    });
  }, []);

  /**
   * Handle tool submenu open
   */
  const handleToolSubmenuOpen = useCallback((tool: ToolType, position: { x: number; y: number }) => {
    // If the same submenu is already open, close it instead of reopening
    if (toolSubmenu.visible && toolSubmenu.tool === tool) {
      setToolSubmenu({
        visible: false,
        position: { x: 0, y: 0 },
        tool: null,
      });
      return;
    }

    // Close any existing submenu first
    setToolSubmenu({
      visible: false,
      position: { x: 0, y: 0 },
      tool: null,
    });

    // Open new submenu after a brief delay to ensure clean state
    setTimeout(() => {
      setToolSubmenu({
        visible: true,
        position,
        tool,
      });
    }, 10);
  }, [toolSubmenu]);

  /**
   * Close tool submenu
   */
  const handleCloseToolSubmenu = useCallback(() => {
    setToolSubmenu({
      visible: false,
      position: { x: 0, y: 0 },
      tool: null,
    });
  }, []);

  /**
   * Handle upload image action
   */
  const handleUploadImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const { dataUrl, fileName } = await handleFileUpload(file);
        
        // Create image element to get dimensions
        const img = new Image();
        img.onload = () => {
          // Calculate dimensions (max 400px width/height)
          const maxSize = 400;
          let width = img.width;
          let height = img.height;
          
          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = width * ratio;
            height = height * ratio;
          }

          // Create new image node
          const id = `image-${Date.now()}`;
          const newNode: Node = {
            id,
            type: 'imageNode',
            position: { x: 0, y: 0 }, // Will be centered in viewport
            data: {
              imageUrl: dataUrl,
              fileName,
              width,
              height,
            },
          };

          setNodes((nds) => [...nds, newNode]);
          
          // Switch back to select tool after creating image
          setActiveTool('select');
        };
        
        img.src = dataUrl;
      } catch (error) {
        console.error('Upload error:', error);
        alert(error instanceof Error ? error.message : 'Failed to upload image');
      }
      
      // Close submenu after file selection
      handleCloseToolSubmenu();
    };

    input.click();
  }, [setNodes, setActiveTool]);

  /**
   * Handle shape selection
   */
  const handleSelectShape = useCallback((shapeType: ShapeType) => {
    const hasText = shapeType.includes('text') || shapeType === 'speech-bubble';
    const isArrow = shapeType.includes('arrow');

    // Default dimensions
    let width = 150;
    let height = 150;

    if (isArrow) {
      width = 200;
      height = 80;
    } else if (shapeType === 'speech-bubble') {
      width = 180;
      height = 120;
    }

    // Determine position - use pending connection position or default
    let position = { x: 0, y: 0 };
    if (pendingConnection) {
      // Position the shape near the mouse position where connection was released
      // Convert screen coordinates to canvas coordinates
      const canvasElement = document.querySelector('.react-flow');
      if (canvasElement) {
        const bounds = canvasElement.getBoundingClientRect();
        position = {
          x: pendingConnection.position.x - bounds.left - width / 2,
          y: pendingConnection.position.y - bounds.top - height / 2,
        };
      }
    }

    // Create new shape node
    const id = `shape-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'shapeNode',
      position,
      data: {
        shapeType,
        fillColor: '#e0e7ff',
        strokeColor: '#4f46e5',
        width,
        height,
        text: hasText ? 'Text' : undefined,
      },
    };

    setNodes((nds) => [...nds, newNode]);

    // If there's a pending connection, create the edge
    if (pendingConnection) {
      const newEdge: Edge = {
        id: `e-${pendingConnection.fromNode}-${id}`,
        source: pendingConnection.fromNode,
        sourceHandle: pendingConnection.fromHandle,
        target: id,
        targetHandle: 'top-target', // Default to top target handle
        animated: true,
        style: { stroke: '#f97316', strokeWidth: 2 },
        type: 'smoothstep',
      };
      setEdges((eds) => [...eds, newEdge]);

      // Clear pending connection
      setPendingConnection(null);
    }

    // Switch back to select tool after creating shape
    setActiveTool('select');
    handleCloseToolSubmenu();
  }, [setNodes, setActiveTool, pendingConnection, setEdges]);

  /**
   * Handle text node edit
   */
  const handleTextEdit = useCallback((nodeId: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId && node.type === 'textNode') {
          return {
            ...node,
            data: {
              ...node.data,
              isEditing: true,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  /**
   * Handle text node finish editing
   */
  const handleTextFinishEdit = useCallback((nodeId: string, newContent: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId && node.type === 'textNode') {
          return {
            ...node,
            data: {
              ...node.data,
              content: newContent,
              isEditing: false,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  /**
   * Handle pencil mode selection
   */
  const handleSelectPencilMode = useCallback((mode: PencilMode) => {
    setPencilMode(mode);
    setActiveTool('pencil');
    handleCloseToolSubmenu();
  }, []);

  /**
   * Handle canvas click for text creation and menu dismissal
   */
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    // Close tool submenu if clicking on canvas background
    if (toolSubmenu.visible) {
      handleCloseToolSubmenu();
    }

    // Handle text creation
    if (!textCreationMode || readOnly) return;

    // Convert screen coordinates to flow coordinates
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    // Create new text node
    const id = `text-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'textNode',
      position,
      data: {
        content: 'Text',
        fontSize: 16,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#e2e8f0',
        alignment: 'left',
        isEditing: false, // Start with editing disabled
        onEdit: handleTextEdit,
        onFinishEdit: handleTextFinishEdit,
      },
    };

    setNodes((nds) => [...nds, newNode]);

    // Enable editing after the node has been positioned
    setTimeout(() => {
      handleTextEdit(id);
    }, 50);

    // Switch back to select tool after creating text
    setActiveTool('select');
  }, [textCreationMode, readOnly, setNodes, setActiveTool, toolSubmenu.visible, handleCloseToolSubmenu, handleTextEdit, screenToFlowPosition]);

  /**
   * Handle pane mouse down for drawing
   */
  const handlePaneMouseDown = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    
    // Only handle if clicking on the pane (not on nodes or controls)
    if (!target.classList.contains('react-flow__pane')) {
      return;
    }

    // Close tool submenu if clicking on canvas
    if (toolSubmenu.visible) {
      handleCloseToolSubmenu();
    }

    // Handle drawing
    if (!drawingMode || readOnly) return;

    // Prevent default to avoid panning
    event.preventDefault();
    event.stopPropagation();

    // Convert screen coordinates to flow coordinates
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    // Create a new drawing node at the click position
    const id = `drawing-${Date.now()}`;
    
    // Start drawing with relative coordinates (0, 0)
    drawingState.startDrawing(0, 0);
    
    // Create node with empty paths initially
    const newNode: Node = {
      id,
      type: 'drawingNode',
      position: { x: position.x, y: position.y },
      data: {
        paths: [],
        strokeColor: '#10b981',
        strokeWidth: 2,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setCurrentDrawingNodeId(id);
    setDrawingStartPos(position);
    
    // Immediately update with the initial point
    setTimeout(() => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  paths: [
                    {
                      points: drawingState.currentPath,
                      tool: pencilMode,
                    },
                  ],
                },
              }
            : node
        )
      );
    }, 0);
  }, [drawingMode, readOnly, drawingState, toolSubmenu.visible, handleCloseToolSubmenu, screenToFlowPosition, setNodes]);

  /**
   * Handle mouse move for drawing
   */
  const handlePaneMouseMove = useCallback((event: React.MouseEvent) => {
    if (!drawingState.isDrawing || !drawingMode || !currentDrawingNodeId || !drawingStartPos) return;

    // Convert screen coordinates to flow coordinates
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    // Calculate relative position from the node's start position
    const relativeX = position.x - drawingStartPos.x;
    const relativeY = position.y - drawingStartPos.y;

    drawingState.addPoint(relativeX, relativeY);

    // Update immediately for the first few points, then throttle
    const shouldUpdateImmediately = drawingState.currentPath.length <= 2;

    if (shouldUpdateImmediately) {
      // Immediate update for initial points
      setNodes((nds) =>
        nds.map((node) =>
          node.id === currentDrawingNodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  paths: [
                    {
                      points: drawingState.currentPath,
                      tool: pencilMode,
                    },
                  ],
                },
              }
            : node
        )
      );
    } else if (updateFrameRef.current === null && drawingState.currentPath.length > 0) {
      // Throttle subsequent updates using requestAnimationFrame
      updateFrameRef.current = requestAnimationFrame(() => {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === currentDrawingNodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    paths: [
                      {
                        points: drawingState.currentPath,
                        tool: pencilMode,
                      },
                    ],
                  },
                }
              : node
          )
        );
        updateFrameRef.current = null;
      });
    }
  }, [drawingState, drawingMode, currentDrawingNodeId, drawingStartPos, screenToFlowPosition, setNodes, pencilMode]);

  /**
   * Handle mouse up for drawing
   */
  const handlePaneMouseUp = useCallback(() => {
    if (drawingState.isDrawing) {
      drawingState.finishDrawing();
    }
  }, [drawingState]);

  /**
   * Handle dissect action from context menu
   */
  const handleDissectFromMenu = useCallback(() => {
    if (contextMenu.nodeId) {
      const node = nodes.find(n => n.id === contextMenu.nodeId);
      if (node && node.data.imageUrl) {
        handleDissect(contextMenu.nodeId, node.data.imageUrl as string);
      }
    }
  }, [contextMenu.nodeId, nodes]);

  /**
   * Step 2a: Dissect a selected object from the image
   */
  const handleDissectSelected = async (
    nodeId: string,
    selectedObjectImageUrl: string,
    fullImageUrl: string,
    _label: string // Unused - AI identifies object automatically
  ) => {
    if (readOnly) return;

    // 1. Set loading state on the specific node
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, isDissecting: true } };
        }
        return node;
      })
    );

    try {
        // 2. First, let AI identify what object was selected
        console.log('\n🔍 === AI IDENTIFICATION PHASE ===');
        console.log('Selected Object Image (base64 length):', selectedObjectImageUrl.length);
        console.log('Full Image URL (base64 length):', fullImageUrl.length);
        console.log('Asking AI to identify the selected object...\n');

        const identifiedLabel = await identifySelectedObject(
          selectedObjectImageUrl,
          fullImageUrl
        );

        console.log('✅ AI Identified Object as:', identifiedLabel);
        console.log('=== IDENTIFICATION COMPLETE ===\n');

        // 3. Now call Gemini API to get TEXT instructions for the identified object
        console.log('🔍 === AI DISSECTION PHASE ===');
        console.log('Object to dissect:', identifiedLabel);
        console.log('Sending to AI for instructions...\n');

        const dissection = await dissectSelectedObject(
          selectedObjectImageUrl,
          fullImageUrl,
          identifiedLabel
        );

        console.log('\n📊 === AI OUTPUT DEBUG ===');
        console.log('Complexity:', dissection.complexity);
        console.log('Complexity Score:', dissection.complexityScore);
        console.log('Materials:', dissection.materials);
        console.log('Number of Steps Generated:', dissection.steps.length);
        console.log('\nGenerated Steps:');
        dissection.steps.forEach((step) => {
            console.log(`  Step ${step.stepNumber}: ${step.title}`);
            console.log(`    Description: ${step.description.substring(0, 100)}...`);
            if (step.safetyWarning) {
                console.log(`    ⚠️ Safety: ${step.safetyWarning}`);
            }
        });
        console.log('\n🔍 VERIFICATION CHECK:');
        console.log(`Does the AI output match "${identifiedLabel}"? Review the steps above to verify.`);
        console.log('=== AI OUTPUT DEBUG END ===\n');

        // 4. Calculate Positions for new nodes
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        // 4a. Materials Node (Left side)
        const matNodeId = `${nodeId}-mat`;
        newNodes.push({
            id: matNodeId,
            type: 'materialNode',
            position: { x: -400, y: 0 },
            data: { items: dissection.materials },
        });
        newEdges.push({
            id: `e-${nodeId}-${matNodeId}`,
            source: nodeId,
            sourceHandle: null,
            target: matNodeId,
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
        });

        // 4b. Instruction Nodes (Right side, Grid/List layout)
        const startX = 500;
        const startY = -100;
        const gapY = 500;
        const gapX = 400;

        dissection.steps.forEach((step, index) => {
            const stepNodeId = `${nodeId}-step-${step.stepNumber}`;
            const col = index % 2;
            const row = Math.floor(index / 2);

            newNodes.push({
                id: stepNodeId,
                type: 'instructionNode',
                position: {
                    x: startX + (col * gapX),
                    y: startY + (row * gapY) - ((dissection.steps.length * gapY)/4)
                },
                data: {
                    stepNumber: step.stepNumber,
                    title: step.title,
                    description: step.description,
                    safetyWarning: step.safetyWarning,
                    isGeneratingImage: true,
                    imageUrl: undefined
                }
            });

            newEdges.push({
                id: `e-${nodeId}-${stepNodeId}`,
                source: nodeId,
                sourceHandle: null,
                target: stepNodeId,
                animated: true,
                style: { stroke: '#10b981', strokeWidth: 2 },
            });
        });

        // 4. Update state: mark node as dissected, add instruction nodes
        setNodes((nds) => {
            const updatedNodes = nds.map((node) => {
                if (node.id === nodeId) {
                    return { ...node, data: { ...node.data, isDissecting: false, isDissected: true } };
                }
                return node;
            });
            return [...updatedNodes, ...newNodes];
        });

        setEdges((eds) => [...eds, ...newEdges]);

        // 5. Generate step images in the background using the FULL image as reference
        // IMPORTANT: Get category from master node's stored data
        const masterNode = nodes.find(n => n.id === nodeId);
        const category = (masterNode?.data?.category as CraftCategory) || CraftCategory.CLAY; // Default to Clay if undefined

        console.log('=== DISSECT SELECTED DEBUG ===');
        console.log('Node ID:', nodeId);
        console.log('AI Identified Object:', identifiedLabel);
        console.log('Master Node Data:', masterNode?.data);
        console.log('Category:', category);
        console.log('Total steps:', dissection.steps.length);
        console.log('All steps:', dissection.steps.map(s => `${s.stepNumber}: ${s.title}`));
        console.log('✅ IMAGE GENERATION ENABLED - Multi-Panel Format');

        // Generate step images with multi-panel format
        // Pass the identifiedLabel to ensure images focus on the selected object only
        for (const step of dissection.steps) {
          const stepNodeId = `${nodeId}-step-${step.stepNumber}`;

          console.log(`\n🎨 Generating multi-panel image for Step ${step.stepNumber}: ${step.title}`);
          console.log(`Target object: ${identifiedLabel}`);
          console.log(`Category: ${category}`);

          try {
            // Generate image with target object label to ensure focus on selected object
            const imageUrl = await generateStepImage(
              fullImageUrl,
              `${step.title}: ${step.description}`,
              category,
              identifiedLabel // Pass the identified object label
            );

            console.log(`✅ Successfully generated image for Step ${step.stepNumber}`);

            // Update node with generated image
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id === stepNodeId) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      imageUrl,
                      isGeneratingImage: false
                    }
                  };
                }
                return node;
              })
            );
          } catch (error) {
            console.error(`❌ Failed to generate image for Step ${step.stepNumber}:`, error);
            // Clear loading state on error
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id === stepNodeId) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      isGeneratingImage: false
                    }
                  };
                }
                return node;
              })
            );
          }
        }

        console.log('=== DISSECT SELECTED COMPLETE ===\n');
    } catch (error) {
      console.error('Dissection failed:', error);
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return { ...node, data: { ...node.data, isDissecting: false } };
          }
          return node;
        })
      );
    }
  };

  /**
   * Step 2b: The Logic to "Dissect" the entire craft
   */
  const handleDissect = async (nodeId: string, imageUrl: string) => {
    if (readOnly) return;

    // 1. Set loading state on the specific node
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, isDissecting: true } };
        }
        return node;
      })
    );

    try {
        // Find the prompt from the node data to give context to the AI
        const node = nodes.find(n => n.id === nodeId);
        const promptContext = node?.data?.label as string || "Unknown craft";

        // 2. Call Gemini API to get TEXT instructions
        const dissection = await dissectCraft(imageUrl, promptContext);
        
        // 3. Calculate Positions for new nodes
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        // 3a. Materials Node (Left side)
        const matNodeId = `${nodeId}-mat`;
        newNodes.push({
            id: matNodeId,
            type: 'materialNode',
            position: { x: -400, y: 0 },
            data: { items: dissection.materials },
        });
        newEdges.push({
            id: `e-${nodeId}-${matNodeId}`,
            source: nodeId,
            sourceHandle: null, 
            target: matNodeId,
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
        });

        // 3b. Instruction Nodes (Right side, Grid/List layout)
        const startX = 500;
        const startY = -100;
        const gapY = 500;
        const gapX = 400;
        
        dissection.steps.forEach((step, index) => {
            const stepNodeId = `${nodeId}-step-${step.stepNumber}`;
            const col = index % 2;
            const row = Math.floor(index / 2);
            
            newNodes.push({
                id: stepNodeId,
                type: 'instructionNode',
                position: { 
                    x: startX + (col * gapX), 
                    y: startY + (row * gapY) - ((dissection.steps.length * gapY)/4) 
                },
                data: { 
                    stepNumber: step.stepNumber,
                    title: step.title,
                    description: step.description,
                    safetyWarning: step.safetyWarning,
                    isGeneratingImage: true,
                    imageUrl: undefined
                }
            });

            newEdges.push({
                id: `e-${nodeId}-${stepNodeId}`,
                source: nodeId,
                target: stepNodeId,
                animated: true,
                style: { stroke: '#10b981', strokeWidth: 2 },
            });
        });

        // 4. Update Canvas State
        setNodes((nds) => {
            const updatedMaster = nds.map(n => {
                if (n.id === nodeId) {
                    return { ...n, data: { ...n.data, isDissecting: false, isDissected: true }};
                }
                return n;
            });
            return [...updatedMaster, ...newNodes];
        });

        setEdges((eds) => [...eds, ...newEdges]);

        // 5. Trigger Image Generation Sequence with step grouping
        const processImagesSequentially = async () => {
          const masterNode = nodes.find(n => n.id === nodeId);
          const category = masterNode?.data?.category as CraftCategory;
          const stepGroups = groupStepsForImageGeneration(dissection.steps);

          console.log('=== DISSECT FULL CRAFT DEBUG ===');
          console.log('Node ID:', nodeId);
          console.log('Category:', category);
          console.log('Total steps:', dissection.steps.length);
          console.log('Step groups:', stepGroups.length);
          console.log('All steps:', dissection.steps.map(s => `${s.stepNumber}: ${s.title}`));
          console.log('Group details:', stepGroups.map(g => ({
            stepNumbers: g.stepNumbers,
            title: g.combinedTitle
          })));

          for (const group of stepGroups) {
            try {
              console.log(`\n--- Generating image for group: steps ${group.stepNumbers.join(', ')} ---`);
              console.log('Group description:', group.combinedDescription);

              // Combine descriptions for grouped steps
              const groupDescription = group.combinedDescription;
              const stepImageUrl = await generateStepImage(imageUrl, groupDescription, category);

              console.log('✓ Image generated successfully');
              console.log('Updating nodes for step numbers:', group.stepNumbers);

              // Update all nodes in this group with the same generated image
              setNodes((nds) => {
                const updated = nds.map((node) => {
                  if (node.id.startsWith(`${nodeId}-step-`)) {
                    const nodeStepNumber = parseInt(node.id.split('-step-')[1]);
                    if (!isNaN(nodeStepNumber) && group.stepNumbers.includes(nodeStepNumber)) {
                      console.log(`  → Updated node ${node.id} (step ${nodeStepNumber})`);
                      return {
                        ...node,
                        data: {
                          ...node.data,
                          imageUrl: stepImageUrl,
                          isGeneratingImage: false
                        }
                      };
                    }
                  }
                  return node;
                });
                return updated;
              });
            } catch (error) {
              console.error(`✗ Failed to generate image for step group ${group.stepNumbers.join(', ')}:`, error);
              setNodes((nds) =>
                nds.map((node) => {
                  if (node.id.startsWith(`${nodeId}-step-`)) {
                    const nodeStepNumber = parseInt(node.id.split('-step-')[1]);
                    if (!isNaN(nodeStepNumber) && group.stepNumbers.includes(nodeStepNumber)) {
                      console.log(`  → Cleared loading state for node ${node.id} (step ${nodeStepNumber})`);
                      return { ...node, data: { ...node.data, isGeneratingImage: false } };
                    }
                  }
                  return node;
                })
              );
            }
          }
          console.log('=== DISSECT FULL CRAFT COMPLETE ===\n');
        };

        processImagesSequentially();

    } catch (error) {
        console.error("Dissection error", error);
        setNodes((nds) =>
            nds.map((node) => {
              if (node.id === nodeId) {
                return { ...node, data: { ...node.data, isDissecting: false } };
              }
              return node;
            })
          );
        alert("Failed to dissect. Please try again.");
    }
  };

  /**
   * Step 1: Add the Master Generated Node
   */
  const handleGenerate = useCallback((imageUrl: string, prompt: string, category: CraftCategory) => {
    if (readOnly) return;

    const id = `master-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'masterNode',
      position: { x: 0, y: 0 },
      data: {
        label: prompt,
        imageUrl,
        category,
        onDissect: handleDissect,
        onContextMenu: handleNodeContextMenu,
        onDissectSelected: handleDissectSelected,
        isDissecting: false,
        isDissected: false,
      },
    };

    setNodes((nds) => [...nds, newNode]);

    // Create and save new project
    const newProject = {
      id: `project-${Date.now()}`,
      name: prompt.substring(0, 50),
      category,
      prompt,
      masterImageUrl: imageUrl,
      dissection: null,
      stepImages: new Map(),
      createdAt: new Date(),
      lastModified: new Date(),
      canvasState: {
        nodes: [newNode],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      }
    };

    saveProject(newProject);
  }, [setNodes, readOnly, saveProject]);

  // Context menu items
  const contextMenuItems: ContextMenuItem[] = [
    {
      id: 'dissect',
      label: 'Dissect Craft',
      icon: Scissors,
      onClick: handleDissectFromMenu,
      disabled: false,
    },
  ];

  return (
    <div className="w-screen h-screen bg-slate-950 relative overflow-hidden">
      {/* Floating Menu Bar */}
      <FloatingMenuBar projectName={currentProject?.name} />

      {/* Left Toolbar */}
      {!readOnly && (
        <LeftToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onToolSubmenuOpen={handleToolSubmenuOpen}
        />
      )}

      {/* Context Menu */}
      <ContextMenu
        visible={contextMenu.visible}
        position={contextMenu.position}
        items={contextMenuItems}
        onClose={handleCloseContextMenu}
      />

      {/* Tool Submenus */}
      <UploadSubmenu
        visible={toolSubmenu.visible && toolSubmenu.tool === 'upload'}
        position={toolSubmenu.position}
        onClose={handleCloseToolSubmenu}
        onUploadImage={handleUploadImage}
      />

      <ShapesSubmenu
        visible={toolSubmenu.visible && toolSubmenu.tool === 'shapes'}
        position={toolSubmenu.position}
        onClose={handleCloseToolSubmenu}
        onSelectShape={handleSelectShape}
      />

      <PencilSubmenu
        visible={toolSubmenu.visible && toolSubmenu.tool === 'pencil'}
        position={toolSubmenu.position}
        onClose={handleCloseToolSubmenu}
        onSelectMode={handleSelectPencilMode}
      />

      <div 
        className="w-full h-full"
        onMouseDown={drawingMode ? handlePaneMouseDown : undefined}
        onMouseMove={drawingMode ? handlePaneMouseMove : undefined}
        onMouseUp={drawingMode ? handlePaneMouseUp : undefined}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : handleNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={onConnect}
          onConnectEnd={readOnly ? undefined : onConnectEnd}
          onPaneClick={handleCanvasClick}
          nodeTypes={nodeTypes}
          fitView
          className={`bg-slate-950 ${getToolCursor(activeTool)}`}
          nodesDraggable={!readOnly && activeTool === 'select'}
          nodesConnectable={!readOnly && activeTool === 'select'}
          elementsSelectable={!readOnly && activeTool === 'select'}
          panOnDrag={!drawingMode}
          minZoom={0.1}
          maxZoom={8}
        >
          <Background 
              color="#334155" 
              variant={BackgroundVariant.Dots} 
              gap={24} 
              size={2} 
          />
          <Controls className="bg-slate-800 border-slate-700 text-slate-200" />
        </ReactFlow>
      </div>

      {/* Empty State Message */}
      {nodes.length === 0 && !readOnly && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="empty-state max-w-md px-6">
            <Sparkles className="w-16 h-16 text-indigo-500/30 mb-4 mx-auto" />
            <h2 className="text-2xl font-bold text-slate-400 mb-2">Your Canvas Awaits</h2>
            <p className="text-slate-500 mb-6">
              Describe your craft idea below to summon your first project
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
              <Keyboard className="w-4 h-4" />
              <span>Use arrow keys to pan • Cmd/Ctrl + / - to zoom</span>
            </div>
          </div>
        </div>
      )}



      {/* Readonly Badge */}
      {readOnly && (
        <div className="absolute top-4 right-4 md:top-6 md:right-8 z-40 px-3 py-1.5 md:px-4 md:py-2 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg">
          <span className="text-xs md:text-sm font-medium text-slate-300">Read Only</span>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      {!readOnly && nodes.length > 0 && (
        <div className="absolute bottom-4 left-4 z-40 px-3 py-2 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-lg hide-mobile">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Keyboard className="w-3 h-3" />
            <span>Arrow keys: Pan • Cmd/Ctrl +/-: Zoom • Cmd/Ctrl 0: Fit</span>
          </div>
        </div>
      )}

      {/* Chat Interface (hidden in readonly mode) */}
      {!readOnly && <ChatInterface onGenerate={handleGenerate} />}
    </div>
  );
};

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = (props) => {
  return (
    <ReactFlowProvider>
      <CanvasWorkspaceContent {...props} />
    </ReactFlowProvider>
  );
};
