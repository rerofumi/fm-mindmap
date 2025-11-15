import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, User, Bot, Sparkles, MessageSquarePlus, Wand2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { fetchLLMResponse } from '@/lib/api';
import { showError } from '@/utils/toast';
import { TEXT_REFINEMENT_PROMPT } from '@/lib/prompts';

export function ChatView() {
  const standaloneChatHistory = useStore((state) => state.standaloneChatHistory);
  const sendStandaloneMessage = useStore((state) => state.sendStandaloneMessage);
  const clearStandaloneChat = useStore((state) => state.clearStandaloneChat);
  const generateMindmapFromStandaloneChat = useStore((state) => state.generateMindmapFromStandaloneChat);
  const isStandaloneChatLoading = useStore((state) => state.isStandaloneChatLoading);
  const isMindmapGenerating = useStore((state) => state.isMindmapGenerating);

  const [inputValue, setInputValue] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [standaloneChatHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStandaloneChatLoading || isMindmapGenerating) return;
    await sendStandaloneMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        handleSubmit(e as any);
      } else {
        e.preventDefault(); // Prevent form submission on Enter alone
      }
    }
  };

  const handleClearChat = () => {
    if (standaloneChatHistory.length === 0) return;
    if (window.confirm('Clear chat history? This action cannot be undone.')) {
      clearStandaloneChat();
    }
  };

  const handleRefine = async () => {
    if (!inputValue.trim() || isStandaloneChatLoading || isMindmapGenerating || isRefining) return;
    
    setIsRefining(true);
    try {
      const prompt = TEXT_REFINEMENT_PROMPT(standaloneChatHistory, inputValue);
      const refinedText = await fetchLLMResponse([{ role: 'user', content: prompt }]);
      setInputValue(refinedText.trim().replace(/^\"|\"$/g, ''));
    } catch (error) {
      showError("Failed to refine text.");
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Header bar with actions */}
      <div className="flex-shrink-0 p-4 border-b flex items-center justify-between">
        <h2 className="text-xl font-semibold">Chat Mode</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleClearChat}
            variant="outline"
            size="sm"
            disabled={standaloneChatHistory.length === 0 || isStandaloneChatLoading || isMindmapGenerating}
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" /> New Chat
          </Button>
          <Button
            onClick={generateMindmapFromStandaloneChat}
            variant="default"
            size="sm"
            disabled={standaloneChatHistory.length === 0 || isMindmapGenerating || isStandaloneChatLoading}
          >
            {isMindmapGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Generate Mindmap
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-grow p-6" ref={scrollAreaRef}>
        <div className="max-w-4xl mx-auto space-y-4">
          {standaloneChatHistory.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p className="text-lg mb-2">Start a conversation</p>
              <p className="text-sm">Ask questions and generate mind maps from your discussions.</p>
            </div>
          ) : (
            standaloneChatHistory.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.role === 'assistant' && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback><Bot size={20} /></AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "p-3 rounded-lg max-w-2xl whitespace-pre-wrap",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.content}
                </div>
                {message.role === 'user' && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback><User size={20} /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          {isStandaloneChatLoading && (
            <div className="flex items-start gap-3 justify-start">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback><Bot size={20} /></AvatarFallback>
              </Avatar>
              <div className="p-3 rounded-lg bg-muted flex items-center">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="flex-shrink-0 p-4 border-t bg-background">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message... (Ctrl+Enter to send)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStandaloneChatLoading || isMindmapGenerating}
              className="flex-grow"
            />
            <Button type="button" variant="outline" size="icon" onClick={handleRefine} disabled={!inputValue.trim() || isStandaloneChatLoading || isMindmapGenerating || isRefining} title="Refine message">
              {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            </Button>
            <Button
              type="submit"
              size="icon"
              disabled={!inputValue.trim() || isStandaloneChatLoading || isMindmapGenerating}
              title="Send message (Ctrl+Enter)"
            >
              {isStandaloneChatLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
