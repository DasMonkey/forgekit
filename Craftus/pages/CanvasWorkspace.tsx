import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  ReactFlow,
  Background,
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
import { Sparkles, Keyboard } from 'lucide-react';
import { MasterNode, InstructionNode, MaterialNode, ImageNode, ShapeNode, TextNode, DrawingNode } from '../components/CustomNodes';
import { ChatInterface } from '../components/ChatInterface';
import { FloatingMenuBar } from '../components/FloatingMenuBar';
import { LeftToolbar, ToolType } from '../components/LeftToolbar';
import { UploadSubmenu } from '../components/UploadSubmenu';
import { ShapesSubmenu, ShapeType } from '../components/ShapesSubmenu';
import { PencilSubmenu, PencilMode } from '../components/PencilSubmenu';
import { ImageNodeUnifiedMenu } from '../src/components/ImageNodeUnifiedMenu';
import { MasterNodeActionsMenu } from '../src/components/MasterNodeActionsMenu';
import { calculateNodeMenuPosition, calculateCraftMenuPosition } from '../utils/contextMenuPosition';
import { handleFileUpload } from '../utils/fileUpload';
import { dissectCraft, dissectSelectedObject, generateStepImage, identifySelectedObject, generateCraftFromImage, generateSVGPatternSheet, generateTurnTableView, TurnTableView } from '../services/geminiService';
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

/**
 * Find an empty position on the canvas to place a new node
 * Checks existing nodes and finds a spot that doesn't overlap
 */
