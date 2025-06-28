import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, GitBranchPlus, Network, Save, FolderOpen, MessageSquare } from 'lucide-react';
import { useRef, useState } from 'react';
import { downloadFile, serializeMindMap, deserializeMindMap } from '@/lib/fileUtils';
import { MindMapNode, MindMapEdge } from '@/types';
import { showError } from '@/utils/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function Header() {
  const addRootNode = useStore((state) => state.addRootNode);
  const addChildNode = useStore((state) => state.addChildNode);
  const deleteSelectedNode = useStore((state) => state.deleteSelectedNode);
  const selectedNodeId = useStore((state) => state.selectedNodeId);
  const alignNodes = useStore((state) => state.alignNodes);
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const loadState = useStore((state) => state.loadState);
  const toggleChatSidebar = useStore((state) => state.toggleChatSidebar);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [loadedData, setLoadedData] = useState<{ nodes: MindMapNode[], edges: MindMapEdge[] } | null>(null);

  const handleSave = () => {
    const markdownContent = serializeMindMap(nodes, edges);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(markdownContent, `mindmap-${date}.md`, 'text/markdown');
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const data = deserializeMindMap(content);
      if (data) {
        setLoadedData(data);
        setIsAlertOpen(true);
      } else {
        showError("Failed to load mind map. The file format is invalid.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const confirmLoad = () => {
    if (loadedData) {
      loadState(loadedData);
    }
    setIsAlertOpen(false);
    setLoadedData(null);
  };

  return (
    <>
      <header className="p-2 border-b flex items-center gap-2 bg-background z-10 flex-wrap">
        <Button onClick={toggleChatSidebar} size="sm" variant="outline">
          <MessageSquare className="mr-2 h-4 w-4" /> Chat
        </Button>
        <div className="w-px bg-border h-6 mx-2" />
        <h1 className="text-xl font-bold mr-4">fumi2kick Mind Map</h1>
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
          onChange={handleFileChange}
          accept=".md,text/markdown"
          className="hidden"
        />
      </header>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Loading a new mind map will overwrite your current work. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLoadedData(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLoad}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}