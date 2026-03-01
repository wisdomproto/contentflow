export interface Persona {
  tone: string;
  firstPerson: '나' | '저' | '필자';
  intro: string;
  style: '경어체' | '반말체' | '혼용';
  emoji: '많이' | '적당히' | '사용 안 함';
  blacklist: string[];
}

export interface FolderSettings {
  name: string;
  color: string;
  icon: string;
  naverCategory: string;
  mainKeywords: string[];
  seriesEnabled: boolean;
  seriesTitle: string;
  seriesCount: number;
}

export interface Folder {
  id: string;
  settings: FolderSettings;
  persona: Persona;
  contentIds: string[];
  isExpanded: boolean;
  createdAt: string;
  updatedAt: string;
}
