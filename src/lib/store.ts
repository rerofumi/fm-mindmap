import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { MindMapNode, MindMapNodeData, MindMapEdge, ChatMessage, ViewMode } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { fetchLLMResponse, generateMindmapFromChat, generateMindmapFromText } from './api';
import { CHAT_RESPONSE_SYSTEM_PROMPT, createTitleSummarizationPrompt } from './prompts';
import { defaultModel } from './modelConfig';

interface RFState {
  // Mindmap state
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  selectedNodeId: string | null;

  // View state
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;

  // In-mindmap chat sidebar
  isChatSidebarOpen: boolean;
  chatHistory: ChatMessage[];

  // Standalone chat mode
  standaloneChatHistory: ChatMessage[];
  isStandaloneChatLoading: boolean;
  isMindmapGenerating: boolean;
  clearStandaloneChat: () => void;
  sendStandaloneMessage: (content: string) => Promise<void>;
  generateMindmapFromStandaloneChat: () => Promise<void>;
  generateMindmapFromTextInput: (text: string) => Promise<void>;

  // Actions
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

  // View state
  viewMode: 'mindmap',
  setViewMode: (mode) => set({ viewMode: mode }),
  selectedModel: import.meta.env.VITE_OPENROUTER_MODEL || defaultModel,
  setSelectedModel: (model) => set({ selectedModel: model }),

  // In-mindmap chat sidebar
  isChatSidebarOpen: false,
  chatHistory: [],

  // Standalone chat
  standaloneChatHistory: [],
  isStandaloneChatLoading: false,
  isMindmapGenerating: false,
  clearStandaloneChat: () => set({ standaloneChatHistory: [] }),
  sendStandaloneMessage: async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const current = get().standaloneChatHistory;
    const model = get().selectedModel;
    set({ standaloneChatHistory: [...current, userMsg], isStandaloneChatLoading: true });
    try {
      const messages = [...current, userMsg].map(m => ({ role: m.role, content: m.content }));
      const answer = await fetchLLMResponse(messages as any, model);
      const assistantMsg: ChatMessage = { role: 'assistant', content: answer };
      set((s) => ({ standaloneChatHistory: [...s.standaloneChatHistory, assistantMsg] }));
    } catch (e) {
      showError('Failed to send message.');
    } finally {
      set({ isStandaloneChatLoading: false });
    }
  },
  generateMindmapFromStandaloneChat: async () => {
    const history = get().standaloneChatHistory;
    if (!history.length) {
      showError('Chat is empty. Send a message first.');
      return;
    }
    const model = get().selectedModel;
    set({ isMindmapGenerating: true });
    try {
      const result = await generateMindmapFromChat(history, model);
      const idSet = new Set(result.nodes.map(n => n.id));
      // Build maps for quick lookup
      const nodeMap = new Map(result.nodes.map(n => [n.id, n] as const));
      // Determine roots (nodes that are not targets)
      const targets = new Set(result.edges.map(e => e.target));
      const roots = result.nodes.filter(n => !targets.has(n.id));
      // Create MindMapNode objects
      const nodes: MindMapNode[] = result.nodes.map((n, idx) => ({
        id: String(n.id),
        type: roots.some(r => r.id === n.id) ? 'root' : 'normal',
        position: { x: 0, y: idx * 80 },
        data: {
          title: n.title,
          color: n.color || '#94a3b8',
          isRoot: roots.some(r => r.id === n.id),
          question: '',
          answer: '',
          memo: '',
        },
      }));
      // Create edges
      const edges: MindMapEdge[] = result.edges
        .filter(e => idSet.has(e.source) && idSet.has(e.target))
        .map(e => ({
          id: `e-${e.source}-${e.target}`,
          source: String(e.source),
          target: String(e.target),
          style: { stroke: (nodeMap.get(e.target)?.color) || '#94a3b8', strokeWidth: 2 },
        }));

      set({ nodes, edges });
      get().alignNodes();
      set({ viewMode: 'mindmap' });
      showSuccess('Mind map generated from chat.');
    } catch (e: any) {
      showError(e?.message || 'Failed to generate mind map.');
    } finally {
      set({ isMindmapGenerating: false });
    }
  },
  generateMindmapFromTextInput: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      showError('Input text is empty.');
      return;
    }
    const model = get().selectedModel;
    set({ isMindmapGenerating: true });
    try {
      const result = await generateMindmapFromText(trimmed, model);
      const idSet = new Set(result.nodes.map(n => n.id));
      // Build maps for quick lookup
      const nodeMap = new Map(result.nodes.map(n => [n.id, n] as const));
      // Determine roots (nodes that are not targets)
      const targets = new Set(result.edges.map(e => e.target));
      const roots = result.nodes.filter(n => !targets.has(n.id));
      // Create MindMapNode objects
      const nodes: MindMapNode[] = result.nodes.map((n, idx) => ({
        id: String(n.id),
        type: roots.some(r => r.id === n.id) ? 'root' : 'normal',
        position: { x: 0, y: idx * 80 },
        data: {
          title: n.title,
          color: n.color || '#94a3b8',
          isRoot: roots.some(r => r.id === n.id),
          question: '',
          answer: '',
          memo: '',
        },
      }));
      // Create edges
      const edges: MindMapEdge[] = result.edges
        .filter(e => idSet.has(e.source) && idSet.has(e.target))
        .map(e => ({
          id: `e-${e.source}-${e.target}`,
          source: String(e.source),
          target: String(e.target),
          style: { stroke: (nodeMap.get(e.target)?.color) || '#94a3b8', strokeWidth: 2 },
        }));

      set({ nodes, edges });
      get().alignNodes();
      set({ viewMode: 'mindmap' });
      showSuccess('Mind map generated from text.');
    } catch (e: any) {
      showError(e?.message || 'Failed to generate mind map from text.');
    } finally {
      set({ isMindmapGenerating: false });
    }
  },

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
      const messages = [
        { role: 'system' as const, content: CHAT_RESPONSE_SYSTEM_PROMPT },
        ...context,
        userMessage
      ];
      const model = state.selectedModel;
      const answer = await fetchLLMResponse(messages, model);

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
      const titlePrompt = createTitleSummarizationPrompt(question, answer);
      const summarizedTitle = await fetchLLMResponse([{ role: 'user', content: titlePrompt }], model);
      
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