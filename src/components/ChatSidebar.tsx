import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, X, User, Bot, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { useStore } from '@/lib/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { fetchLLMResponse } from '@/lib/api';
import { showError } from '@/utils/toast';
import { TEXT_REFINEMENT_PROMPT } from '@/lib/prompts';

interface ChatSidebarProps {
  onClose: () => void;
}

export function ChatSidebar({ onClose }: ChatSidebarProps) {
  const chatHistory = useStore((state) => state.chatHistory);
  const chatAndCreateNode = useStore((state) => state.chatAndCreateNode);
  const selectedNodeId = useStore((state) => state.selectedNodeId);
  const getContext = useStore((state) => state.getContext);

  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const getViewportEl = () => {
    const root = scrollAreaRef.current;
    if (!root) return null;
    return root.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
  };

  const scrollToBottom = (smooth = true) => {
    const viewport = getViewportEl();
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [chatHistory]);

  useEffect(() => {
    const viewport = getViewportEl();
    if (!viewport) return;
    const onScroll = () => {
      const threshold = 48;
      const distanceFromBottom = viewport.scrollHeight - (viewport.scrollTop + viewport.clientHeight);
      setShowScrollToBottom(distanceFromBottom > threshold);
    };
    viewport.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => viewport.removeEventListener('scroll', onScroll);
  }, []);

  const submitMessage = async () => {
    if (!inputValue.trim() || !selectedNodeId || isSending || isRefining) return;

    setIsSending(true);
    try {
      await chatAndCreateNode(inputValue.trim());
      setInputValue('');
    } finally {
      setIsSending(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        submitMessage();
      } else {
        e.preventDefault(); // Prevent form submission on Enter alone
      }
    }
  };

  const handleRefine = async () => {
    if (!inputValue.trim() || !selectedNodeId || isSending || isRefining) return;

    setIsRefining(true);
    try {
      const context = getContext(selectedNodeId, true);
      const prompt = TEXT_REFINEMENT_PROMPT(context, inputValue);

      const refinedText = await fetchLLMResponse([{ role: 'user', content: prompt }]);
      setInputValue(refinedText.trim().replace(/^"|"$/g, ''));
    } catch (error) {
      showError("Failed to refine text.");
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <aside className="w-96 bg-gray-50 p-4 border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800 flex-shrink-0 flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold">Context History</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="relative flex-grow pr-4 -mr-4" ref={scrollAreaRef}>
        {showScrollToBottom && (
          <Button
            type="button"
            size="icon"
            className="absolute right-2 bottom-2 shadow"
            variant="secondary"
            onClick={() => scrollToBottom(true)}
            title="Scroll to latest"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
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

      <form onSubmit={handleFormSubmit} className="mt-4 pt-4 border-t flex-shrink-0">
        <div className="flex gap-2">
          <Input
            placeholder={selectedNodeId ? "Ask a question..." : "Select a node for context"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!selectedNodeId || isSending || isRefining}
          />
          <Button type="button" variant="outline" size="icon" onClick={handleRefine} disabled={!inputValue.trim() || !selectedNodeId || isSending || isRefining} title="Refine message">
            {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
          <Button type="submit" size="icon" disabled={!inputValue.trim() || !selectedNodeId || isSending || isRefining} title="Send message">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </aside>
  );
}