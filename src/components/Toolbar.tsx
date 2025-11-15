import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, GitBranchPlus, Network, Save, FolderOpen, MessageSquare } from 'lucide-react';
import { useRef } from 'react';
import { downloadFile, serializeMindMap, deserializeMindMap } from '@/lib/fileUtils';

export function Toolbar() {
  const addRootNode = useStore((state) => state.addRootNode);
  const addChildNode = useStore((state) => state.addChildNode);
  const deleteSelectedNode = useStore((state) => state.deleteSelectedNode);
  const selectedNodeId = useStore((state) => state.selectedNodeId);
  const alignNodes = useStore((state) => state.alignNodes);
  const toggleChatSidebar = useStore((state) => state.toggleChatSidebar);
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const markdownContent = serializeMindMap(nodes, edges);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(markdownContent, `mindmap-${date}.md`, 'text/markdown');
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="border-b bg-background p-2 flex items-center gap-2 flex-wrap">
      <Button onClick={toggleChatSidebar} size="sm" variant="outline">
        <MessageSquare className="mr-2 h-4 w-4" /> Context
      </Button>
      <Button onClick={addRootNode} size="sm">
        <Plus className="mr-2 h-4 w-4" /> Root Node
      </Button>
      <Button onClick={addChildNode} disabled={!selectedNodeId} size="sm">
        <GitBranchPlus className="mr-2 h-4 w-4" /> Add Child
      </Button>
      <Button onClick={deleteSelectedNode} disabled={!selectedNodeId} variant="destructive" size="sm">
        <Trash2 className="mr-2 h-4 w-4" /> Delete Node
      </Button>
      <Button onClick={alignNodes} size="sm" variant="outline">
        <Network className="mr-2 h-4 w-4" /> Align Nodes
      </Button>
      <div className="flex-grow" />
      <Button onClick={handleSave} size="sm" variant="outline">
        <Save className="mr-2 h-4 w-4" /> Save
      </Button>
      <Button onClick={handleLoadClick} size="sm" variant="outline">
        <FolderOpen className="mr-2 h-4 w-4" /> Load
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (event) => {
            const content = event.target?.result as string;
            const data = deserializeMindMap(content);
            if (data) {
              useStore.getState().loadState(data);
            }
          };
          reader.readAsText(file);
          e.target.value = '';
        }}
        accept=".md,text/markdown"
        className="hidden"
      />
    </div>
  );
}
