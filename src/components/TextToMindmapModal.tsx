import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileText } from 'lucide-react';
import { useStore } from '@/lib/store';

interface TextToMindmapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TextToMindmapModal({ open, onOpenChange }: TextToMindmapModalProps) {
  const [inputText, setInputText] = useState('');
  const generateMindmapFromTextInput = useStore((state) => state.generateMindmapFromTextInput);
  const isMindmapGenerating = useStore((state) => state.isMindmapGenerating);

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    await generateMindmapFromTextInput(inputText);
    onOpenChange(false);
    setInputText('');
  };

  const handleCancel = () => {
    onOpenChange(false);
    setInputText('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            テキストからマインドマップを作成
          </DialogTitle>
          <DialogDescription>
            文章やドキュメントを入力すると、AIが内容を解析してマインドマップを自動生成します。
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 py-4">
          <Textarea
            placeholder="ここに文章を入力してください...&#10;&#10;例:&#10;- 記事やレポートの内容&#10;- 議事録&#10;- アイデアのメモ&#10;&#10;AIが主要なトピックや関連性を抽出し、マインドマップの構造を生成します。"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="min-h-[300px] resize-none"
            disabled={isMindmapGenerating}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isMindmapGenerating}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!inputText.trim() || isMindmapGenerating}
          >
            {isMindmapGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                マインドマップを生成
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
