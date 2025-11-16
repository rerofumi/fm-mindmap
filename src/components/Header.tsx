import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { MindMapNode, MindMapEdge } from '@/types';
import { showError } from '@/utils/toast';
import { useRef, useState } from 'react';
import { deserializeMindMap } from '@/lib/fileUtils';
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
  const viewMode = useStore((state) => state.viewMode);
  const setViewMode = useStore((state) => state.setViewMode);
  const loadState = useStore((state) => state.loadState);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [loadedData, setLoadedData] = useState<{ nodes: MindMapNode[], edges: MindMapEdge[] } | null>(null);

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
      <header className="p-3 border-b flex items-center gap-4 bg-background z-10">
        <h1 className="text-lg font-bold">fm-mindmap</h1>
        <div role="tablist" className="flex items-center gap-1">
          <Button role="tab" aria-selected={viewMode === 'mindmap'}
            size="sm"
            className={viewMode === 'mindmap' ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
            variant={viewMode === 'mindmap' ? 'secondary' : 'ghost'}
            onClick={() => setViewMode('mindmap')}
          >Map mode</Button>
          <Button role="tab" aria-selected={viewMode === 'chat'}
            size="sm"
            className={viewMode === 'chat' ? 'bg-green-500 text-white hover:bg-green-600' : ''}
            variant={viewMode === 'chat' ? 'secondary' : 'ghost'}
            onClick={() => setViewMode('chat')}
          >Chat mode</Button>
        </div>
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
