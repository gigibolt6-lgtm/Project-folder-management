export interface Tag {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  isActive: boolean;
}

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  children?: FolderNode[];
  tags: string[]; // Tag IDs
  metadata: FolderMetadata;
}

export interface FolderMetadata {
  description: string;
  department: string;
  owner: string;
  remark: string;
}

export interface RootSource {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
}

export type TagMode = 'search' | 'assign';

export type AppLanguage = 'ja' | 'en' | 'th' | 'zh' | 'tl' | 'pl';

export interface AppTheme {
  backgroundColor: string;
  folderColor: string;
  focusColor: string;
  lineColor: string;
  nodeHorizontalGap: number;
  nodeVerticalGap: number;
  nodeFontSize: number;
  nodeFontFamily: 'system' | 'notoSansJp' | 'meiryo' | 'yuGothic' | 'sans-serif' | 'monospace';
  nodeTextColor: string;
}

export interface AppState {
  items: FolderNode[];
  tags: Tag[];
  sources: RootSource[];
  selectedFolderId: string | null;
  expandedFolderIds: Set<string>;
  focusedFolderId: string | null;
  tagMode: TagMode;
  activeTagFilters: Set<string>;
  searchQuery: string;
  isSettingsOpen: boolean;
  language: AppLanguage;
  theme: AppTheme;
}
