import { Header } from '@/components/Header';
import { MindMapCanvas } from '@/components/MindMapCanvas';
import { Sidebar } from '@/components/Sidebar';
import { ChatSidebar } from '@/components/ChatSidebar';
import { useStore } from '@/lib/store';

const Index = () => {
  const selectedNodeId = useStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useStore((state) => state.setSelectedNodeId);
  const isChatSidebarOpen = useStore((state) => state.isChatSidebarOpen);
  const toggleChatSidebar = useStore((state) => state.toggleChatSidebar);

  const handleCloseSidebar = () => {
    setSelectedNodeId(null);
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex flex-1 overflow-hidden">
        {isChatSidebarOpen && <ChatSidebar onClose={toggleChatSidebar} />}
        <div className="flex-grow h-full">
          <MindMapCanvas />
        </div>
        {selectedNodeId && <Sidebar onClose={handleCloseSidebar} />}
      </main>
    </div>
  );
}

export default Index;