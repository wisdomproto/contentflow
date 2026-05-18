'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useProjectStore } from '@/stores/project-store';
import type { MetaCredentials as MetaConnectionInfo } from '@/types/database';

interface ChannelConfig {
  id: string;
  name: string;
  icon: string;
  iconBg: string;
  iconText: string;
  description: string;
  manualOnly?: boolean;
}

const CHANNELS: ChannelConfig[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'IG',
    iconBg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    iconText: 'text-white',
    description: '인스타그램 카드뉴스/릴스 발행',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'FB',
    iconBg: 'bg-blue-500',
    iconText: 'text-white',
    description: '페이스북 페이지 포스트 발행',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: 'YT',
    iconBg: 'bg-red-600',
    iconText: 'text-white',
    description: '유튜브 영상 업로드 및 관리',
  },
  {
    id: 'threads',
    name: 'Threads',
    icon: 'T',
    iconBg: 'bg-black',
    iconText: 'text-white',
    description: '스레드 포스트 발행',
  },
  {
    id: 'naver_blog',
    name: 'Naver Blog',
    icon: 'N',
    iconBg: 'bg-green-500',
    iconText: 'text-white',
    description: '네이버 블로그 포스트 발행',
    manualOnly: true,
  },
];

export function ChannelConnectionsSection() {
  const { selectedProjectId, projects, updateProject } = useProjectStore();
  const project = projects.find(p => p.id === selectedProjectId);
  const metaConnectionInfo = project?.meta_credentials ?? null;

  // One-time migration from localStorage to DB (non-destructive)
  useEffect(() => {
    if (!selectedProjectId || project?.meta_credentials) return;
    const saved = localStorage.getItem(`meta_credentials_${selectedProjectId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as MetaConnectionInfo;
        updateProject(selectedProjectId, { meta_credentials: parsed });
      } catch {
        // ignore parse errors
      }
    }
  }, [selectedProjectId, project?.meta_credentials, updateProject]);

  // Check URL params for Meta OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const metaConnected = params.get('meta_connected');
    if (metaConnected && selectedProjectId) {
      try {
        const connectionInfo = JSON.parse(decodeURIComponent(metaConnected)) as MetaConnectionInfo;
        updateProject(selectedProjectId, { meta_credentials: connectionInfo });
        window.history.replaceState({}, '', window.location.pathname);
        alert('Meta 계정이 연결되었습니다!');
      } catch {
        // ignore parse errors
      }
    }
    const metaError = params.get('meta_error');
    if (metaError) {
      alert(`Meta 연결 실패: ${metaError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [selectedProjectId, updateProject]);

  function disconnectMeta() {
    if (!selectedProjectId) return;
    updateProject(selectedProjectId, { meta_credentials: null });
  }

  const isMetaChannel = (id: string) => id === 'instagram' || id === 'facebook' || id === 'threads';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 size={16} />
          채널 연동
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          채널을 연동하면 ContentFlow에서 직접 콘텐츠를 발행할 수 있습니다.
        </p>

        <div className="grid gap-3">
          {CHANNELS.map((channel) => (
            <div
              key={channel.id}
              className="p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-4">
                {/* 플랫폼 아이콘 */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${channel.iconBg} ${channel.iconText}`}
                >
                  {channel.icon}
                </div>

                {/* 플랫폼 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{channel.name}</span>
                    {channel.manualOnly && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        수동 전용
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{channel.description}</p>
                  {/* Meta 연결 시 계정 정보 표시 */}
                  {isMetaChannel(channel.id) && metaConnectionInfo && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {channel.id === 'instagram' && metaConnectionInfo.pages?.[0]?.instagram && (
                        <span>@{metaConnectionInfo.pages[0].instagram.username}</span>
                      )}
                      {channel.id === 'facebook' && metaConnectionInfo.pages?.[0] && (
                        <span>{metaConnectionInfo.pages[0].name}</span>
                      )}
                      {channel.id === 'threads' && (
                        <span>{metaConnectionInfo.userName}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 연결 상태 + 버튼 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isMetaChannel(channel.id) && selectedProjectId ? (
                    metaConnectionInfo ? (
                      <>
                        <Badge variant="outline" className="text-xs text-green-600 border-green-500/40 gap-1">
                          <CheckCircle2 size={10} />
                          연결됨
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={disconnectMeta}
                        >
                          연결 해제
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge
                          variant="outline"
                          className="text-xs text-muted-foreground border-muted-foreground/30"
                        >
                          미연결
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => window.location.href = '/api/auth/meta'}
                        >
                          <ExternalLink size={12} className="mr-1" />
                          Meta 연결
                        </Button>
                      </>
                    )
                  ) : (
                    <>
                      <Badge
                        variant="outline"
                        className="text-xs text-muted-foreground border-muted-foreground/30"
                      >
                        미연결
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="text-xs h-7 px-2 opacity-50"
                      >
                        <ExternalLink size={12} className="mr-1" />
                        연결
                      </Button>
                    </>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

