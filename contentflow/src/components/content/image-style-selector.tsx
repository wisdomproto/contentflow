'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const STYLE_PRESETS = [
  // 일러스트 / 만화
  { value: 'webtoon', label: '웹툰 스타일', prompt: 'Korean webtoon illustration style, clean line art, vibrant colors, manhwa aesthetic' },
  { value: 'anime', label: '애니메이션', prompt: 'Anime style illustration, cel-shaded, vivid colors, Japanese animation aesthetic, detailed character design' },
  { value: 'watercolor', label: '수채화', prompt: 'Watercolor painting style, soft brushstrokes, pastel tones, artistic texture, hand-painted feel' },
  { value: 'flat-illustration', label: '플랫 일러스트', prompt: 'Modern flat illustration, vector art style, bold shapes, limited color palette, clean geometric design' },
  { value: 'hand-drawn', label: '손그림 스케치', prompt: 'Hand-drawn sketch style, pencil texture, rough lines, artistic imperfections, organic feel' },
  { value: 'pixel-art', label: '픽셀아트', prompt: 'Pixel art style, retro 8-bit aesthetic, limited color palette, crisp pixels, nostalgic game style' },
  { value: '3d-render', label: '3D 렌더링', prompt: '3D rendered illustration, Pixar-like quality, soft lighting, smooth surfaces, modern CGI aesthetic' },
  { value: 'isometric', label: '아이소메트릭', prompt: 'Isometric illustration, 3D-like flat design, consistent angle, colorful, detailed miniature scene' },

  // 실사 / 사진
  { value: 'realistic', label: '실사 (사진)', prompt: 'Photorealistic, high quality photography, natural lighting, sharp focus, professional camera shot' },
  { value: 'cinematic', label: '시네마틱', prompt: 'Cinematic photography, dramatic lighting, film grain, wide angle lens, movie scene aesthetic, shallow depth of field' },
  { value: 'product-shot', label: '제품 촬영', prompt: 'Professional product photography, studio lighting, clean white background, commercial quality, sharp detail' },
  { value: 'food-photo', label: '음식 촬영', prompt: 'Professional food photography, appetizing styling, warm natural light, shallow depth of field, top-down or 45-degree angle' },
  { value: 'lifestyle', label: '라이프스타일', prompt: 'Lifestyle photography, candid natural moments, warm tones, soft natural light, relatable and authentic feel' },

  // 디자인 / 인포그래픽
  { value: 'infographic', label: '인포그래픽', prompt: 'Clean infographic style, flat design, data visualization, minimal icons, professional layout, structured information' },
  { value: 'minimalist', label: '미니멀리스트', prompt: 'Minimalist design, ample white space, simple shapes, muted color palette, clean typography, elegant simplicity' },
  { value: 'gradient-modern', label: '그라디언트 모던', prompt: 'Modern gradient design, vibrant color transitions, glassmorphism elements, contemporary UI aesthetic, bold and trendy' },
  { value: 'retro-vintage', label: '레트로 빈티지', prompt: 'Retro vintage style, 70s/80s color palette, grainy texture, nostalgic typography, warm faded tones, analog aesthetic' },
  { value: 'pop-art', label: '팝아트', prompt: 'Pop art style, bold outlines, Ben-Day dots, bright primary colors, comic book aesthetic, Andy Warhol inspired' },

  // 직접 입력
  { value: 'custom', label: '직접 입력', prompt: '' },
];

// 비율 프리셋
const ASPECT_RATIO_PRESETS = [
  { value: '1:1', label: '1:1 정사각형', desc: '인스타·스레드' },
  { value: '4:5', label: '4:5 세로', desc: '인스타 피드' },
  { value: '9:16', label: '9:16 세로', desc: '릴스·스토리' },
  { value: '16:9', label: '16:9 가로', desc: '블로그·유튜브' },
  { value: '3:4', label: '3:4 세로', desc: '핀터레스트' },
  { value: '4:3', label: '4:3 가로', desc: '프레젠테이션' },
];

interface ImageStyleSelectorProps {
  value: string;
  onChange: (stylePrompt: string) => void;
  compact?: boolean;
}

export function ImageStyleSelector({ value, onChange, compact }: ImageStyleSelectorProps) {
  // Determine current preset from value
  const currentPreset = STYLE_PRESETS.find((p) => p.prompt === value && p.value !== 'custom');
  const [selectedKey, setSelectedKey] = useState(currentPreset?.value ?? (value ? 'custom' : 'realistic'));
  const [customInput, setCustomInput] = useState(currentPreset ? '' : value);

  const handlePresetChange = (key: string | null) => {
    if (!key) return;
    setSelectedKey(key);
    if (key === 'custom') {
      onChange(customInput);
    } else {
      const preset = STYLE_PRESETS.find((p) => p.value === key);
      if (preset) onChange(preset.prompt);
    }
  };

  const handleCustomChange = (val: string) => {
    setCustomInput(val);
    onChange(val);
  };

  return (
    <div className={compact ? 'flex items-center gap-2' : 'space-y-2'}>
      <Select value={selectedKey} onValueChange={handlePresetChange}>
        <SelectTrigger className={compact ? 'w-44 h-8 text-xs' : 'w-full'}>
          <SelectValue placeholder="이미지 스타일" />
        </SelectTrigger>
        <SelectContent>
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">일러스트 / 만화</div>
          {STYLE_PRESETS.filter((_, i) => i < 8).map((preset) => (
            <SelectItem key={preset.value} value={preset.value} className="text-xs">
              {preset.label}
            </SelectItem>
          ))}
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground border-t mt-1 pt-1">실사 / 사진</div>
          {STYLE_PRESETS.filter((_, i) => i >= 8 && i < 13).map((preset) => (
            <SelectItem key={preset.value} value={preset.value} className="text-xs">
              {preset.label}
            </SelectItem>
          ))}
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground border-t mt-1 pt-1">디자인 / 인포그래픽</div>
          {STYLE_PRESETS.filter((_, i) => i >= 13 && i < 18).map((preset) => (
            <SelectItem key={preset.value} value={preset.value} className="text-xs">
              {preset.label}
            </SelectItem>
          ))}
          <div className="border-t mt-1 pt-1">
            <SelectItem value="custom" className="text-xs">직접 입력</SelectItem>
          </div>
        </SelectContent>
      </Select>
      {selectedKey === 'custom' && (
        <Input
          value={customInput}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="이미지 스타일을 영어로 입력하세요..."
          className={compact ? 'flex-1 h-8 text-xs' : ''}
        />
      )}
    </div>
  );
}

export { STYLE_PRESETS, ASPECT_RATIO_PRESETS };
