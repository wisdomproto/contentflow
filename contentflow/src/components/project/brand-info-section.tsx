'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { X, Upload } from 'lucide-react';
import type { Project } from '@/types/database';

const INDUSTRIES = ['뷰티', '식품', 'IT', '교육', '패션', '건강', '금융', '여행', '부동산', '기타'];
const BRAND_TONES = ['공식적', '캐주얼', '유머러스', '전문적', '감성적', '커스텀'];

interface BrandInfoSectionProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

export function BrandInfoSection({ project, onUpdate }: BrandInfoSectionProps) {
  const [brandName, setBrandName] = useState(project.brand_name ?? '');
  const [brandDescription, setBrandDescription] = useState(project.brand_description ?? '');
  const [industry, setIndustry] = useState(project.industry ?? '');
  const [usp, setUsp] = useState(project.usp ?? '');
  const [brandTone, setBrandTone] = useState(project.brand_tone ?? '');
  const [bannedKeywords, setBannedKeywords] = useState<string[]>(project.banned_keywords ?? []);
  const [keywordInput, setKeywordInput] = useState('');
  const [targetAge, setTargetAge] = useState((project.target_audience as Record<string, string>)?.age ?? '');
  const [targetGender, setTargetGender] = useState((project.target_audience as Record<string, string>)?.gender ?? '전체');
  const [targetInterests, setTargetInterests] = useState((project.target_audience as Record<string, string>)?.interests ?? '');

  // Sync when project changes
  useEffect(() => {
    setBrandName(project.brand_name ?? '');
    setBrandDescription(project.brand_description ?? '');
    setIndustry(project.industry ?? '');
    setUsp(project.usp ?? '');
    setBrandTone(project.brand_tone ?? '');
    setBannedKeywords(project.banned_keywords ?? []);
    const ta = project.target_audience as Record<string, string> | null;
    setTargetAge(ta?.age ?? '');
    setTargetGender(ta?.gender ?? '전체');
    setTargetInterests(ta?.interests ?? '');
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    onUpdate({
      brand_name: brandName || null,
      brand_description: brandDescription || null,
      industry: industry || null,
      usp: usp || null,
      brand_tone: brandTone || null,
      banned_keywords: bannedKeywords.length > 0 ? bannedKeywords : null,
      target_audience: {
        age: targetAge,
        gender: targetGender,
        interests: targetInterests,
      },
    });
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !bannedKeywords.includes(kw)) {
      setBannedKeywords([...bannedKeywords, kw]);
      setKeywordInput('');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>브랜드 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand-name">브랜드/서비스명</Label>
            <Input id="brand-name" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="예: 헬시라이프" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-desc">브랜드 설명</Label>
            <Textarea id="brand-desc" value={brandDescription} onChange={(e) => setBrandDescription(e.target.value)} placeholder="브랜드 소개, 미션, 핵심 가치" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>업종/산업</Label>
            <Select value={industry} onValueChange={(v) => { if (v) setIndustry(v); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="업종 선택" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="usp">핵심 차별점 (USP)</Label>
            <Textarea id="usp" value={usp} onChange={(e) => setUsp(e.target.value)} placeholder="경쟁사 대비 차별화 포인트" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>브랜드 톤앤매너</Label>
            <Select value={brandTone} onValueChange={(v) => { if (v) setBrandTone(v); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="톤 선택" />
              </SelectTrigger>
              <SelectContent>
                {BRAND_TONES.map((tone) => (
                  <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {brandTone === '커스텀' && (
              <Input value={brandTone} onChange={(e) => setBrandTone(e.target.value)} placeholder="커스텀 톤앤매너 입력" className="mt-2" />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>타겟 고객</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target-age">연령대</Label>
              <Input id="target-age" value={targetAge} onChange={(e) => setTargetAge(e.target.value)} placeholder="예: 25-45세" />
            </div>
            <div className="space-y-2">
              <Label>성별</Label>
              <Select value={targetGender} onValueChange={(v) => { if (v) setTargetGender(v); }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="전체">전체</SelectItem>
                  <SelectItem value="남성">남성</SelectItem>
                  <SelectItem value="여성">여성</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-interests">관심사</Label>
            <Input id="target-interests" value={targetInterests} onChange={(e) => setTargetInterests(e.target.value)} placeholder="쉼표로 구분 (예: 건강, 다이어트, 운동)" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>금지 키워드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {bannedKeywords.map((kw) => (
              <Badge key={kw} variant="secondary" className="gap-1">
                {kw}
                <button onClick={() => setBannedKeywords(bannedKeywords.filter((k) => k !== kw))} className="hover:text-destructive">
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
              placeholder="금지 키워드 입력 후 Enter"
            />
            <Button variant="outline" size="sm" onClick={addKeyword}>추가</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>브랜드 로고</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">카드뉴스 워터마크 등에 사용할 로고 이미지</p>
            <Button variant="outline" size="sm" className="mt-2">파일 선택</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>저장</Button>
      </div>
    </div>
  );
}
