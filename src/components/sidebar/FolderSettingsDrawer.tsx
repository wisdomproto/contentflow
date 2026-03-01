'use client';

import { useState, useEffect } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PersonaForm } from '@/components/persona/PersonaForm';
import { useUIStore } from '@/stores/useUIStore';
import { useFolderStore } from '@/stores/useFolderStore';
import { FOLDER_COLORS, FOLDER_ICONS } from '@/lib/constants';
import { toast } from '@/components/ui/Toast';
import { X } from 'lucide-react';
import type { Persona } from '@/types/folder';

export function FolderSettingsDrawer() {
  const isOpen = useUIStore((s) => s.isFolderDrawerOpen);
  const drawerFolderId = useUIStore((s) => s.drawerFolderId);
  const closeFolderDrawer = useUIStore((s) => s.closeFolderDrawer);
  const folders = useFolderStore((s) => s.folders);
  const updateFolderSettings = useFolderStore((s) => s.updateFolderSettings);
  const updatePersona = useFolderStore((s) => s.updatePersona);

  const folder = folders.find((f) => f.id === drawerFolderId);

  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [icon, setIcon] = useState('');
  const [naverCategory, setNaverCategory] = useState('');
  const [mainKeywords, setMainKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [persona, setPersona] = useState<Persona | null>(null);

  useEffect(() => {
    if (folder) {
      setName(folder.settings.name);
      setColor(folder.settings.color);
      setIcon(folder.settings.icon);
      setNaverCategory(folder.settings.naverCategory);
      setMainKeywords([...folder.settings.mainKeywords]);
      setPersona({ ...folder.persona });
    }
  }, [folder]);

  if (!folder || !persona) return null;

  const handleSave = () => {
    updateFolderSettings(folder.id, {
      name,
      color,
      icon,
      naverCategory,
      mainKeywords,
    });
    updatePersona(folder.id, persona);
    toast('폴더 설정이 저장되었습니다', 'success');
    closeFolderDrawer();
  };

  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      if (!mainKeywords.includes(keywordInput.trim())) {
        setMainKeywords([...mainKeywords, keywordInput.trim()]);
      }
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setMainKeywords(mainKeywords.filter((k) => k !== keyword));
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={closeFolderDrawer}
      title={`${icon} ${name} — 폴더 설정`}
    >
      <div className="flex flex-col gap-5">
        {/* Folder basic settings */}
        <div className="flex flex-col gap-4">
          <Input
            id="folderName"
            label="폴더명"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">아이콘/색상</label>
            <div className="flex gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full border-2 ${color === c ? 'border-foreground' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {FOLDER_ICONS.map((i) => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={`rounded-md p-1 text-base ${icon === i ? 'bg-accent' : 'hover:bg-muted'}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <Input
            id="naverCategory"
            label="네이버 카테고리 연결"
            placeholder="예: 강남/서초 맛집"
            value={naverCategory}
            onChange={(e) => setNaverCategory(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">메인 키워드</label>
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleAddKeyword}
              placeholder="키워드 입력 후 Enter"
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {mainKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {mainKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
                  >
                    {kw}
                    <button onClick={() => handleRemoveKeyword(kw)} className="hover:text-foreground">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <hr className="border-border" />

        {/* Persona settings */}
        <PersonaForm
          persona={persona}
          onChange={(update) => setPersona((prev) => (prev ? { ...prev, ...update } : prev))}
        />

        {/* Actions */}
        <div className="flex gap-2 border-t border-border pt-4">
          <Button variant="primary" onClick={handleSave} className="flex-1">
            저장
          </Button>
          <Button variant="secondary" onClick={closeFolderDrawer} className="flex-1">
            취소
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