const findEmptyPosition = (
  existingNodes: Node[],
  sourceNode: Node,
  offsetX: number,
  offsetY: number,
  nodeWidth: number = 600,
  nodeHeight: number = 400
): { x: number; y: number } => {
  const padding = 50; // Space between nodes
  const maxAttempts = 20;

  // Try the preferred position first
  let x = sourceNode.position.x + offsetX;
  let y = sourceNode.position.y + offsetY;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Check if this position overlaps with any existing node
    const hasOverlap = existingNodes.some((node) => {
      const nodeW = (node.data?.width as number) || 300;
      const nodeH = (node.data?.height as number) || 200;

      // Check rectangle overlap
      return !(
        x + nodeWidth + padding < node.position.x ||
        x > node.position.x + nodeW + padding ||
        y + nodeHeight + padding < node.position.y ||
        y > node.position.y + nodeH + padding
      );
    });

    if (!hasOverlap) {
      return { x, y };
    }

    // Try different positions in a spiral pattern
    if (attempt % 2 === 0) {
      x += 700; // Try moving right
    } else {
      x = sourceNode.position.x + offsetX;
      y += 500; // Try moving down
    }
  }

  // If all attempts fail, just use the original offset (shouldn't happen often)
  return { x: sourceNode.position.x + offsetX, y: sourceNode.position.y + offsetY };
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
  const { screenToFlowPosition, fitView, getViewport, setCenter } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Custom handler for node changes to sync dimensions for ShapeNodes
  const handleNodesChange = useCallback((changes: any[]) => {
    // Apply the changes first
    onNodesChange(changes);

    // Then sync dimensions for any resize changes (only for shapeNode which uses data.width/height)
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
  const [activeTool, setActiveTool] = useState<ToolType>('hand');
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

  // Craft style menu state for image-to-craft conversion
  const [craftStyleMenu, setCraftStyleMenu] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    nodeId: string | null;
    selectedCategory: CraftCategory | null;
  }>({
    visible: false,
    position: { x: 0, y: 0 },
    nodeId: null,
    selectedCategory: null,
  });
  const [isConvertingImage, setIsConvertingImage] = useState(false);

  // Master node actions menu state
  const [masterNodeActionsMenu, setMasterNodeActionsMenu] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    nodeId: string | null;
    category?: CraftCategory;
  }>({
    visible: false,
    position: { x: 0, y: 0 },
    nodeId: null,
    category: undefined,
  });

  // Track magic select enabled state per master node (default: true)
  const [magicSelectEnabledMap, setMagicSelectEnabledMap] = useState<Record<string, boolean>>({});

  // Track the current drawing node ID and start position
  const [currentDrawingNodeId, setCurrentDrawingNodeId] = useState<string | null>(null);
  const [drawingStartPos, setDrawingStartPos] = useState<{ x: number; y: number } | null>(null);
  const updateFrameRef = useRef<number | null>(null);

  // Ref to always have access to latest nodes (avoids stale closure issues)
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  
  // Track hover state for craft menu auto-dismiss
  const menuHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isHoveringMenu, setIsHoveringMenu] = useState(false);

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

  // Cleanup menu hover timeout on unmount
  useEffect(() => {
    return () => {
      if (menuHoverTimeoutRef.current) {
        clearTimeout(menuHoverTimeoutRef.current);
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

  /**
   * Handle image node selection for craft conversion
   */
  const handleImageNodeSelect = useCallback((nodeId: string, element: HTMLElement) => {
    if (readOnly) return;

    // Clear any pending timeout
    if (menuHoverTimeoutRef.current) {
      clearTimeout(menuHoverTimeoutRef.current);
      menuHoverTimeoutRef.current = null;
    }

    // ImageNode unified menu width: Download + Share + Style dropdown + Convert ≈ 480px
    const position = calculateCraftMenuPosition(element, 480);
    setCraftStyleMenu({
      visible: true,
      position,
      nodeId,
      selectedCategory: null,
    });
  }, [readOnly]);

  /**
   * Handle image node deselection (mouse leave)
   */
  const handleImageNodeDeselect = useCallback(() => {
    // Delay closing to allow moving to the menu
    menuHoverTimeoutRef.current = setTimeout(() => {
      if (!isHoveringMenu) {
        handleCloseCraftStyleMenu();
      }
    }, 50); // 50ms delay for fast response
  }, [isHoveringMenu]);

  /**
   * Handle menu mouse enter
   */
  const handleMenuMouseEnter = useCallback(() => {
    setIsHoveringMenu(true);
    // Clear any pending close timeout
    if (menuHoverTimeoutRef.current) {
      clearTimeout(menuHoverTimeoutRef.current);
      menuHoverTimeoutRef.current = null;
    }
  }, []);

  /**
   * Handle menu mouse leave
   */
  const handleMenuMouseLeave = useCallback(() => {
    setIsHoveringMenu(false);
    // Close menus after a short delay
    menuHoverTimeoutRef.current = setTimeout(() => {
      handleCloseCraftStyleMenu();
      // Also close master node actions menu
      setMasterNodeActionsMenu({
        visible: false,
        position: { x: 0, y: 0 },
        nodeId: null,
        category: undefined,
      });
    }, 150); // Slightly longer delay for smoother UX
  }, []);

  /**
   * Handle craft category selection
   */
  const handleCraftCategorySelect = useCallback((category: CraftCategory) => {
    setCraftStyleMenu((prev) => ({
      ...prev,
      selectedCategory: category,
    }));
  }, []);

  /**
   * Close craft style menu
   */
  const handleCloseCraftStyleMenu = useCallback(() => {
    setCraftStyleMenu({
      visible: false,
      position: { x: 0, y: 0 },
      nodeId: null,
      selectedCategory: null,
    });
    
    // Clear selection state from ImageNode
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === 'imageNode' && node.data.isSelected) {
          return {
            ...node,
            data: {
              ...node.data,
              isSelected: false,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  /**
   * Handle master node selection for actions menu
   */
  const handleMasterNodeSelect = useCallback((nodeId: string, element: HTMLElement, category?: CraftCategory) => {
    if (readOnly) return;

    // Clear any pending timeout
    if (menuHoverTimeoutRef.current) {
      clearTimeout(menuHoverTimeoutRef.current);
      menuHoverTimeoutRef.current = null;
    }

    // Use appropriate menu width based on whether pattern button will show
    // Pattern Sheet (~140px) + Instructions (~120px) + Turn Table (~130px) + Magic Select (~140px) + Download (~110px) + Share (~90px) + dividers/padding
    const PATTERN_CATEGORIES = [
      CraftCategory.PAPERCRAFT,
      CraftCategory.COSTUME_PROPS,
      CraftCategory.WOODCRAFT,
      CraftCategory.KIDS_CRAFTS,
    ];
    const hasPatternButton = category && PATTERN_CATEGORIES.includes(category);
    const menuWidth = hasPatternButton ? 750 : 610;

    const position = calculateCraftMenuPosition(element, menuWidth);
    setMasterNodeActionsMenu({
      visible: true,
      position,
      nodeId,
      category,
    });
  }, [readOnly]);

  /**
   * Handle master node deselection (mouse leave)
   */
  const handleMasterNodeDeselect = useCallback(() => {
    // Small delay to allow moving to the menu, then close immediately
    menuHoverTimeoutRef.current = setTimeout(() => {
      // Close the menu - if user moved to menu, handleMenuMouseEnter will have set isHoveringMenu
      // and the menu visibility is controlled by onMouseEnter/onMouseLeave on the menu itself
      handleCloseMasterNodeActionsMenu();
    }, 100); // Small delay to allow mouse to reach menu
  }, []);

  /**
   * Close master node actions menu
   */
  const handleCloseMasterNodeActionsMenu = useCallback(() => {
    setMasterNodeActionsMenu({
      visible: false,
      position: { x: 0, y: 0 },
      nodeId: null,
      category: undefined,
    });
  }, []);

  /**
   * Toggle magic select for the current master node
   */
  const handleToggleMagicSelect = useCallback(() => {
    const nodeId = masterNodeActionsMenu.nodeId;
    console.log('🎯 handleToggleMagicSelect called, nodeId:', nodeId);
    if (!nodeId) {
      console.log('❌ No nodeId, returning early');
      return;
    }

    // Use functional update to get the latest value from the map
    setMagicSelectEnabledMap(prev => {
      const currentValue = prev[nodeId] ?? false;
      const newEnabled = !currentValue;
      console.log('🔄 Toggling magic select:', currentValue, '->', newEnabled);

      // Update the node data inside the same render cycle
      setNodes(nds => nds.map(node => {
        if (node.id === nodeId && node.type === 'masterNode') {
          console.log('✅ Updating node data for:', nodeId, 'magicSelectEnabled:', newEnabled);
          // Create a completely new data object to ensure React Flow detects the change
          return {
            ...node,
            data: {
              ...node.data,
              magicSelectEnabled: newEnabled,
            },
          };
        }
        return node;
      }));

      return {
        ...prev,
        [nodeId]: newEnabled,
      };
    });
  }, [masterNodeActionsMenu.nodeId, setNodes]);

  /**
   * Download image from ImageNode
   */
  const handleDownloadImageNode = useCallback(() => {
    const nodeId = craftStyleMenu.nodeId;
    if (!nodeId) return;

    // Find the image node
    const node = nodes.find(n => n.id === nodeId);
    if (!node || node.type !== 'imageNode') {
      console.error('Image node not found');
      return;
    }

    const imageUrl = node.data.imageUrl as string;
    const fileName = node.data.fileName as string || 'image.png';

    // Close menu immediately
    handleCloseCraftStyleMenu();

    try {
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('✅ Image download started:', fileName);
    } catch (error) {
      console.error('Failed to download image:', error);
      alert('Failed to download image');
    }
  }, [craftStyleMenu.nodeId, nodes, handleCloseCraftStyleMenu]);

  /**
   * Share image from ImageNode (placeholder)
   */
  const handleShareImageNode = useCallback(() => {
    const nodeId = craftStyleMenu.nodeId;
    if (!nodeId) return;

    // Find the image node
    const node = nodes.find(n => n.id === nodeId);
    if (!node || node.type !== 'imageNode') {
      console.error('Image node not found');
      return;
    }

    // Close menu immediately
    handleCloseCraftStyleMenu();

    // Placeholder for share functionality
    alert('Share functionality coming soon!');
    console.log('Share requested for:', node.data.fileName);
  }, [craftStyleMenu.nodeId, nodes, handleCloseCraftStyleMenu]);

  /**
   * Handle action button clicks from MasterNode menu
   */
  const handleCreateSVGPattern = useCallback(async () => {
    const nodeId = masterNodeActionsMenu.nodeId;
    if (!nodeId || readOnly) return;

    // Find the master node
    const node = nodes.find(n => n.id === nodeId);
    if (!node || node.type !== 'masterNode') {
      console.error('Master node not found');
      return;
    }

    const imageUrl = node.data.imageUrl as string;
    const label = node.data.label as string;
    const category = node.data.category as CraftCategory;

    // Close menu immediately and clear nodeId to prevent double-triggering
    handleCloseMasterNodeActionsMenu();

    console.log('🎨 Generating comprehensive SVG pattern sheet...');
    console.log('Craft:', label);
    console.log('Category:', category);
    console.log('Image URL length:', imageUrl?.length || 0);

    // Create placeholder node immediately so user knows where it will appear
    const patternNodeId = `pattern-${Date.now()}`;

    // Position pattern sheet to the LEFT of master node, on the same row (horizontally aligned)
    // Master node is 300px wide, pattern sheet is 600px wide, add 50px gap
    const position = {
      x: node.position.x - 600 - 50, // 600px pattern width + 50px gap to the left
      y: node.position.y, // Same Y position (same row)
    };

    const placeholderNode: Node = {
      id: patternNodeId,
      type: 'imageNode',
      position,
      data: {
        imageUrl: '', // Empty for now
        fileName: `${label} - Pattern Sheet.png`,
        width: 600,
        height: 374, // 338px image (16:9) + 36px header
        isSelected: false,
        isGeneratingImage: true, // Show loading state
        onSelect: handleImageNodeSelect,
        onDeselect: handleImageNodeDeselect,
        onDelete: handleDeleteImageNode,
      },
    };

    // Add placeholder node immediately
    setNodes((nds) => [...nds, placeholderNode]);

    // Create edge immediately
    const newEdge: Edge = {
      id: `e-${patternNodeId}-${nodeId}`,
      source: patternNodeId,
      sourceHandle: 'source-right',
      target: nodeId,
      targetHandle: 'target-left',
      animated: true,
      style: { stroke: '#8b5cf6', strokeWidth: 2 },
    };
    setEdges((eds) => [...eds, newEdge]);

    // Generate pattern sheet in background
    try {
      console.log('📞 Calling generateSVGPatternSheet...');
      const patternSheetUrl = await generateSVGPatternSheet(imageUrl, category, label);
      console.log('📥 Received pattern sheet URL, length:', patternSheetUrl?.length || 0);
      console.log('✅ Pattern sheet generated successfully!');

      // Update node with actual image
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === patternNodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                imageUrl: patternSheetUrl,
                isGeneratingImage: false,
              },
            };
          }
          return n;
        })
      );
    } catch (error) {
      console.error('Failed to generate SVG pattern sheet:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate pattern sheet');

      // Remove placeholder node on error
      setNodes((nds) => nds.filter((n) => n.id !== patternNodeId));
      setEdges((eds) => eds.filter((e) => e.id !== `e-${patternNodeId}-${nodeId}`));
    }
  }, [masterNodeActionsMenu.nodeId, nodes, readOnly, setNodes, setEdges, handleImageNodeSelect, handleImageNodeDeselect]);

  const handleCreateStepInstructions = useCallback(async () => {
    const nodeId = masterNodeActionsMenu.nodeId;
    if (!nodeId || readOnly) return;

    // Find the master node to get its image URL
    const masterNode = nodes.find(n => n.id === nodeId);
    if (!masterNode || masterNode.type !== 'masterNode') {
      console.error('Master node not found');
      return;
    }

    const imageUrl = masterNode.data.imageUrl as string;
    if (!imageUrl) {
      console.error('No image URL found on master node');
      return;
    }

    // Close the menu first
    handleCloseMasterNodeActionsMenu();

    // Trigger the dissect flow (same as "Break Down Craft")
    await handleDissect(nodeId, imageUrl);
  }, [masterNodeActionsMenu.nodeId, nodes, readOnly, handleCloseMasterNodeActionsMenu]);

  /**
   * Handle Turn Table - Generate left, right, and back views of the craft
   */
  const handleCreateTurnTable = useCallback(async () => {
    const nodeId = masterNodeActionsMenu.nodeId;
    if (!nodeId || readOnly) return;

    // Find the master node
    const node = nodes.find(n => n.id === nodeId);
    if (!node || node.type !== 'masterNode') {
      console.error('Master node not found');
      return;
    }

    const imageUrl = node.data.imageUrl as string;
    const label = node.data.label as string;

    // Close menu immediately
    handleCloseMasterNodeActionsMenu();

    console.log('🔄 Generating Turn Table views...');
    console.log('Craft:', label);

    // Define the 3 views to generate
    const views: TurnTableView[] = ['left', 'right', 'back'];
    const viewLabels: Record<TurnTableView, string> = {
      left: 'Left Side',
      right: 'Right Side',
      back: 'Back View',
    };

    // Calculate positions for the 3 new nodes (arranged in a row below the master node)
    const masterNodeHeight = (node.data?.height as number) || 500; // Get actual master node height
    const baseY = node.position.y + masterNodeHeight + 50; // Position below master node with 50px gap
    const spacing = 350; // Horizontal spacing between nodes
    const startX = node.position.x - spacing; // Start from left

    // Create placeholder nodes for all 3 views immediately
    const placeholderNodes: Node[] = views.map((view, index) => {
      const viewNodeId = `turntable-${view}-${Date.now()}-${index}`;
      return {
        id: viewNodeId,
        type: 'imageNode',
        position: { x: startX + (index * spacing), y: baseY },
        data: {
          imageUrl: '',
          fileName: `${label} - ${viewLabels[view]}.png`,
          width: 300,
          height: 336, // 300px image + 36px header
          isSelected: false,
          isGeneratingImage: true,
          onSelect: handleImageNodeSelect,
          onDeselect: handleImageNodeDeselect,
          onDelete: handleDeleteImageNode,
        },
      };
    });

    // Add all placeholder nodes
    setNodes((nds) => [...nds, ...placeholderNodes]);

    // Create edges from master node to each view node
    const newEdges: Edge[] = placeholderNodes.map((placeholderNode) => ({
      id: `e-${nodeId}-${placeholderNode.id}`,
      source: nodeId,
      sourceHandle: 'source-right',
      target: placeholderNode.id,
      targetHandle: 'target-left',
      animated: true,
      style: { stroke: '#f59e0b', strokeWidth: 2 }, // Amber color for turn table edges
    }));
    setEdges((eds) => [...eds, ...newEdges]);

    // Generate each view in parallel
    const generatePromises = views.map(async (view, index) => {
      const viewNodeId = placeholderNodes[index].id;
      try {
        console.log(`📸 Generating ${view} view...`);
        const viewImageUrl = await generateTurnTableView(imageUrl, view, label);
        console.log(`✅ ${view} view generated successfully!`);

        // Update the specific node with the generated image
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === viewNodeId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  imageUrl: viewImageUrl,
                  isGeneratingImage: false,
                },
              };
            }
            return n;
          })
        );
      } catch (error) {
        console.error(`Failed to generate ${view} view:`, error);
        // Update node to show error state
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === viewNodeId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  imageUrl: '',
                  isGeneratingImage: false,
                  fileName: `${label} - ${viewLabels[view]} (Failed)`,
                },
              };
            }
            return n;
          })
        );
      }
    });

    // Wait for all generations to complete (they run in parallel)
    await Promise.allSettled(generatePromises);
    console.log('🎉 Turn Table generation complete!');
  }, [masterNodeActionsMenu.nodeId, nodes, readOnly, setNodes, setEdges, handleImageNodeSelect, handleImageNodeDeselect, handleCloseMasterNodeActionsMenu]);

  const handleDownloadImage = useCallback(() => {
    const nodeId = masterNodeActionsMenu.nodeId;
    if (!nodeId) return;

    // Find the node and download its image
    const node = nodes.find(n => n.id === nodeId);
    if (node && node.type === 'masterNode') {
      const imageUrl = node.data.imageUrl as string;
      const label = node.data.label as string;

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `${label.slice(0, 50)}.png`; // Use prompt as filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    handleCloseMasterNodeActionsMenu();
  }, [masterNodeActionsMenu.nodeId, nodes]);

  const handleShareImage = useCallback(() => {
    const nodeId = masterNodeActionsMenu.nodeId;
    if (!nodeId) return;

    // TODO: Implement share functionality (copy link, social media, etc.)
    console.log('Share image for node:', nodeId);
    alert('Share functionality will be implemented soon!');
    handleCloseMasterNodeActionsMenu();
  }, [masterNodeActionsMenu.nodeId]);

  // Handle tool-specific behaviors
  useEffect(() => {
    if (activeTool === 'select') {
      // Select tool is active - enables box selection to select multiple items
      // Users can drag to select multiple nodes
      setTextCreationMode(false);
      setDrawingMode(false);
    } else if (activeTool === 'hand') {
      // Hand tool is active - enables panning the canvas
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

  // Track if we've loaded the project to prevent re-loading
  const hasLoadedProjectRef = useRef(false);
  const isLoadingProjectRef = useRef(false);

  // Track if canvas is ready to show (prevents flash of content at wrong position)
  const [isCanvasReady, setIsCanvasReady] = useState(!projectId);

  // Load project from storage if projectId is provided (only once on mount)
  useEffect(() => {
    if (projectId && !hasLoadedProjectRef.current) {
      // Find project from current state snapshot
      const project = projectsState.projects.find(p => p.id === projectId);
      if (project && project.canvasState) {
        isLoadingProjectRef.current = true;
        hasLoadedProjectRef.current = true;

        // Add handlers to all node types when loading
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
          if (node.type === 'imageNode') {
            return {
              ...node,
              data: {
                ...node.data,
                isSelected: false,
                onSelect: handleImageNodeSelect,
                onDeselect: handleImageNodeDeselect,
                onDelete: handleDeleteImageNode,
              },
            };
          }
          if (node.type === 'masterNode') {
            return {
              ...node,
              data: {
                ...node.data,
                onDissect: handleDissect,
                onDissectSelected: handleDissectSelected,
                onSelect: handleMasterNodeSelect,
                onDeselect: handleMasterNodeDeselect,
                magicSelectEnabled: magicSelectEnabledMap[node.id] ?? false,
              },
            };
          }
          return node;
        });
        setNodes(nodesWithHandlers);
        setEdges(project.canvasState.edges || []);

        // Reset loading flag and center the view after nodes are rendered
        setTimeout(() => {
          isLoadingProjectRef.current = false;
          // Center the view on the loaded content with more padding to zoom out (no animation)
          fitView({ padding: 0.5, maxZoom: 0.8, duration: 0 });
          // Show the canvas now that it's properly positioned
          setIsCanvasReady(true);
        }, 50);
      } else {
        // No project found or no canvas state - mark as ready anyway
        setIsCanvasReady(true);
      }
    }
  // Only run once on mount - don't re-run when projects change (causes infinite loop with auto-save)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Debounce timer ref for auto-save
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save canvas state when nodes or edges change (skip during initial load)
  // Uses debouncing to prevent lag during dragging operations
  useEffect(() => {
    // Skip auto-save during initial project load to prevent infinite loop
    if (isLoadingProjectRef.current) return;

    if (projectId && nodes.length > 0) {
      // Clear any pending save
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Debounce the save operation - wait 500ms after last change
      autoSaveTimerRef.current = setTimeout(() => {
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
      }, 500);
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [nodes, edges, projectId, updateProject]);

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
   * Handle image node deletion
   */
  const handleDeleteImageNode = useCallback((nodeId: string) => {
    if (readOnly) return;

    // Remove the node
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    
    // Remove any connected edges
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    
    console.log('Deleted image node:', nodeId);
  }, [readOnly, setNodes, setEdges]);

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

          // Calculate center of the viewport in flow coordinates using getViewport
          // This avoids timing issues with screenToFlowPosition during async callbacks
          const viewport = getViewport();
          const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom - width / 2;
          const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom - height / 2;
          const centerPosition = { x: centerX, y: centerY };

          // Create new image node
          const id = `image-${Date.now()}`;
          const newNode: Node = {
            id,
            type: 'imageNode',
            position: centerPosition,
            data: {
              imageUrl: dataUrl,
              fileName,
              width,
              height: height + 36, // Add 36px for header
              isSelected: false,
              onSelect: handleImageNodeSelect,
              onDeselect: handleImageNodeDeselect,
              onDelete: handleDeleteImageNode,
            },
          };

          setNodes((nds) => [...nds, newNode]);
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
  }, [setNodes, getViewport, handleDeleteImageNode, handleCloseToolSubmenu]);

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

    handleCloseToolSubmenu();
  }, [setNodes, pendingConnection, setEdges]);

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

    // Close craft style menu if clicking on canvas background
    if (craftStyleMenu.visible) {
      handleCloseCraftStyleMenu();
    }

    // Close master node actions menu if clicking on canvas background
    if (masterNodeActionsMenu.visible) {
      setMasterNodeActionsMenu({
        visible: false,
        position: { x: 0, y: 0 },
        nodeId: null,
        category: undefined,
      });
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

    // Switch back to hand tool after creating text node
    setActiveTool('hand');

    // Enable editing after the node has been positioned
    setTimeout(() => {
      handleTextEdit(id);
    }, 50);
  }, [textCreationMode, readOnly, setNodes, toolSubmenu.visible, handleCloseToolSubmenu, craftStyleMenu.visible, handleCloseCraftStyleMenu, masterNodeActionsMenu.visible, handleTextEdit, screenToFlowPosition, setActiveTool]);

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
   * Step 2a: Dissect a selected object from the image
   */
  const handleDissectSelected = async (
    nodeId: string,
    selectedObjectImageUrl: string,
    fullImageUrl: string,
    _label: string // Unused - AI identifies object automatically
  ) => {
    if (readOnly) return;

    // CRITICAL: Use nodesRef to get latest nodes (avoids stale closure issue)
    const currentNodes = nodesRef.current;
    const masterNode = currentNodes.find(n => n.id === nodeId);
    const category = (masterNode?.data?.category as CraftCategory) || CraftCategory.PAPERCRAFT; // Default to Papercraft for safety

    console.log('=== DISSECT SELECTED START ===');
    console.log('Node ID:', nodeId);
    console.log('Master Node found:', !!masterNode);
    console.log('Master Node Data:', masterNode?.data);
    console.log('Category extracted:', category);
    console.log('Total nodes in ref:', currentNodes.length);

    if (!masterNode) {
        console.error('Master node not found for positioning');
        return;
    }

    // Generate unique prefix for this breakdown to avoid duplicate node IDs
    // This allows multiple breakdowns from the same master node
    const breakdownId = `${nodeId}-${Date.now()}`;

    // 1. Create placeholder nodes IMMEDIATELY (before any API calls)
    // This gives instant visual feedback like the pattern sheet does
    const DEFAULT_STEP_COUNT = 4; // Most breakdowns have 4 steps
    const placeholderNodes: Node[] = [];
    const placeholderEdges: Edge[] = [];

    // Calculate positions for placeholder nodes
    // Position steps directly to the right of the master image, vertically centered
    const masterNodeHeight = (masterNode.data?.height as number) || 400;
    const gapY = 500;
    const gapX = 400;
    const totalGridHeight = 2 * gapY; // 2 rows
    const gridStartY = masterNode.position.y + (masterNodeHeight / 2) - (totalGridHeight / 2);
    const firstStepPosition = findEmptyPosition(currentNodes, masterNode, 500, gridStartY - masterNode.position.y, 350, 400);

    // Create placeholder step nodes
    for (let i = 1; i <= DEFAULT_STEP_COUNT; i++) {
        const stepNodeId = `${breakdownId}-step-${i}`;
        const col = (i - 1) % 2;
        const row = Math.floor((i - 1) / 2);

        placeholderNodes.push({
            id: stepNodeId,
            type: 'instructionNode',
            position: {
                x: firstStepPosition.x + (col * gapX),
                y: firstStepPosition.y + (row * gapY)
            },
            data: {
                stepNumber: i,
                title: `Step ${i}`,
                description: 'Analyzing craft structure...',
                safetyWarning: undefined,
                isGeneratingImage: true,
                imageUrl: undefined
            }
        });

        placeholderEdges.push({
            id: `e-${nodeId}-${stepNodeId}`,
            source: nodeId,
            sourceHandle: 'source-right',
            target: stepNodeId,
            targetHandle: 'target-left',
            animated: true,
            style: { stroke: '#10b981', strokeWidth: 2 },
        });
    }

    // Add placeholders immediately and set loading state
    setNodes((nds) => {
        const updatedNodes = nds.map((node) => {
            if (node.id === nodeId) {
                return { ...node, data: { ...node.data, isDissecting: true } };
            }
            return node;
        });
        return [...updatedNodes, ...placeholderNodes];
    });
    setEdges((eds) => [...eds, ...placeholderEdges]);

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

        // 4. Create materials node now that we have the data
        const matNodeId = `${breakdownId}-mat`;
        const matPosition = findEmptyPosition(nodesRef.current, masterNode, -400, 0, 300, 200);
        const materialNode: Node = {
            id: matNodeId,
            type: 'materialNode',
            position: matPosition,
            data: { items: dissection.materials },
        };
        const materialEdge: Edge = {
            id: `e-${nodeId}-${matNodeId}`,
            source: nodeId,
            sourceHandle: 'source-left',
            target: matNodeId,
            targetHandle: 'target-right',
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
        };

        // 5. Update placeholder nodes with actual step data OR remove extras if fewer steps
        setNodes((nds) => {
            let updatedNodes = nds.map((node) => {
                // Update master node
                if (node.id === nodeId) {
                    return { ...node, data: { ...node.data, isDissecting: false, isDissected: true } };
                }
                // Update existing placeholder step nodes with actual data
                const stepMatch = node.id.match(new RegExp(`^${breakdownId}-step-(\\d+)$`));
                if (stepMatch) {
                    const stepNum = parseInt(stepMatch[1], 10);
                    const stepData = dissection.steps.find(s => s.stepNumber === stepNum);
                    if (stepData) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                title: stepData.title,
                                description: stepData.description,
                                safetyWarning: stepData.safetyWarning,
                                // Keep isGeneratingImage true - images will be generated next
                            }
                        };
                    } else {
                        // This placeholder is extra (more placeholders than actual steps)
                        return null; // Mark for removal
                    }
                }
                return node;
            }).filter((node): node is Node => node !== null);

            // Add any additional steps beyond the default placeholder count
            dissection.steps.forEach((step) => {
                if (step.stepNumber > DEFAULT_STEP_COUNT) {
                    const stepNodeId = `${breakdownId}-step-${step.stepNumber}`;
                    const col = (step.stepNumber - 1) % 2;
                    const row = Math.floor((step.stepNumber - 1) / 2);
                    updatedNodes.push({
                        id: stepNodeId,
                        type: 'instructionNode',
                        position: {
                            x: firstStepPosition.x + (col * gapX),
                            y: firstStepPosition.y + (row * gapY) - ((dissection.steps.length * gapY) / 4)
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
                }
            });

            // Add materials node
            return [...updatedNodes, materialNode];
        });

        // Update edges - remove extras and add materials edge + any new step edges
        setEdges((eds) => {
            // Filter out edges for removed placeholder steps
            const validStepNums = dissection.steps.map(s => s.stepNumber);
            const filteredEdges = eds.filter((edge) => {
                const stepMatch = edge.target.match(new RegExp(`^${breakdownId}-step-(\\d+)$`));
                if (stepMatch) {
                    const stepNum = parseInt(stepMatch[1], 10);
                    return validStepNums.includes(stepNum);
                }
                return true;
            });

            // Add edges for any new steps beyond default count
            const newStepEdges: Edge[] = [];
            dissection.steps.forEach((step) => {
                if (step.stepNumber > DEFAULT_STEP_COUNT) {
                    newStepEdges.push({
                        id: `e-${nodeId}-${breakdownId}-step-${step.stepNumber}`,
                        source: nodeId,
                        sourceHandle: 'source-right',
                        target: `${breakdownId}-step-${step.stepNumber}`,
                        targetHandle: 'target-left',
                        animated: true,
                        style: { stroke: '#10b981', strokeWidth: 2 },
                    });
                }
            });

            return [...filteredEdges, materialEdge, ...newStepEdges];
        });

        // 5. Generate step images in the background using the selected object as reference
        console.log('\n=== IMAGE GENERATION PHASE ===');
        console.log('Using category:', category);
        console.log('Target object:', identifiedLabel);
        console.log('Total steps:', dissection.steps.length);
        console.log('All steps:', dissection.steps.map(s => `${s.stepNumber}: ${s.title}`));
        console.log('Format: Multi-Panel with 4K resolution for Step 1');

        // Generate ALL step images in PARALLEL for faster generation
        // Pass the identifiedLabel to ensure images focus on the selected object only
        console.log(`\n🚀 Generating ${dissection.steps.length} step images IN PARALLEL...`);

        const stepGenerationPromises = dissection.steps.map(async (step) => {
          const stepNodeId = `${breakdownId}-step-${step.stepNumber}`;

          console.log(`🎨 Starting Step ${step.stepNumber}: ${step.title}`);
          console.log(`   Target object: ${identifiedLabel} | Category: ${category}`);

          try {
            // Generate image with SELECTED OBJECT as reference to match exact style/appearance
            const imageUrl = await generateStepImage(
              selectedObjectImageUrl, // Use selected object (not full image) as style reference
              `${step.title}: ${step.description}`,
              category,
              identifiedLabel, // Pass the identified object label
              step.stepNumber // Pass step number for 4K resolution on step 1
            );

            console.log(`✅ Step ${step.stepNumber} complete`);

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

            return { stepNumber: step.stepNumber, success: true };
          } catch (error) {
            console.error(`❌ Step ${step.stepNumber} failed:`, error);
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

            return { stepNumber: step.stepNumber, success: false, error };
          }
        });

        // Wait for all step images to complete (success or failure)
        const results = await Promise.all(stepGenerationPromises);
        const successCount = results.filter(r => r.success).length;
        console.log(`\n📊 Parallel generation complete: ${successCount}/${results.length} steps succeeded`);

        console.log('=== DISSECT SELECTED COMPLETE ===\n');
    } catch (error) {
      console.error('Dissection failed:', error);
      // Remove placeholder nodes on error and reset master node state
      setNodes((nds) =>
        nds.filter((node) => {
          // Remove placeholder step nodes for this breakdown
          if (node.id.startsWith(`${breakdownId}-step-`)) {
            return false;
          }
          return true;
        }).map((node) => {
          if (node.id === nodeId) {
            return { ...node, data: { ...node.data, isDissecting: false } };
          }
          return node;
        })
      );
      // Remove placeholder edges
      setEdges((eds) =>
        eds.filter((edge) => !edge.target.startsWith(`${breakdownId}-step-`))
      );
    }
  };

  /**
   * Step 2b: The Logic to "Dissect" the entire craft
   */
  const handleDissect = async (nodeId: string, imageUrl: string) => {
    if (readOnly) return;

    // CRITICAL: Use nodesRef to get latest nodes (avoids stale closure issue)
    const currentNodes = nodesRef.current;
    const masterNode = currentNodes.find(n => n.id === nodeId);
    const category = (masterNode?.data?.category as CraftCategory) || CraftCategory.PAPERCRAFT;
    const promptContext = masterNode?.data?.label as string || "Unknown craft";

    console.log('=== DISSECT FULL CRAFT START ===');
    console.log('Node ID:', nodeId);
    console.log('Master Node found:', !!masterNode);
    console.log('Master Node Data:', masterNode?.data);
    console.log('Category extracted:', category);
    console.log('Prompt Context:', promptContext);
    console.log('Total nodes in ref:', currentNodes.length);

    if (!masterNode) {
        console.error('Master node not found');
        return;
    }

    // Generate unique prefix for this breakdown to avoid duplicate node IDs
    // This allows multiple breakdowns from the same master node
    const breakdownId = `${nodeId}-${Date.now()}`;

    // 1. Create placeholder nodes IMMEDIATELY (before any API calls)
    // This gives instant visual feedback like the pattern sheet does
    const DEFAULT_STEP_COUNT = 4; // Most breakdowns have 4 steps
    const placeholderNodes: Node[] = [];
    const placeholderEdges: Edge[] = [];

    // Calculate positions for placeholder nodes
    // Position steps directly to the right of the master image, vertically centered
    const masterNodeHeight = (masterNode.data?.height as number) || 400;
    const gapY = 500;
    const gapX = 400;
    const totalGridHeight = 2 * gapY; // 2 rows
    const startX = masterNode.position.x + 500;
    const startY = masterNode.position.y + (masterNodeHeight / 2) - (totalGridHeight / 2);

    // Create placeholder step nodes
    for (let i = 1; i <= DEFAULT_STEP_COUNT; i++) {
        const stepNodeId = `${breakdownId}-step-${i}`;
        const col = (i - 1) % 2;
        const row = Math.floor((i - 1) / 2);

        placeholderNodes.push({
            id: stepNodeId,
            type: 'instructionNode',
            position: {
                x: startX + (col * gapX),
                y: startY + (row * gapY)
            },
            data: {
                stepNumber: i,
                title: `Step ${i}`,
                description: 'Analyzing craft structure...',
                safetyWarning: undefined,
                isGeneratingImage: true,
                imageUrl: undefined
            }
        });

        placeholderEdges.push({
            id: `e-${nodeId}-${stepNodeId}`,
            source: nodeId,
            sourceHandle: 'source-right',
            target: stepNodeId,
            targetHandle: 'target-left',
            animated: true,
            style: { stroke: '#10b981', strokeWidth: 2 },
        });
    }

    // Add placeholders immediately and set loading state
    setNodes((nds) => {
        const updatedNodes = nds.map((node) => {
            if (node.id === nodeId) {
                return { ...node, data: { ...node.data, isDissecting: true } };
            }
            return node;
        });
        return [...updatedNodes, ...placeholderNodes];
    });
    setEdges((eds) => [...eds, ...placeholderEdges]);

    try {
        // 2. Call Gemini API to get TEXT instructions
        console.log('\n🔍 === AI DISSECTION PHASE ===');
        console.log('Craft to dissect:', promptContext);
        console.log('Sending to AI for instructions...\n');

        const dissection = await dissectCraft(imageUrl, promptContext);

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
        console.log('=== AI OUTPUT DEBUG END ===\n');

        // 3. Create materials node now that we have the data
        const matNodeId = `${nodeId}-mat`;
        const materialNode: Node = {
            id: matNodeId,
            type: 'materialNode',
            position: { x: masterNode.position.x - 400, y: masterNode.position.y },
            data: { items: dissection.materials },
        };
        const materialEdge: Edge = {
            id: `e-${nodeId}-${matNodeId}`,
            source: nodeId,
            sourceHandle: 'source-left',
            target: matNodeId,
            targetHandle: 'target-right',
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
        };

        // 4. Update placeholder nodes with actual step data OR remove extras if fewer steps
        setNodes((nds) => {
            let updatedNodes = nds.map((node) => {
                // Update master node
                if (node.id === nodeId) {
                    return { ...node, data: { ...node.data, isDissecting: false, isDissected: true } };
                }
                // Update existing placeholder step nodes with actual data
                const stepMatch = node.id.match(new RegExp(`^${breakdownId}-step-(\\d+)$`));
                if (stepMatch) {
                    const stepNum = parseInt(stepMatch[1], 10);
                    const stepData = dissection.steps.find(s => s.stepNumber === stepNum);
                    if (stepData) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                title: stepData.title,
                                description: stepData.description,
                                safetyWarning: stepData.safetyWarning,
                                // Keep isGeneratingImage true - images will be generated next
                            }
                        };
                    } else {
                        // This placeholder is extra (more placeholders than actual steps)
                        return null; // Mark for removal
                    }
                }
                return node;
            }).filter((node): node is Node => node !== null);

            // Add any additional steps beyond the default placeholder count
            dissection.steps.forEach((step) => {
                if (step.stepNumber > DEFAULT_STEP_COUNT) {
                    const stepNodeId = `${breakdownId}-step-${step.stepNumber}`;
                    const col = (step.stepNumber - 1) % 2;
                    const row = Math.floor((step.stepNumber - 1) / 2);
                    updatedNodes.push({
                        id: stepNodeId,
                        type: 'instructionNode',
                        position: {
                            x: startX + (col * gapX),
                            y: startY + (row * gapY) - ((dissection.steps.length * gapY) / 4)
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
                }
            });

            // Add materials node
            return [...updatedNodes, materialNode];
        });

        // Update edges - remove extras and add materials edge + any new step edges
        setEdges((eds) => {
            // Filter out edges for removed placeholder steps
            const validStepNums = dissection.steps.map(s => s.stepNumber);
            const filteredEdges = eds.filter((edge) => {
                const stepMatch = edge.target.match(new RegExp(`^${breakdownId}-step-(\\d+)$`));
                if (stepMatch) {
                    const stepNum = parseInt(stepMatch[1], 10);
                    return validStepNums.includes(stepNum);
                }
                return true;
            });

            // Add edges for any new steps beyond default count
            const newStepEdges: Edge[] = [];
            dissection.steps.forEach((step) => {
                if (step.stepNumber > DEFAULT_STEP_COUNT) {
                    newStepEdges.push({
                        id: `e-${nodeId}-${breakdownId}-step-${step.stepNumber}`,
                        source: nodeId,
                        sourceHandle: 'source-right',
                        target: `${breakdownId}-step-${step.stepNumber}`,
                        targetHandle: 'target-left',
                        animated: true,
                        style: { stroke: '#10b981', strokeWidth: 2 },
                    });
                }
            });

            return [...filteredEdges, materialEdge, ...newStepEdges];
        });

        // 5. Generate ALL step images in PARALLEL for faster generation
        console.log('\n=== IMAGE GENERATION PHASE ===');
        console.log('Using category:', category);
        console.log('Target craft:', promptContext);
        console.log('Total steps:', dissection.steps.length);
        console.log('All steps:', dissection.steps.map(s => `${s.stepNumber}: ${s.title}`));
        console.log('Format: Multi-Panel with 1K resolution for all steps');
        console.log(`\n🚀 Generating ${dissection.steps.length} step images IN PARALLEL...`);

        const stepGenerationPromises = dissection.steps.map(async (step) => {
          const stepNodeId = `${breakdownId}-step-${step.stepNumber}`;

          console.log(`🎨 Starting Step ${step.stepNumber}: ${step.title}`);
          console.log(`   Target craft: ${promptContext} | Category: ${category}`);

          try {
            // Generate image with full image as reference to match exact style/appearance
            const stepImageUrl = await generateStepImage(
              imageUrl, // Use full image as style reference
              `${step.title}: ${step.description}`,
              category,
              undefined, // No specific object label for full craft dissection
              step.stepNumber // Pass step number
            );

            console.log(`✅ Step ${step.stepNumber} complete`);

            // Update node with generated image
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id === stepNodeId) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      imageUrl: stepImageUrl,
                      isGeneratingImage: false
                    }
                  };
                }
                return node;
              })
            );

            return { stepNumber: step.stepNumber, success: true };
          } catch (error) {
            console.error(`❌ Step ${step.stepNumber} failed:`, error);
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

            return { stepNumber: step.stepNumber, success: false, error };
          }
        });

        // Wait for all step images to complete (success or failure)
        const results = await Promise.all(stepGenerationPromises);
        const successCount = results.filter(r => r.success).length;
        console.log(`\n📊 Parallel generation complete: ${successCount}/${results.length} steps succeeded`);

        console.log('=== DISSECT FULL CRAFT COMPLETE ===\n');
    } catch (error) {
        console.error("Dissection error", error);
        // Remove placeholder nodes and reset master node state
        setNodes((nds) =>
            nds.filter((node) => {
              // Remove placeholder step nodes for this breakdown
              if (node.id.startsWith(`${breakdownId}-step-`)) {
                return false;
              }
              return true;
            }).map((node) => {
              if (node.id === nodeId) {
                return { ...node, data: { ...node.data, isDissecting: false } };
              }
              return node;
            })
          );
        // Remove placeholder edges
        setEdges((eds) =>
            eds.filter((edge) => !edge.target.startsWith(`${breakdownId}-step-`))
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
        onDissectSelected: handleDissectSelected,
        onSelect: handleMasterNodeSelect,
        onDeselect: handleMasterNodeDeselect,
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

  /**
   * Create placeholder master node when generation starts
   */
  const handleStartGeneration = useCallback((nodeId: string, prompt: string, category: CraftCategory) => {
    if (readOnly) return;

    // Place node at fixed position (0, 0) and pan canvas to it
    // This avoids the "pop to center" effect caused by position recalculation
    const nodeWidth = 500;
    const nodeHeight = 550;

    const newNode: Node = {
      id: nodeId,
      type: 'masterNode',
      position: { x: 0, y: 0 },
      data: {
        label: prompt,
        imageUrl: '',
        category,
        onDissect: handleDissect,
        onDissectSelected: handleDissectSelected,
        onSelect: handleMasterNodeSelect,
        onDeselect: handleMasterNodeDeselect,
        isDissecting: false,
        isDissected: false,
        isGeneratingImage: true,
      },
    };

    setNodes((nds) => [...nds, newNode]);

    // Pan canvas to center on the node (accounting for node dimensions)
    // setCenter targets the center point, so offset by half node size
    setCenter(nodeWidth / 2, nodeHeight / 2, { zoom: 1, duration: 300 });
  }, [setNodes, readOnly, handleDissect, handleDissectSelected, handleMasterNodeSelect, handleMasterNodeDeselect, setCenter]);

  /**
   * Update placeholder node when generation completes
   */
  const handleGenerationComplete = useCallback((nodeId: string, imageUrl: string) => {
    // First, extract data from the node we need to save
    let projectToSave: Parameters<typeof saveProject>[0] | null = null;

    setNodes((nds) => {
      const updatedNodes = nds.map((n) => {
        if (n.id === nodeId && n.type === 'masterNode') {
          // Prepare project data (but don't save yet - would cause setState during render)
          const prompt = n.data.label as string;
          const category = n.data.category as CraftCategory;
          const updatedNode = {
            ...n,
            data: {
              ...n.data,
              imageUrl,
              isGeneratingImage: false,
            },
          };

          projectToSave = {
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
              nodes: [updatedNode],
              edges: [],
              viewport: { x: 0, y: 0, zoom: 1 }
            }
          };

          return updatedNode;
        }
        return n;
      });
      return updatedNodes;
    });

    // Save project after state update using setTimeout to avoid setState during render
    setTimeout(() => {
      if (projectToSave) {
        saveProject(projectToSave);
      }
    }, 0);
  }, [setNodes, saveProject]);

  /**
   * Remove placeholder node on generation error
   */
  const handleGenerationError = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
  }, [setNodes]);

  /**
   * Handle image-to-craft conversion
   */
  const handleImageToCraftConvert = useCallback(async () => {
    if (readOnly) return;

    // Validate category selection
    if (!craftStyleMenu.selectedCategory) {
      console.error('No category selected');
      return;
    }

    // Get the selected ImageNode
    const selectedNode = nodes.find(n => n.id === craftStyleMenu.nodeId);
    if (!selectedNode || selectedNode.type !== 'imageNode') {
      console.error('Selected node not found or not an image node');
      return;
    }

    const imageUrl = selectedNode.data.imageUrl as string;
    const category = craftStyleMenu.selectedCategory;

    // Set loading state
    setIsConvertingImage(true);

    try {
      // Call Gemini API to generate craft image
      const craftImageUrl = await generateCraftFromImage(imageUrl, category);

      // Create MasterNode with generated craft image
      // Position it near the original ImageNode
      const masterNodeId = `master-${Date.now()}`;
      const newMasterNode: Node = {
        id: masterNodeId,
        type: 'masterNode',
        position: {
          x: selectedNode.position.x + 400, // Position to the right of the image
          y: selectedNode.position.y,
        },
        data: {
          label: `${category} Craft`,
          imageUrl: craftImageUrl,
          category,
          onDissect: handleDissect,
          onContextMenu: handleNodeContextMenu,
          onDissectSelected: handleDissectSelected,
          onSelect: handleMasterNodeSelect,
          onDeselect: handleMasterNodeDeselect,
          isDissecting: false,
          isDissected: false,
        },
      };

      // Add the new master node
      setNodes((nds) => [...nds, newMasterNode]);

      // Close the menu
      handleCloseCraftStyleMenu();

      // Create and save new project
      const newProject = {
        id: `project-${Date.now()}`,
        name: `${category} Craft from Image`,
        category,
        prompt: `Converted from uploaded image`,
        masterImageUrl: craftImageUrl,
        dissection: null,
        stepImages: new Map(),
        createdAt: new Date(),
        lastModified: new Date(),
        canvasState: {
          nodes: [...nodes, newMasterNode],
          edges: edges,
          viewport: { x: 0, y: 0, zoom: 1 }
        }
      };

      saveProject(newProject);

    } catch (error) {
      console.error('Image-to-craft conversion failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to convert image to craft');
    } finally {
      // Clear loading state
      setIsConvertingImage(false);
    }
  }, [
    readOnly,
    craftStyleMenu,
    nodes,
    edges,
    setNodes,
    setActiveTool,
    handleCloseCraftStyleMenu,
    handleDissect,
    handleNodeContextMenu,
    handleDissectSelected,
    saveProject,
  ]);

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
          onFitView={() => fitView({ padding: 0.2 })}
        />
      )}

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

      {/* Unified Image Node Menu (Download, Share, Convert) */}
      <ImageNodeUnifiedMenu
        visible={craftStyleMenu.visible}
        position={craftStyleMenu.position}
        selectedCategory={craftStyleMenu.selectedCategory}
        onSelectCategory={handleCraftCategorySelect}
        onConvert={handleImageToCraftConvert}
        onDownload={handleDownloadImageNode}
        onShare={handleShareImageNode}
        onClose={handleCloseCraftStyleMenu}
        onMouseEnter={handleMenuMouseEnter}
        onMouseLeave={handleMenuMouseLeave}
        isConverting={isConvertingImage}
      />

      {/* Master Node Actions Menu */}
      <MasterNodeActionsMenu
        visible={masterNodeActionsMenu.visible}
        position={masterNodeActionsMenu.position}
        category={masterNodeActionsMenu.category}
        magicSelectEnabled={magicSelectEnabledMap[masterNodeActionsMenu.nodeId ?? ''] ?? false}
        onToggleMagicSelect={handleToggleMagicSelect}
        onCreateSVGPattern={handleCreateSVGPattern}
        onCreateStepInstructions={handleCreateStepInstructions}
        onCreateTurnTable={handleCreateTurnTable}
        onDownload={handleDownloadImage}
        onShare={handleShareImage}
        onMouseEnter={handleMenuMouseEnter}
        onMouseLeave={handleMenuMouseLeave}
      />

      <div
        className={`w-full h-full transition-opacity duration-0 ${isCanvasReady ? 'opacity-100' : 'opacity-0'}`}
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
          defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
          className={`bg-slate-950 ${getToolCursor(activeTool)}`}
          nodesDraggable={!readOnly && (activeTool === 'select' || activeTool === 'hand')}
          nodesConnectable={!readOnly && (activeTool === 'select' || activeTool === 'hand')}
          elementsSelectable={!readOnly && (activeTool === 'select' || activeTool === 'hand')}
          panOnDrag={!drawingMode && activeTool === 'hand'}
          selectionOnDrag={!readOnly && activeTool === 'select'}
          minZoom={0.1}
          maxZoom={8}
        >
          <Background
              color="#334155"
              variant={BackgroundVariant.Dots}
              gap={24}
              size={2}
          />
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
      {!readOnly && (
        <ChatInterface
          onGenerate={handleGenerate}
          onStartGeneration={handleStartGeneration}
          onGenerationComplete={handleGenerationComplete}
          onGenerationError={handleGenerationError}
        />
      )}
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
