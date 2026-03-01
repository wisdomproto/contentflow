'use client';

import { useUIStore } from '@/stores/useUIStore';
import { TabBar } from '@/components/tabs/TabBar';
import { BasicSettingsTab } from '@/components/tabs/BasicSettingsTab';
import { BlogTab } from '@/components/tabs/BlogTab';
import { CardNewsTab } from '@/components/tabs/CardNewsTab';
import { VideoTab } from '@/components/tabs/VideoTab';

export function MainEditor() {
  const activeTab = useUIStore((s) => s.activeTab);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <TabBar />
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'basic' && <BasicSettingsTab />}
        {activeTab === 'blog' && <BlogTab />}
        {activeTab === 'cardnews' && <CardNewsTab />}
        {activeTab === 'video' && <VideoTab />}
      </div>
    </div>
  );
}
