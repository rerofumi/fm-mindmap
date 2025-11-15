import { Handle, Position, NodeProps } from 'reactflow';
import { memo, useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MindMapNodeData } from '@/types';
import { useStore } from '@/lib/store';
import { showError } from '@/utils/toast';

const RootNode = ({ id, data, selected }: NodeProps<MindMapNodeData>) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const nodes = useStore((state) => state.nodes);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(data.title);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [isEditing]);
  
  useEffect(() => {
    setTitle(data.title);
  }, [data.title]);

  const handleBlur = () => {
    setIsEditing(false);
    const newTitle = title.trim();

    if (newTitle === '') {
      showError("Title cannot be empty.");
      setTitle(data.title);
      return;
    }

    if (newTitle !== data.title) {
      const isDuplicate = nodes.some(node => node.id !== id && node.data.title === newTitle);
      if (isDuplicate) {
        showError(`Title "${newTitle}" already exists.`);
        setTitle(data.title);
      } else {
        updateNodeData(id, { title: newTitle });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setTitle(data.title);
      setIsEditing(false);
    }
  };

  return (
    <Card
      style={{ backgroundColor: data.color }}
      className={cn(
        'border-2 w-48 rounded-xl text-white',
        selected ? 'border-blue-500 shadow-lg' : 'border-transparent'
      )}
    >
      <CardContent className="p-3">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-white text-center font-bold text-lg p-0 m-0 border-none outline-none resize-none"
            style={{
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
            }}
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="text-center font-bold text-lg"
            style={{ whiteSpace: 'pre-wrap', minHeight: '1.75rem' }}
          >
            {data.title}
          </div>
        )}
      </CardContent>
      <Handle type="source" position={Position.Right} className="!bg-gray-400" />
    </Card>
  );
};

export default memo(RootNode);