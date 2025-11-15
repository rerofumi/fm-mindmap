import { Header } from '@/components/Header';
import { Toolbar } from '@/components/Toolbar';
import { MindMapCanvas } from '@/components/MindMapCanvas';
import { Sidebar } from '@/components/Sidebar';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatView } from '@/components/ChatView';
import { useStore } from '@/lib/store';

const Index = () => {
  const selectedNodeId = useStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useStore((state) => state.setSelectedNodeId);
  const isChatSidebarOpen = useStore((state) => state.isChatSidebarOpen);
  const toggleChatSidebar = useStore((state) => state.toggleChatSidebar);
  const viewMode = useStore((state) => state.viewMode);

  const handleCloseSidebar = () => {
    setSelectedNodeId(null);
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex flex-1 overflow-hidden">
        {viewMode === 'chat' ? (
          <div className="flex-grow h-full">
            {/* Standalone Chat View */}
            {/**/}
            {/* Lazy import avoided for simplicity */}
            <ChatView />
          </div>
        ) : (
          <>
            {isChatSidebarOpen && <ChatSidebar onClose={toggleChatSidebar} />}
            <div className="flex-grow h-full flex flex-col">
              <Toolbar />
              <div className="flex-1 overflow-hidden">
                <MindMapCanvas />
              </div>
            </div>
            {selectedNodeId && <Sidebar onClose={handleCloseSidebar} />}
          </>
        )}
      </main>
    </div>
  );
}

export default Index;
