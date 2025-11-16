import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  NodeChange,
  EdgeChange,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '@/lib/store';
import RootNode from './customNodes/RootNode';
import NormalNode from './customNodes/NormalNode';
import { useCallback } from 'react';
import { showError } from '@/utils/toast';
import { MindMapNode } from '@/types';

const nodeTypes = {
  root: RootNode,
  normal: NormalNode,
};

const isCircularConnection = (sourceId: string, targetId: string, nodes: MindMapNode[], edges: Edge[]): boolean => {
  let currentNodeId: string | undefined = sourceId;
  const visited: Set<string> = new Set();

  while (currentNodeId) {
    if (visited.has(currentNodeId)) {
      // Failsafe for cycles that might already exist in a broken state
      return true;
    }
    visited.add(currentNodeId);

    // Rule 2: If we trace back and find the target, it's a circular dependency.
    if (currentNodeId === targetId) {
      return true;
    }

    const parentEdge = edges.find((edge) => edge.target === currentNodeId);

    if (!parentEdge) {
      // No parent found. Check if this node is a valid root.
      const currentNode = nodes.find(node => node.id === currentNodeId);
      
      // Rule 1: If it's a root node, it's a valid end of the chain.
      if (currentNode && currentNode.data.isRoot) {
        return false; // Not circular.
      } else {
        // Rule 3: It's not a root node but has no parent. This is an orphaned branch.
        return true; // Failsafe, consider it a problem.
      }
    }

    currentNodeId = parentEdge.source;
  }

  return false; // Should be unreachable in a valid tree structure
};

function MindMapFlow() {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const updateNodes = useStore((state) => state.updateNodes);
  const updateEdges = useStore((state) => state.updateEdges);
  const setSelectedNodeId = useStore((state) => state.setSelectedNodeId);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    updateNodes(applyNodeChanges(changes, nodes));
  }, [nodes, updateNodes]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    updateEdges(applyEdgeChanges(changes, edges));
  }, [edges, updateEdges]);

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;

    if (isCircularConnection(connection.source, connection.target, nodes, edges)) {
      showError("Circular connections are not allowed.");
      return;
    }

    const targetId = connection.target;
    const remainingEdges = edges.filter(edge => edge.target !== targetId);

    const targetNode = nodes.find(node => node.id === connection.target);
    const edgeStyle = targetNode ? { stroke: targetNode.data.color, strokeWidth: 2 } : { strokeWidth: 2 };
    
    const newEdges = addEdge({ ...connection, style: edgeStyle }, remainingEdges);
    updateEdges(newEdges);
  }, [edges, nodes, updateEdges]);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
    if (!newConnection.source || !newConnection.target) return;

    const edgesWithoutOld = edges.filter(e => e.id !== oldEdge.id);
    if (isCircularConnection(newConnection.source, newConnection.target, nodes, edgesWithoutOld)) {
      showError("Circular connections are not allowed.");
      return;
    }

    const updatedEdges = edges.map(edge => {
      if (edge.id === oldEdge.id) {
        const targetNode = nodes.find(node => node.id === newConnection.target);
        const edgeStyle = targetNode ? { stroke: targetNode.data.color, strokeWidth: 2 } : { strokeWidth: 2 };
        return { ...edge, ...newConnection, style: edgeStyle };
      }
      return edge;
    });
    updateEdges(updatedEdges);
  }, [edges, nodes, updateEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: any) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onEdgeUpdate={onEdgeUpdate}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      nodeTypes={nodeTypes}
      fitView
      className="bg-gray-100 dark:bg-gray-800"
    >
      <Controls />
      <MiniMap />
      <Background variant="dots" gap={12} size={1} />
    </ReactFlow>
  );
}

export function MindMapCanvas() {
  return (
    <ReactFlowProvider>
      <MindMapFlow />
    </ReactFlowProvider>
  );
}