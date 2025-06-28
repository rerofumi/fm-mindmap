import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, X, User, Bot, Loader2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

interface ChatSidebarProps {
  onClose: () => void;
}

export function ChatSidebar({ onClose }: ChatSidebarProps) {
  const chatHistory = useStore((state) => state.chatHistory);
  const chatAndCreateNode = useStore((state) => state.chatAndCreateNode);
  const selectedNodeId = useStore((state) => state.selectedNodeId);

  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
    }
  }, [chatHistory]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !selectedNodeId || isSending) return;

    setIsSending(true);
    try {
      await chatAndCreateNode(inputValue.trim());
      setInputValue('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <aside className="w-96 bg-gray-50 p-4 border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800 flex-shrink-0 flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold">Chat History</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-grow pr-4 -mr-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {chatHistory.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-3",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              {message.role === 'assistant' && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback><Bot size={20} /></AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "p-3 rounded-lg max-w-xs lg:max-w-sm whitespace-pre-wrap",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.content}
              </div>
              {message.role === 'user' && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback><User size={20} /></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isSending && (
             <div className="flex items-start gap-3 justify-start">
                <Avatar className="w-8 h-8">
                  <AvatarFallback><Bot size={20} /></AvatarFallback>
                </Avatar>
                <div className="p-3 rounded-lg bg-muted flex items-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="mt-4 pt-4 border-t space-y-2 flex-shrink-0">
        <div className="flex gap-2">
          <Input
            placeholder={selectedNodeId ? "Ask a question..." : "Select a node to chat"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={!selectedNodeId || isSending}
          />
          <Button type="submit" disabled={!inputValue.trim() || !selectedNodeId || isSending}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </aside>
  );
}