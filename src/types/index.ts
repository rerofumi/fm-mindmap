import type { Node, Edge } from 'reactflow';

export type ViewMode = 'mindmap' | 'chat';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MindMapNodeData {
  title: string;
  color: string;
  isRoot: boolean;
  question: string;
  answer: string;
  memo: string;
}

export type MindMapNode = Node<MindMapNodeData>;
export type MindMapEdge = Edge;
