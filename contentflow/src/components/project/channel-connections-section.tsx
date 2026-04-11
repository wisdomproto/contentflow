'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link2, ExternalLink, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useProjectStore } from '@/stores/project-store';

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
    id: 'wordpress',
    name: 'WordPress',
    icon: 'W',
    iconBg: 'bg-blue-600',
    iconText: 'text-white',
    description: 'REST API로 포스트 발행',
  },
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

function WordPressCredentialsForm({ projectId }: { projectId: string }) {
  const [wpUrl, setWpUrl] = useState('');
  const [wpUser, setWpUser] = useState('');
  const [wpPass, setWpPass] = useState('');
  const [wpConnected, setWpConnected] = useState(false);
  const [testing, setTesting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`wp_credentials_${projectId}`);
    if (saved) {
      try {
        const { siteUrl, username, appPassword } = JSON.parse(saved);
        setWpUrl(siteUrl || '');
        setWpUser(username || '');
        setWpPass(appPassword || '');
        setWpConnected(true);
      } catch {
        // ignore parse errors
      }
    }
  }, [projectId]);

  async function testConnection() {
    if (!wpUrl || !wpUser || !wpPass) {
      alert('URL, 사용자명, 앱 비밀번호를 모두 입력해주세요');
      return;
    }
    setTesting(true);
    try {
      const res = await fetch(`${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts?per_page=1`, {
        headers: {
          'Authorization': `Basic ${btoa(`${wpUser}:${wpPass}`)}`,
        },
      });
      if (res.ok) {
        alert('연결 성공!');
        setWpConnected(true);
      } else {
        alert('연결 실패: 인증 정보를 확인해주세요');
        setWpConnected(false);
      }
    } catch {
      alert('연결 실패: URL을 확인해주세요');
      setWpConnected(false);
    }
    setTesting(false);
  }

  function saveCredentials() {
    if (!wpUrl || !wpUser || !wpPass) {
      alert('URL, 사용자명, 앱 비밀번호를 모두 입력해주세요');
      return;
    }
    localStorage.setItem(
      `wp_credentials_${projectId}`,
      JSON.stringify({ siteUrl: wpUrl, username: wpUser, appPassword: wpPass })
    );
    setWpConnected(true);
    alert('저장되었습니다');
  }

  return (
    <div className="mt-2 space-y-3 border-t pt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">WordPress REST API 연동</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? '접기' : '설정'}
        </button>
      </div>

      {expanded && (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">사이트 URL</Label>
            <Input
              value={wpUrl}
              onChange={e => setWpUrl(e.target.value)}
              placeholder="https://example.com"
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">사용자명</Label>
            <Input
              value={wpUser}
              onChange={e => setWpUser(e.target.value)}
              placeholder="admin"
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">앱 비밀번호</Label>
            <Input
              type="password"
              value={wpPass}
              onChange={e => setWpPass(e.target.value)}
              placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
              className="h-7 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              WordPress 관리자 → 사용자 → 프로필 → 앱 비밀번호에서 생성
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs flex-1"
              onClick={testConnection}
              disabled={testing}
            >
              {testing ? '테스트 중...' : '연결 테스트'}
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={saveCredentials}
            >
              저장
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ChannelConnectionsSection() {
  const { selectedProjectId } = useProjectStore();

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
          OAuth 연동은 Phase 2에서 지원됩니다.
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
                </div>

                {/* 연결 상태 + 버튼 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {channel.id === 'wordpress' && selectedProjectId ? (
                    <WordPressStatusBadge projectId={selectedProjectId} />
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

              {/* WordPress 전용 자격증명 폼 */}
              {channel.id === 'wordpress' && selectedProjectId && (
                <WordPressCredentialsForm projectId={selectedProjectId} />
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground pt-1">
          * Phase 2에서 OAuth 2.0 기반 채널 연동이 지원될 예정입니다.
          현재는 API 키 탭에서 수동으로 토큰을 입력할 수 있습니다.
        </p>
      </CardContent>
    </Card>
  );
}

// WordPress 연결 상태 배지 (localStorage 읽기)
function WordPressStatusBadge({ projectId }: { projectId: string }) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`wp_credentials_${projectId}`);
    setConnected(!!saved);
  }, [projectId]);

  if (connected) {
    return (
      <Badge variant="outline" className="text-xs text-green-600 border-green-500/40 gap-1">
        <CheckCircle2 size={10} />
        연결됨
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">
      미연결
    </Badge>
  );
}
