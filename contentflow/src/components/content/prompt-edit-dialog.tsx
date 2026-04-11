'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Square } from 'lucide-react';

interface PromptEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt: string;
  isGenerating: boolean;
  onGenerate: (prompt: string) => void;
  onAbort: () => void;
}

export function PromptEditDialog({
  open, onOpenChange, initialPrompt, isGenerating, onGenerate, onAbort,
}: PromptEditDialogProps) {
  const [prompt, setPrompt] = useState(initialPrompt);

  useEffect(() => {
    if (open) setPrompt(initialPrompt);
  }, [open, initialPrompt]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>AI 글 생성 프롬프트</DialogTitle>
          <DialogDescription>
            프롬프트를 확인하고 필요하면 수정한 후 생성을 시작하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={20}
            className="font-mono text-xs resize-none"
            disabled={isGenerating}
          />
        </div>
        <DialogFooter>
          {isGenerating ? (
            <Button variant="destructive" onClick={onAbort} className="gap-1.5">
              <Square size={14} /> 중단
            </Button>
          ) : (
            <Button
              onClick={() => { onGenerate(prompt); onOpenChange(false); }}
              className="gap-1.5"
              disabled={!prompt.trim()}
            >
              <Sparkles size={14} /> AI 글 생성 시작
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
