import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { MindMapNode, MindMapNodeData, MindMapEdge, ChatMessage } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { fetchLLMResponse } from './api';

interface RFState {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  selectedNodeId: string | null;
  isChatSidebarOpen: boolean;
  chatHistory: ChatMessage[];
  setSelectedNodeId: (id: string | null) => void;
  toggleChatSidebar: () => void;
  addRootNode: () => void;
  addChildNode: () => void;
  addMultipleChildNodes: (titles: string[]) => void;
  deleteSelectedNode: () => void;
  updateSelectedNode: (data: Partial<MindMapNodeData>) => void;
  updateNodeData: (nodeId: string, data: Partial<MindMapNodeData>) => void;
  updateNodes: (nodes: MindMapNode[]) => void;
  updateEdges: (edges: MindMapEdge[]) => void;
  applyColorToDescendants: () => void;
  alignNodes: () => void;
  getContext: (nodeId: string, includeCurrentNode?: boolean) => ChatMessage[];
  loadState: (newState: { nodes: MindMapNode[], edges: MindMapEdge[] }) => void;
  chatAndCreateNode: (question: string) => Promise<void>;
}

export const useStore = create<RFState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isChatSidebarOpen: false,
  chatHistory: [],

  setSelectedNodeId: (id) => {
    if (id) {
      const context = get().getContext(id, true);
      set({ selectedNodeId: id, chatHistory: context });
    } else {
      set({ selectedNodeId: null, chatHistory: [] });
    }
  },
  toggleChatSidebar: () => set((state) => ({ isChatSidebarOpen: !state.isChatSidebarOpen })),

  updateNodes: (nodes) => set({ nodes }),
  
  updateEdges: (edges) => set({ edges }),

  addRootNode: () => {
    const state = get();
    const allTitles = new Set(state.nodes.map(n => n.data.title));
    let newTitle = 'Root Node';
    let counter = 2;
    while (allTitles.has(newTitle)) {
      newTitle = `Root Node (${counter})`;
      counter++;
    }

    const newId = nanoid();
    const newNode: MindMapNode = {
      id: newId,
      type: 'root',
      position: { x: 400, y: 100 },
      data: { title: newTitle, color: '#ff6b6b', isRoot: true, question: '', answer: '', memo: '' },
    };
    set({
      nodes: [...state.nodes, newNode],
      selectedNodeId: newId,
    });
  },

  addChildNode: () => {
    const state = get();
    const parentId = state.selectedNodeId;
    if (!parentId) return;

    const parentNode = state.nodes.find((n) => n.id === parentId);
    if (!parentNode) return;

    const allTitles = new Set(state.nodes.map(n => n.data.title));
    let newTitle = 'New Node';
    let counter = 2;
    while (allTitles.has(newTitle)) {
      newTitle = `New Node (${counter})`;
      counter++;
    }

    const newId = nanoid();
    const newNode: MindMapNode = {
      id: newId,
      type: 'normal',
      position: {
        x: parentNode.position.x,
        y: parentNode.position.y + 100,
      },
      data: { title: newTitle, color: parentNode.data.color, isRoot: false, question: '', answer: '', memo: '' },
    };

    const newEdge: MindMapEdge = {
      id: `e-${parentId}-${newId}`,
      source: parentId,
      target: newId,
      style: { stroke: newNode.data.color, strokeWidth: 2 },
    };

    set({
      nodes: [...state.nodes, newNode],
      edges: [...state.edges, newEdge],
      selectedNodeId: newId,
    });
  },

  addMultipleChildNodes: (titles) => {
    const state = get();
    const parentId = state.selectedNodeId;
    if (!parentId) return;

    const parentNode = state.nodes.find((n) => n.id === parentId);
    if (!parentNode) return;

    const allTitles = new Set(state.nodes.map(n => n.data.title));
    const newNodes: MindMapNode[] = [];
    const newEdges: MindMapEdge[] = [];

    titles.forEach((title, index) => {
      let newTitle = title.trim();
      let counter = 2;
      while (allTitles.has(newTitle)) {
        newTitle = `${title.trim()} (${counter})`;
        counter++;
      }
      allTitles.add(newTitle);

      const newId = nanoid();
      const newNode: MindMapNode = {
        id: newId,
        type: 'normal',
        position: {
          x: parentNode.position.x + 50,
          y: parentNode.position.y + 100 + (index * 80),
        },
        data: { title: newTitle, color: parentNode.data.color, isRoot: false, question: '', answer: '', memo: '' },
      };
      newNodes.push(newNode);

      const newEdge: MindMapEdge = {
        id: `e-${parentId}-${newId}`,
        source: parentId,
        target: newId,
        style: { stroke: newNode.data.color, strokeWidth: 2 },
      };
      newEdges.push(newEdge);
    });

    set({
      nodes: [...state.nodes, ...newNodes],
      edges: [...state.edges, ...newEdges],
    });
    showSuccess(`${titles.length} new nodes have been added.`);
  },

  deleteSelectedNode: () => {
    const state = get();
    const selectedId = state.selectedNodeId;
    if (!selectedId) return;

    const nodesToDelete = new Set<string>([selectedId]);

    const findChildren = (nodeId: string) => {
      const childrenEdges = state.edges.filter((edge) => edge.source === nodeId);
      childrenEdges.forEach((edge) => {
        nodesToDelete.add(edge.target);
        findChildren(edge.target);
      });
    };

    findChildren(selectedId);

    set({
      nodes: state.nodes.filter((node) => !nodesToDelete.has(node.id)),
      edges: state.edges.filter((edge) => !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target)),
      selectedNodeId: null,
    });
  },

  updateSelectedNode: (data) => {
    const selectedId = get().selectedNodeId;
    if (!selectedId) return;

    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === selectedId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      }),
      edges: data.color
        ? state.edges.map((edge) => {
            if (edge.target === selectedId) {
              return { ...edge, style: { ...edge.style, stroke: data.color } };
            }
            return edge;
          })
        : state.edges,
    }));
  },

  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      }),
    }));
  },

  applyColorToDescendants: () => {
    const { selectedNodeId, nodes, edges } = get();
    if (!selectedNodeId) return;

    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    if (!selectedNode) return;

    const newColor = selectedNode.data.color;
    const descendantIds = new Set<string>();
    const queue: string[] = [selectedNodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      if (currentId !== selectedNodeId) {
        descendantIds.add(currentId);
      }

      const children = edges
        .filter(edge => edge.source === currentId)
        .map(edge => edge.target);
      
      for (const childId of children) {
        if (!visited.has(childId)) {
          queue.push(childId);
        }
      }
    }

    if (descendantIds.size === 0) {
      showSuccess("No child nodes to apply color to.");
      return;
    }

    const updatedNodes = nodes.map(node => {
      if (descendantIds.has(node.id)) {
        return { ...node, data: { ...node.data, color: newColor } };
      }
      return node;
    });

    const updatedEdges = edges.map(edge => {
      if (descendantIds.has(edge.target)) {
        return { ...edge, style: { ...edge.style, stroke: newColor } };
      }
      return edge;
    });

    set({ nodes: updatedNodes, edges: updatedEdges });
    showSuccess(`Applied color to ${descendantIds.size} child node(s).`);
  },

  alignNodes: () => {
    const { nodes, edges } = get();
    if (nodes.length < 2) return;

    const xSpacing = 250;
    const ySpacing = 100;

    const childrenMap = new Map<string, string[]>();
    const parentMap = new Map<string, string>();
    edges.forEach(edge => {
      if (!childrenMap.has(edge.source)) {
        childrenMap.set(edge.source, []);
      }
      childrenMap.get(edge.source)!.push(edge.target);
      parentMap.set(edge.target, edge.source);
    });

    const rootNodes = nodes.filter(node => !parentMap.has(node.id));
    
    const subtreeHeightCache = new Map<string, number>();
    function getSubtreeHeight(nodeId: string): number {
      if (subtreeHeightCache.has(nodeId)) {
        return subtreeHeightCache.get(nodeId)!;
      }
      const children = childrenMap.get(nodeId) || [];
      if (children.length === 0) {
        subtreeHeightCache.set(nodeId, 1);
        return 1;
      }
      const height = children.reduce((sum, childId) => sum + getSubtreeHeight(childId), 0);
      subtreeHeightCache.set(nodeId, height);
      return height;
    }

    nodes.forEach(node => getSubtreeHeight(node.id));

    const newPositions = new Map<string, { x: number; y: number }>();
    let currentY = 0;

    function layout(nodeId: string, depth: number, startY: number) {
      const children = childrenMap.get(nodeId) || [];
      const subtreeHeight = getSubtreeHeight(nodeId);
      
      const nodeY = startY + (subtreeHeight * ySpacing) / 2 - ySpacing / 2;
      const nodeX = depth * xSpacing;
      newPositions.set(nodeId, { x: nodeX, y: nodeY });

      let childStartY = startY;
      for (const childId of children) {
        layout(childId, depth + 1, childStartY);
        childStartY += getSubtreeHeight(childId) * ySpacing;
      }
    }

    for (const root of rootNodes) {
      if (!newPositions.has(root.id)) {
        layout(root.id, 0, currentY);
        currentY += getSubtreeHeight(root.id) * ySpacing + ySpacing;
      }
    }

    const updatedNodes = nodes.map(node => {
      const newPos = newPositions.get(node.id);
      if (newPos) {
        return { ...node, position: newPos };
      }
      return node;
    });

    set({ nodes: updatedNodes });
    showSuccess("Nodes have been aligned.");
  },

  getContext: (nodeId, includeCurrentNode = false) => {
    const { nodes, edges } = get();
    const parentMap = new Map<string, string>();
    edges.forEach(edge => {
      parentMap.set(edge.target, edge.source);
    });

    let currentNodeId: string | undefined = nodeId;
    const path: MindMapNode[] = [];

    while (currentNodeId) {
      const node = nodes.find(n => n.id === currentNodeId);
      if (node) {
        path.push(node);
      }
      currentNodeId = parentMap.get(currentNodeId);
    }
    
    path.reverse();

    let pathForContext = path;
    if (!includeCurrentNode) {
      pathForContext = path.slice(0, -1);
    }

    const context: ChatMessage[] = [];
    for (const node of pathForContext) {
      const { question, answer } = node.data;
      if (question && question.trim() !== '') {
        context.push({ role: 'user', content: question });
      }
      if (answer && answer.trim() !== '') {
        context.push({ role: 'assistant', content: answer });
      }
    }
    return context;
  },

  loadState: (newState) => {
    set({
      nodes: newState.nodes,
      edges: newState.edges,
      selectedNodeId: null,
    });
    showSuccess("Mind map loaded successfully.");
  },

  chatAndCreateNode: async (question) => {
    const state = get();
    const parentId = state.selectedNodeId;
    if (!parentId) {
      showError("Please select a parent node first.");
      return;
    }
    const parentNode = state.nodes.find((n) => n.id === parentId);
    if (!parentNode) return;

    // 1. Add user input to chat history
    const userMessage: ChatMessage = { role: 'user', content: question };
    set({ chatHistory: [...state.chatHistory, userMessage] });

    try {
      // 2. Fetch LLM response
      const context = state.getContext(parentId, true);
      const messages = [...context, userMessage];
      const answer = await fetchLLMResponse(messages);

      // 3. Add LLM response to chat history
      const assistantMessage: ChatMessage = { role: 'assistant', content: answer };
      set((s) => ({ chatHistory: [...s.chatHistory, assistantMessage] }));

      // 4 & 5. Create child node with Q&A
      const allTitles = new Set(state.nodes.map(n => n.data.title));
      const newId = nanoid();
      const newNode: MindMapNode = {
        id: newId,
        type: 'normal',
        position: {
          x: parentNode.position.x,
          y: parentNode.position.y + 120,
        },
        data: {
          title: 'New Node', // Temporary title
          color: parentNode.data.color,
          isRoot: false,
          question,
          answer,
          memo: '',
        },
      };

      const newEdge: MindMapEdge = {
        id: `e-${parentId}-${newId}`,
        source: parentId,
        target: newId,
        style: { stroke: newNode.data.color, strokeWidth: 2 },
      };

      // 6. Summarize to title
      const titlePrompt = `Summarize the following question and answer into a short, concise title (around 10-15 characters). Output only the title text.\n\nQuestion: ${question}\n\nAnswer: ${answer}`;
      const summarizedTitle = await fetchLLMResponse([{ role: 'user', content: titlePrompt }]);
      
      let newTitle = summarizedTitle.trim().replace(/^"|"$/g, '');
      if (newTitle === '') newTitle = 'Untitled';

      let counter = 2;
      while (allTitles.has(newTitle)) {
        newTitle = `${newTitle.replace(/ \(\d+\)$/, '')} (${counter})`;
        counter++;
      }
      newNode.data.title = newTitle;

      // Add new node and edge to state
      set((s) => ({
        nodes: [...s.nodes, newNode],
        edges: [...s.edges, newEdge],
      }));

      // 7. Select the new node
      get().setSelectedNodeId(newId);
      showSuccess(`New node "${newTitle}" created.`);

    } catch (error) {
      // Error is already shown by fetchLLMResponse
      // Revert chat history if API call fails
      set({ chatHistory: state.chatHistory });
    }
  },
}));