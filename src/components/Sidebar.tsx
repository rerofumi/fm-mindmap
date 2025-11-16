import { useStore } from '@/lib/store';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X, Paintbrush, Bot, BookText, Loader2, PenSquare, NotebookPen, BrainCircuit } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';
import { showError } from '@/utils/toast';
import { fetchLLMResponse } from '@/lib/api';
import { SUMMARIZE_PROMPT, CHAT_RESPONSE_SYSTEM_PROMPT, createTitleSummarizationPrompt, createAssociationPrompt } from '@/lib/prompts';
import { SummarizeModal } from './SummarizeModal';

export function Sidebar({ onClose }: { onClose: () => void }) {
  const nodes = useStore((state) => state.nodes);
  const selectedNodeId = useStore((state) => state.selectedNodeId);
  const updateSelectedNode = useStore((state) => state.updateSelectedNode);
  const applyColorToDescendants = useStore((state) => state.applyColorToDescendants);
  const getContext = useStore((state) => state.getContext);
  const addMultipleChildNodes = useStore((state) => state.addMultipleChildNodes);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  
  const [title, setTitle] = useState(selectedNode?.data.title || '');
  const [question, setQuestion] = useState(selectedNode?.data.question || '');
  const [memo, setMemo] = useState(selectedNode?.data.memo || '');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSummarizingTitle, setIsSummarizingTitle] = useState(false);
  const [isAssociating, setIsAssociating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState('');

  useEffect(() => {
    if (selectedNode) {
      setTitle(selectedNode.data.title);
      setQuestion(selectedNode.data.question || '');
      setMemo(selectedNode.data.memo || '');
    }
  }, [selectedNode]);

  if (!selectedNode) {
    return null;
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    const newTitle = title.trim();
    if (newTitle === '') {
      showError("Title cannot be empty.");
      setTitle(selectedNode.data.title);
      return;
    }
    if (newTitle !== selectedNode.data.title) {
      const isDuplicate = nodes.some(node => node.id !== selectedNodeId && node.data.title === newTitle);
      if (isDuplicate) {
        showError(`Title "${newTitle}" already exists.`);
        setTitle(selectedNode.data.title);
      } else {
        updateSelectedNode({ title: newTitle });
      }
    }
  };

  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
  };

  const handleQuestionBlur = () => {
    if (question !== selectedNode.data.question) {
      updateSelectedNode({ question });
    }
  };

  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMemo(e.target.value);
  };

  const handleMemoBlur = () => {
    if (memo !== selectedNode.data.memo) {
      updateSelectedNode({ memo });
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSelectedNode({ color: e.target.value });
  };

  const handleExecute = async () => {
    if (!selectedNodeId || !question.trim()) {
      showError("Please enter a question.");
      return;
    }
    setIsLoading(true);
    try {
      const context = getContext(selectedNodeId, false);
      const messages = [
        { role: 'system' as const, content: CHAT_RESPONSE_SYSTEM_PROMPT },
        ...context,
        { role: 'user' as const, content: question },
      ];
      const answer = await fetchLLMResponse(messages);
      updateSelectedNode({ answer });
    } catch (error) {
      // Error is already shown by fetchLLMResponse
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!selectedNodeId) return;
    
    setIsSummarizing(true);
    setSummaryContent('');
    setIsModalOpen(true);

    try {
      const context = getContext(selectedNodeId, true);
      if (context.length === 0) {
        setSummaryContent("There is no conversation to summarize.");
        return;
      }
      const messages = [
        ...context,
        { role: 'user' as const, content: SUMMARIZE_PROMPT },
      ];
      const summary = await fetchLLMResponse(messages);
      setSummaryContent(summary);
    } catch (error) {
      setSummaryContent("Failed to generate summary. Please check your API key and network connection.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSummarizeToTitle = async () => {
    if (!selectedNodeId || !selectedNode.data.question?.trim() || !selectedNode.data.answer?.trim()) {
      showError("Both question and answer must be filled to summarize.");
      return;
    }
    setIsSummarizingTitle(true);
    try {
      const prompt = createTitleSummarizationPrompt(selectedNode.data.question, selectedNode.data.answer);
      
      const newTitle = await fetchLLMResponse([{ role: 'user', content: prompt }]);
      
      const trimmedTitle = newTitle.trim().replace(/^"|"$/g, '');

      if (trimmedTitle === '') {
        showError("Failed to generate a valid title.");
        return;
      }

      const isDuplicate = nodes.some(node => node.id !== selectedNodeId && node.data.title === trimmedTitle);
      if (isDuplicate) {
        showError(`Generated title "${trimmedTitle}" already exists.`);
      } else {
        updateSelectedNode({ title: trimmedTitle });
        setTitle(trimmedTitle);
      }
    } catch (error) {
      // Error is already shown by fetchLLMResponse
    } finally {
      setIsSummarizingTitle(false);
    }
  };

  const handleAssociateNodes = async () => {
    if (!selectedNode) return;
    setIsAssociating(true);
    try {
      const prompt = createAssociationPrompt(selectedNode.data.title);
      const response = await fetchLLMResponse([{ role: 'user', content: prompt }]);
      const newTitles = response.split(',').map(t => t.trim()).filter(t => t.length > 0);
      if (newTitles.length === 0) {
        showError("Could not generate associated words.");
        return;
      }
      addMultipleChildNodes(newTitles);
    } catch (error) {
      // Error is already shown by fetchLLMResponse
    } finally {
      setIsAssociating(false);
    }
  };

  return (
    <>
      <aside className="w-80 bg-gray-50 p-4 border-l border-gray-200 dark:bg-gray-900 dark:border-gray-800 flex-shrink-0 flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h3 className="text-lg font-semibold">Edit Node</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4 flex-grow overflow-y-auto pr-2 -mr-2">
          <div>
            <Label htmlFor="title">Title</Label>
            <Textarea id="title" value={title} onChange={handleTitleChange} onBlur={handleTitleBlur} />
          </div>
          <div>
            <Label htmlFor="color">Color</Label>
            <Input id="color" type="color" value={selectedNode.data.color} onChange={handleColorChange} className="p-1 h-10 w-full" />
          </div>
          <div>
            <Button onClick={applyColorToDescendants} className="w-full">
              <Paintbrush className="mr-2 h-4 w-4" />
              Apply Color to Children
            </Button>
          </div>
          <div className="border-t my-4"></div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="question">Question</Label>
              <Textarea
                id="question"
                placeholder="Enter your question for the AI..."
                value={question}
                onChange={handleQuestionChange}
                onBlur={handleQuestionBlur}
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="answer">Answer</Label>
              <Textarea
                id="answer"
                placeholder="AI's answer will appear here..."
                value={selectedNode.data.answer || ''}
                readOnly
                rows={8}
                className="bg-gray-100 dark:bg-gray-800"
              />
            </div>
            <div>
              <Label htmlFor="memo" className="flex items-center">
                <NotebookPen className="mr-2 h-4 w-4" />
                Memo
              </Label>
              <Textarea
                id="memo"
                placeholder="Add a private memo here..."
                value={memo}
                onChange={handleMemoChange}
                onBlur={handleMemoBlur}
                rows={4}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t flex-shrink-0">
          <TooltipProvider>
            <div className="flex gap-2 justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleExecute} 
                    disabled={isLoading || !question.trim() || isAssociating} 
                    size="icon"
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Execute</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleAssociateNodes} 
                    disabled={isAssociating || isLoading} 
                    size="icon"
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    {isAssociating ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Create Associated Nodes</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleSummarizeToTitle} 
                    disabled={isSummarizingTitle || isLoading || !selectedNode.data.question?.trim() || !selectedNode.data.answer?.trim() || isAssociating} 
                    size="icon"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isSummarizingTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenSquare className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Summarize to Title</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleSummarize} 
                    disabled={isSummarizing || isLoading || isAssociating} 
                    size="icon"
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    {isSummarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookText className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Summarize</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </aside>
      <SummarizeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        content={summaryContent}
        isLoading={isSummarizing}
      />
    </>
  );
}