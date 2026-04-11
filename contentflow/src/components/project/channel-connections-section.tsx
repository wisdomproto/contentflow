'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link2, ExternalLink } from 'lucide-react';

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

export function ChannelConnectionsSection() {
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
              className="flex items-center gap-4 p-3 rounded-lg border bg-card"
            >
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
              </div>
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
