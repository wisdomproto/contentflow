'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, TrendingUp, Eye, MousePointer, DollarSign, Upload, Link2 } from 'lucide-react'
import { AnalyticsLanguageTabs } from '@/components/analytics/language-tabs'
import { createClient } from '@/lib/supabase/client'
import { useProjectStore } from '@/stores/project-store'

type AdPlatform = 'meta' | 'youtube'

interface Campaign {
  id: string
  name: string
  platform: AdPlatform
  language: string
  status: 'draft' | 'active' | 'paused' | 'ended'
  budget: number
  budgetType: 'daily' | 'lifetime'
  startDate: string
  endDate: string
  contentId?: string  // linked content from ContentFlow
  contentTitle?: string
  contentType?: string  // 'cardnews' | 'reels' | 'longform'
  // Performance metrics
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  spend: number
  conversions: number
  roas: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: '초안', color: 'bg-muted text-muted-foreground' },
  active: { label: '진행중', color: 'bg-green-500/10 text-green-500' },
  paused: { label: '일시정지', color: 'bg-yellow-500/10 text-yellow-500' },
  ended: { label: '종료', color: 'bg-gray-500/10 text-gray-500' },
}

function formatNumber(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`
  if (n >= 1000) return n.toLocaleString()
  return String(n)
}

function formatCurrency(n: number): string {
  return `₩${n.toLocaleString()}`
}

export function AdsDashboard() {
  const { selectedProjectId } = useProjectStore()
  const [selectedLang, setSelectedLang] = useState('ko')
  const [selectedPlatform, setSelectedPlatform] = useState<AdPlatform>('meta')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

  // New campaign form
  const [newName, setNewName] = useState('')
  const [newBudget, setNewBudget] = useState('')
  const [newBudgetType, setNewBudgetType] = useState<'daily' | 'lifetime'>('daily')
  const [newContentType, setNewContentType] = useState('')
  const [contentSource, setContentSource] = useState<'published' | 'upload'>('published')
  const [selectedPublishRecord, setSelectedPublishRecord] = useState<any>(null)
  const [publishRecords, setPublishRecords] = useState<any[]>([])
  const [uploadedFile, setUploadedFile] = useState<string>('')

  // Load published content
  useEffect(() => {
    const supabase = createClient()
    supabase.from('publish_records').select('*')
      .eq('project_id', selectedProjectId || '')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .then(({ data }) => setPublishRecords(data || []))
  }, [selectedProjectId])

  function createCampaign() {
    if (!newName.trim()) return
    const campaign: Campaign = {
      id: crypto.randomUUID(),
      name: newName,
      platform: selectedPlatform,
      language: selectedLang,
      status: 'draft',
      budget: parseInt(newBudget) || 0,
      budgetType: newBudgetType,
      startDate: '',
      endDate: '',
      contentType: newContentType,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      spend: 0,
      conversions: 0,
      roas: 0,
    }
    setCampaigns(prev => [...prev, campaign])
    setNewName('')
    setNewBudget('')
    setShowCreate(false)
  }

  const filteredCampaigns = campaigns.filter(c => c.platform === selectedPlatform && c.language === selectedLang)

  // Calculate totals
  const totalSpend = filteredCampaigns.reduce((sum, c) => sum + c.spend, 0)
  const totalImpressions = filteredCampaigns.reduce((sum, c) => sum + c.impressions, 0)
  const totalClicks = filteredCampaigns.reduce((sum, c) => sum + c.clicks, 0)
  const totalConversions = filteredCampaigns.reduce((sum, c) => sum + c.conversions, 0)

  return (
    <div className="p-6 max-w-6xl space-y-4">
      {/* Language Tabs */}
      <AnalyticsLanguageTabs selectedLang={selectedLang} onLangChange={setSelectedLang} />

      {/* Platform Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setSelectedPlatform('meta')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            selectedPlatform === 'meta' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="w-5 h-5 bg-[#1877f2] rounded text-white text-[10px] flex items-center justify-center font-bold">M</span>
          Meta Ads
        </button>
        <button
          onClick={() => setSelectedPlatform('youtube')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            selectedPlatform === 'youtube' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="w-5 h-5 bg-[#ff0000] rounded text-white text-[10px] flex items-center justify-center font-bold">YT</span>
          YouTube Ads
        </button>
        <Button size="sm" className="ml-auto h-8 text-xs gap-1" onClick={() => setShowCreate(true)}>
          <Plus size={12} /> 새 캠페인
        </Button>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">총 지출</span>
          </div>
          <div className="text-xl font-bold">{formatCurrency(totalSpend)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">노출</span>
          </div>
          <div className="text-xl font-bold">{formatNumber(totalImpressions)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <MousePointer size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">클릭</span>
          </div>
          <div className="text-xl font-bold">{formatNumber(totalClicks)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">전환</span>
          </div>
          <div className="text-xl font-bold">{formatNumber(totalConversions)}</div>
        </div>
      </div>

      {/* Create Campaign Form */}
      {showCreate && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold">새 캠페인 만들기</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">캠페인 이름</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="예: 성장클리닉 인지도 캠페인" className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">예산</label>
              <div className="flex gap-2">
                <Input value={newBudget} onChange={e => setNewBudget(e.target.value)} placeholder="100000" type="number" className="text-sm flex-1" />
                <select value={newBudgetType} onChange={e => setNewBudgetType(e.target.value as 'daily' | 'lifetime')} className="bg-muted text-sm rounded-md px-2 border border-border">
                  <option value="daily">일 예산</option>
                  <option value="lifetime">총 예산</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">광고 콘텐츠 유형</label>
            <div className="flex gap-2">
              {(selectedPlatform === 'meta' ? [
                { id: 'cardnews', label: '카드뉴스', icon: '🖼️' },
                { id: 'reels', label: '릴스/숏폼', icon: '📱' },
                { id: 'image', label: '이미지', icon: '🖼️' },
                { id: 'video', label: '동영상', icon: '🎬' },
              ] : [
                { id: 'video', label: '인스트림', icon: '🎬' },
                { id: 'shorts', label: 'Shorts', icon: '📱' },
                { id: 'discovery', label: '디스커버리', icon: '🔍' },
                { id: 'bumper', label: '범퍼', icon: '⚡' },
              ]).map(type => (
                <button
                  key={type.id}
                  onClick={() => setNewContentType(type.id)}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-md text-xs border transition-colors',
                    newContentType === type.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                  )}
                >
                  <div>{type.icon}</div>
                  <div className="mt-1">{type.label}</div>
                </button>
              ))}
            </div>
          </div>
          {/* Content Source */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">광고 콘텐츠</label>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setContentSource('published')}
                className={cn('flex-1 py-2 px-3 rounded-md text-xs border flex items-center gap-2 justify-center',
                  contentSource === 'published' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>
                <Link2 size={12} /> 발행된 콘텐츠에서 선택
              </button>
              <button onClick={() => setContentSource('upload')}
                className={cn('flex-1 py-2 px-3 rounded-md text-xs border flex items-center gap-2 justify-center',
                  contentSource === 'upload' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>
                <Upload size={12} /> 새로 업로드
              </button>
            </div>

            {contentSource === 'published' && (
              <div className="max-h-[150px] overflow-y-auto border border-border rounded-md divide-y divide-border">
                {publishRecords.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">발행된 콘텐츠가 없습니다</div>
                ) : publishRecords.map(record => (
                  <button key={record.id} onClick={() => setSelectedPublishRecord(record)}
                    className={cn('w-full flex items-center gap-2 p-2 text-left hover:bg-accent text-xs',
                      selectedPublishRecord?.id === record.id && 'bg-primary/5')}>
                    <span className={cn('w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0',
                      record.channel === 'wordpress' ? 'bg-[#21759b]' :
                      record.channel === 'instagram' ? 'bg-[#c13584]' :
                      record.channel === 'facebook' ? 'bg-[#1877f2]' :
                      record.channel === 'youtube' ? 'bg-[#ff0000]' : 'bg-muted-foreground'
                    )}>{record.channel?.substring(0, 2).toUpperCase()}</span>
                    <span className="flex-1 truncate">{record.metadata?.title || 'Untitled'}</span>
                    <span className="text-muted-foreground">{record.language?.toUpperCase()}</span>
                    {selectedPublishRecord?.id === record.id && <span className="text-primary">✓</span>}
                  </button>
                ))}
              </div>
            )}

            {contentSource === 'upload' && (
              <div className="border border-dashed border-border rounded-md p-6 text-center">
                <Upload size={20} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">이미지 또는 영상을 드래그하거나 클릭하여 업로드</p>
                <p className="text-[10px] text-muted-foreground mt-1">JPG, PNG, MP4, MOV (최대 100MB)</p>
              </div>
            )}
          </div>

          {/* Targeting */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">타겟팅</label>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3 space-y-2">
                <label className="text-[10px] text-muted-foreground block">지역</label>
                <div className="grid grid-cols-3 gap-2">
                  <select className="bg-muted text-xs rounded-md px-2 py-1.5 border border-border">
                    <option>대한민국</option>
                    <option>미국</option>
                    <option>태국</option>
                    <option>베트남</option>
                    <option>일본</option>
                    <option>중국</option>
                    <option>전 세계</option>
                  </select>
                  <Input placeholder="도시 (예: 서울, 강남구)" className="text-xs h-8" />
                  <div className="flex gap-1">
                    <Input placeholder="반경" type="number" className="text-xs h-8 w-20" />
                    <select className="bg-muted text-xs rounded-md px-1.5 py-1 border border-border">
                      <option>km</option>
                      <option>mi</option>
                    </select>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">도시 입력 시 해당 도시 중심 반경으로 타겟팅됩니다. 비워두면 국가 전체.</p>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">성별</label>
                <select className="w-full bg-muted text-xs rounded-md px-2 py-1.5 border border-border">
                  <option>전체</option>
                  <option>남성</option>
                  <option>여성</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">연령</label>
                <select className="w-full bg-muted text-xs rounded-md px-2 py-1.5 border border-border">
                  <option>전체</option>
                  <option>18-24</option>
                  <option>25-34</option>
                  <option>35-44</option>
                  <option>45-54</option>
                  <option>55-64</option>
                  <option>65+</option>
                </select>
              </div>
            </div>
            {selectedPlatform === 'meta' && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">관심사</label>
                  <Input placeholder="예: 육아, 건강, 소아과" className="text-xs h-7" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">행동</label>
                  <Input placeholder="예: 온라인 쇼핑, 모바일 사용자" className="text-xs h-7" />
                </div>
              </div>
            )}
            {selectedPlatform === 'youtube' && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">키워드 타겟</label>
                  <Input placeholder="예: 성장클리닉, 키성장" className="text-xs h-7" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">채널/동영상 타겟</label>
                  <Input placeholder="경쟁 채널 URL" className="text-xs h-7" />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>취소</Button>
            <Button size="sm" onClick={createCampaign} disabled={!newName.trim()}>캠페인 생성</Button>
          </div>
        </div>
      )}

      {/* Campaign List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">캠페인 목록</h3>
          <span className="text-xs text-muted-foreground">{filteredCampaigns.length}개</span>
        </div>

        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-4">📢</p>
            <p className="text-sm">캠페인이 없습니다</p>
            <p className="text-xs mt-2">&quot;새 캠페인&quot; 버튼으로 광고 캠페인을 만들어보세요</p>
            <p className="text-xs mt-1 text-muted-foreground/60">
              {selectedPlatform === 'meta' ? 'Instagram · Facebook 광고' : 'YouTube 인스트림 · Shorts · 디스커버리 광고'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredCampaigns.map(campaign => (
              <div key={campaign.id} className="p-4 hover:bg-accent/50 cursor-pointer" onClick={() => setSelectedCampaign(campaign)}>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{campaign.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {campaign.contentType && <span className="mr-2">{campaign.contentType}</span>}
                      {campaign.budget > 0 && <span>{campaign.budgetType === 'daily' ? '일' : '총'} {formatCurrency(campaign.budget)}</span>}
                    </div>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px]', STATUS_CONFIG[campaign.status]?.color)}>
                    {STATUS_CONFIG[campaign.status]?.label}
                  </Badge>
                  <div className="text-right text-xs text-muted-foreground">
                    {campaign.impressions > 0 && (
                      <div>노출 {formatNumber(campaign.impressions)} · 클릭 {formatNumber(campaign.clicks)}</div>
                    )}
                    {campaign.spend > 0 && (
                      <div>지출 {formatCurrency(campaign.spend)}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campaign Detail (placeholder for future) */}
      {selectedCampaign && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">{selectedCampaign.name}</h3>
            <Button size="sm" variant="ghost" onClick={() => setSelectedCampaign(null)}>닫기</Button>
          </div>
          <div className="grid grid-cols-6 gap-3 text-center">
            <div className="bg-muted rounded-md p-3">
              <div className="text-lg font-bold">{formatNumber(selectedCampaign.impressions)}</div>
              <div className="text-[10px] text-muted-foreground">노출</div>
            </div>
            <div className="bg-muted rounded-md p-3">
              <div className="text-lg font-bold">{formatNumber(selectedCampaign.clicks)}</div>
              <div className="text-[10px] text-muted-foreground">클릭</div>
            </div>
            <div className="bg-muted rounded-md p-3">
              <div className="text-lg font-bold">{selectedCampaign.ctr.toFixed(1)}%</div>
              <div className="text-[10px] text-muted-foreground">CTR</div>
            </div>
            <div className="bg-muted rounded-md p-3">
              <div className="text-lg font-bold">{formatCurrency(selectedCampaign.cpc)}</div>
              <div className="text-[10px] text-muted-foreground">CPC</div>
            </div>
            <div className="bg-muted rounded-md p-3">
              <div className="text-lg font-bold">{formatNumber(selectedCampaign.conversions)}</div>
              <div className="text-[10px] text-muted-foreground">전환</div>
            </div>
            <div className="bg-muted rounded-md p-3">
              <div className="text-lg font-bold">{selectedCampaign.roas.toFixed(1)}x</div>
              <div className="text-[10px] text-muted-foreground">ROAS</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Meta/YouTube 광고 관리자 API 연동 후 실제 성과 데이터가 표시됩니다
          </p>
        </div>
      )}
    </div>
  )
}
