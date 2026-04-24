import { Tag, FolderNode, RootSource } from './types';

export const INITIAL_TAGS: Tag[] = [
  { id: '1', name: '重要', color: '#EF4444', icon: 'AlertCircle', isActive: true },
  { id: '2', name: '設計', color: '#3B82F6', icon: 'PenTool', isActive: true },
  { id: '3', name: '共有', color: '#10B981', icon: 'Share2', isActive: true },
  { id: '4', name: '確認', color: '#F59E0B', icon: 'CheckCircle', isActive: true },
  { id: '5', name: '保管', color: '#6B7280', icon: 'Archive', isActive: true },
];

export const INITIAL_SOURCES: RootSource[] = [
  { id: 'src-1', name: 'プロジェクトA', path: '/プロジェクトA', isActive: true },
];

export const MOCK_FOLDER_DATA: FolderNode = {
  id: 'root',
  name: 'プロジェクトA',
  path: '/プロジェクトA',
  tags: [],
  metadata: { description: 'ルートフォルダです', department: '', owner: '', remark: '' },
  children: [
    {
      id: 'f1',
      name: '01_企画',
      path: '/プロジェクトA/01_企画',
      tags: ['3'],
      metadata: { description: '企画関連の資料', department: '企画部', owner: '山田', remark: '' },
      children: [
        { id: 'f1-1', name: '01-01_市場調査', path: '/プロジェクトA/01_企画/01-01_市場調査', tags: ['3'], metadata: { description: '', department: '', owner: '', remark: '' } },
      ]
    },
    {
      id: 'f2',
      name: '02_設計',
      path: '/プロジェクトA/02_設計',
      tags: ['2'],
      metadata: { description: '設計に関する資料を格納するフォルダです。', department: '技術本部 設計部', owner: '山田 太郎', remark: '2024年度版' },
      children: [
        { id: 'f2-1', name: '02-01_基本設計', path: '/プロジェクトA/02_設計/02-01_基本設計', tags: ['2'], metadata: { description: '', department: '', owner: '', remark: '' } },
        { id: 'f2-2', name: '02-02_詳細設計', path: '/プロジェクトA/02_設計/02-02_詳細設計', tags: ['2'], metadata: { description: '', department: '', owner: '', remark: '' } },
        { id: 'f2-3', name: '02-03_レビュー資料', path: '/プロジェクトA/02_設計/02-03_レビュー資料', tags: ['3'], metadata: { description: '', department: '', owner: '', remark: '' } },
      ]
    },
    {
      id: 'f3',
      name: '03_実装',
      path: '/プロジェクトA/03_実装',
      tags: ['1'],
      metadata: { description: '実装フェーズ', department: '', owner: '', remark: '' },
      children: [
        { id: 'f3-1', name: '03-01_実装計画', path: '/プロジェクトA/03_実装/03-01_実装計画', tags: ['1'], metadata: { description: '', department: '', owner: '', remark: '' } },
        { id: 'f3-2', name: '03-02_実装記録', path: '/プロジェクトA/03_実装/03-02_実装記録', tags: ['1'], metadata: { description: '', department: '', owner: '', remark: '' } },
      ]
    },
    {
      id: 'f4',
      name: '04_品質管理',
      path: '/プロジェクトA/04_品質管理',
      tags: ['2'],
      metadata: { description: '', department: '', owner: '', remark: '' },
      children: [
        { id: 'f4-1', name: '04-01_検証記録', path: '/プロジェクトA/04_品質管理/04-01_検証記録', tags: ['1'], metadata: { description: '', department: '', owner: '', remark: '' } },
      ]
    },
    {
      id: 'f5',
      name: '05_その他',
      path: '/プロジェクトA/05_その他',
      tags: [],
      metadata: { description: '', department: '', owner: '', remark: '' },
    }
  ]
};
