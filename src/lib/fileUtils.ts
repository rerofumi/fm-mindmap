import { MindMapNode, MindMapEdge } from '@/types';

const generateMermaidGraph = (nodes: MindMapNode[], edges: MindMapEdge[]): string => {
  const nodeLines = nodes.map(node => `  ${node.id}["${node.data.title.replace(/"/g, '#quot;')}"]`);
  const edgeLines = edges.map(edge => `  ${edge.source} --> ${edge.target}`);
  return `\`\`\`mermaid
graph TD
${nodeLines.join('\n')}
${edgeLines.join('\n')}
\`\`\``;
};

export const serializeMindMap = (nodes: MindMapNode[], edges: MindMapEdge[]): string => {
  const mermaidGraph = generateMermaidGraph(nodes, edges);
  const jsonData = JSON.stringify({ nodes, edges }, null, 2);

  return `# MindMap Export

## Preview
${mermaidGraph}

---
## Data
\`\`\`json
${jsonData}
\`\`\`
`;
};

export const deserializeMindMap = (markdownContent: string): { nodes: MindMapNode[], edges: MindMapEdge[] } | null => {
  const jsonRegex = /```json\n([\s\S]*?)\n```/;
  const match = markdownContent.match(jsonRegex);

  if (match && match[1]) {
    try {
      const data = JSON.parse(match[1]);
      if (data && Array.isArray(data.nodes) && Array.isArray(data.edges)) {
        return data;
      }
    } catch (error) {
      console.error("Failed to parse JSON data from file", error);
      return null;
    }
  }
  return null;
};

export const downloadFile = (content: string, filename: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};