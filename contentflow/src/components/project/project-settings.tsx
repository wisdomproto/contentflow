'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { WritingGuideSection } from './writing-guide-section';
import { ReferenceFilesSection } from './reference-files-section';
import { BgmSection } from './bgm-section';
import { ApiKeysSection } from './api-keys-section';
import { useProjectStore } from '@/stores/project-store';
import type { Project } from '@/types/database';
import { FileText, Paperclip, Music, Key, Globe } from 'lucide-react';
import { FunnelAnalyticsSection } from './funnel-analytics-section';

interface ProjectSettingsProps {
  project: Project;
}

export function ProjectSettings({ project }: ProjectSettingsProps) {
  const updateProject = useProjectStore((s) => s.updateProject);

  const handleUpdate = (updates: Partial<Project>) => {
    updateProject(project.id, updates);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">프로젝트 설정</p>
        </div>

        <Tabs defaultValue="reference-files">
          <TabsList>
            <TabsTrigger value="reference-files">
              <Paperclip size={14} className="mr-1.5" /> 컨텐츠 생성 참고 자료
            </TabsTrigger>
            <TabsTrigger value="writing-guide">
              <FileText size={14} className="mr-1.5" /> 글쓰기 가이드
            </TabsTrigger>
            <TabsTrigger value="bgm">
              <Music size={14} className="mr-1.5" /> BGM
            </TabsTrigger>
            <TabsTrigger value="api-keys">
              <Key size={14} className="mr-1.5" /> API 키
            </TabsTrigger>
            <TabsTrigger value="funnel-analytics">
              <Globe size={14} className="mr-1.5" /> 퍼널·분석
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="reference-files">
              <ReferenceFilesSection project={project} onUpdate={handleUpdate} />
            </TabsContent>
            <TabsContent value="writing-guide">
              <WritingGuideSection project={project} onUpdate={handleUpdate} />
            </TabsContent>
            <TabsContent value="bgm">
              <BgmSection project={project} onUpdate={handleUpdate} />
            </TabsContent>
            <TabsContent value="api-keys">
              <ApiKeysSection project={project} onUpdate={handleUpdate} />
            </TabsContent>
            <TabsContent value="funnel-analytics">
              <FunnelAnalyticsSection project={project} onUpdate={handleUpdate} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
