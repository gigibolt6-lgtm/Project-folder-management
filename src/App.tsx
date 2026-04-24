import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Settings, 
  X, 
  Info, 
  ChevronRight, 
  Folder, 
  MoreVertical,
  Plus,
  Minus,
  Maximize2,
  AlertCircle,
  PenTool,
  Share2,
  CheckCircle,
  Archive,
  Save,
  Trash2,
  Globe
} from 'lucide-react';
import { hierarchy, tree } from 'd3-hierarchy';
import { cn } from './lib/utils';
import { Tag, FolderNode, AppState, TagMode, FolderMetadata } from './types';
import { INITIAL_TAGS, INITIAL_SOURCES, MOCK_FOLDER_DATA } from './constants';

// --- Icons Mapping ---
const ICON_MAP: Record<string, any> = {
  AlertCircle,
  PenTool,
  Share2,
  CheckCircle,
  Archive,
};

// --- Components ---

const TagBadge = ({ tag, isSmall = false }: { tag: Tag, isSmall?: boolean }) => {
  const Icon = tag.icon ? ICON_MAP[tag.icon] : null;
  return (
    <div 
      className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white shadow-sm",
        isSmall ? "px-1 py-0" : ""
      )}
      style={{ backgroundColor: tag.color }}
    >
      {Icon && <Icon size={10} />}
      {!Icon || !isSmall ? <span>{tag.name}</span> : null}
    </div>
  );
};

interface FolderNodeProps {
  node: any;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: (id: string) => void;
  tags: Tag[];
  theme: any;
}

const FolderNodeComponent: React.FC<FolderNodeProps> = ({ 
  node, 
  isSelected, 
  isHighlighted,
  onSelect,
  tags,
  theme
}) => {
  const data = node.data as FolderNode;
  const nodeTags = tags.filter(t => data.tags.includes(t.id));

  return (
    <motion.div
      layoutId={`node-${data.id}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(data.id);
      }}
      className={cn(
        "absolute flex items-center gap-2.5 p-2 bg-white rounded-lg border border-gray-200 transition-all cursor-pointer group shadow-sm hover:shadow-md",
        isSelected ? "ring-2 ring-blue-500/20 z-20" : "",
        isHighlighted ? "ring-2 ring-blue-400/30 border-blue-400 z-10 bg-blue-50/30" : ""
      )}
      style={{
        left: node.y,
        top: node.x,
        transform: 'translateY(-50%)',
        minWidth: '160px',
        borderColor: isSelected ? theme.focusColor : undefined
      }}
    >
      <div className={cn(
        "p-1.5 rounded bg-gray-50 group-hover:bg-blue-50 transition-colors",
        isSelected && "bg-blue-50"
      )}
      style={isSelected ? { color: theme.focusColor } : { color: theme.folderColor }}>
        <Folder size={18} className={cn(isSelected ? "fill-current opacity-20" : "")} />
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="text-xs font-bold text-gray-900 truncate tracking-tight">{data.name}</div>
        <div className="flex flex-wrap gap-0.5 mt-1">
          {nodeTags.slice(0, 3).map(t => (
            <div 
              key={t.id} 
              className="px-1 py-0.5 rounded text-[8px] font-bold text-white uppercase"
              style={{ backgroundColor: t.color }}
            >
              {t.name[0]}
            </div>
          ))}
        </div>
      </div>

      {isSelected && (
        <motion.div 
          layoutId="focus-ring"
          className="absolute -inset-1 rounded-xl border-2 pointer-events-none"
          initial={false}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          style={{ borderColor: theme.focusColor }}
        />
      )}
    </motion.div>
  );
};

// --- Translation ---
const TRANSLATIONS: Record<string, Record<string, string>> = {
  ja: {
    appTitle: '資料構成タグ管理アプリ',
    searchPlaceholder: 'フォルダ名・タグを検索...',
    search: '検索',
    infoPanelTitle: '詳細情報',
    save: '保存',
    folderName: 'フォルダ名',
    fullPath: 'フルパス',
    description: '説明',
    department: '管理部署',
    owner: '担当者',
    remark: '備考',
    tags: 'タグ管理',
    assign: '付与',
    tagSearch: '検索',
    newTag: '新規',
    noSelection: '選択中フォルダなし',
    settings: '設定',
    rootSettings: 'ルートフォルダ設定',
    langSettings: 'ランゲージ設定',
    tagSettings: 'タグ設定',
    envSettings: '環境設定',
    regRoots: '登録済みルート',
    addRoot: 'ルートフォルダを追加',
    langSelect: '表示言語の選択',
    addTag: 'タグを追加',
    colorEdit: 'カラーカスタマイズ',
  },
  en: {
    appTitle: 'DocStructure TagManager',
    searchPlaceholder: 'Search folders or tags...',
    search: 'Search',
    infoPanelTitle: 'Details',
    save: 'Save',
    folderName: 'Folder Name',
    fullPath: 'Full Path',
    description: 'Description',
    department: 'Department',
    owner: 'Owner',
    remark: 'Remarks',
    tags: 'Tags',
    assign: 'Assign',
    tagSearch: 'Search',
    newTag: 'New',
    noSelection: 'No folder selected',
    settings: 'Settings',
    rootSettings: 'Root Folder Settings',
    langSettings: 'Language Settings',
    tagSettings: 'Tag Settings',
    envSettings: 'Environment Settings',
    regRoots: 'Registered Roots',
    addRoot: 'Add Root Folder',
    langSelect: 'Select Language',
    addTag: 'Add Tag',
    colorEdit: 'Color Customization',
  },
};

export default function App() {
  const [state, setState] = useState<AppState>({
    items: [MOCK_FOLDER_DATA],
    tags: INITIAL_TAGS,
    sources: INITIAL_SOURCES,
    selectedFolderId: 'f2',
    expandedFolderIds: new Set(['root', 'f2']),
    focusedFolderId: 'f2',
    tagMode: 'assign',
    activeTagFilters: new Set(),
    searchQuery: '',
    isSettingsOpen: false,
    language: 'ja',
    theme: {
      backgroundColor: '#F8FAFC',
      folderColor: '#F59E0B',
      focusColor: '#2563EB',
      lineColor: '#BFDBFE',
    }
  });

  const t = (key: string) => {
    return TRANSLATIONS[state.language]?.[key] || TRANSLATIONS['ja'][key] || key;
  };

  const [settingsCategory, setSettingsCategory] = useState<'root' | 'lang' | 'tags' | 'env'>('root');
  const [viewTransform, setViewTransform] = useState({ x: 100, y: 300, k: 1 });
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Local Folder Scanning Logic ---
  const handleSelectLocalFolder = async () => {
    try {
      // Check if in iframe
      const isInIframe = window.self !== window.top;
      
      // @ts-ignore - File System Access API
      if (!window.showDirectoryPicker) {
        alert('お使いのブラウザはローカルフォルダの選択に対応していないか、セキュリティ動作が制限されています。Chrome/Edgeの最新版をご利用ください。');
        return;
      }

      if (isInIframe) {
        alert('セキュリティ上の理由により、プレビュー画面（iframe）内ではローカルフォルダを選択できません。\n\n右上の「新規タブで開く」ボタンからアプリを別画面で開いてお試しください。');
        return;
      }

      // @ts-ignore
      const handle = await window.showDirectoryPicker();
      
      const scan = async (dirHandle: any, parentPath: string): Promise<FolderNode> => {
        const node: FolderNode = {
          id: Math.random().toString(36).substring(2, 11),
          name: dirHandle.name,
          path: `${parentPath}/${dirHandle.name}`,
          tags: [],
          metadata: { description: '', department: '', owner: '', remark: '' },
          children: []
        };

        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'directory') {
            const childNode = await scan(entry, node.path);
            node.children?.push(childNode);
          }
        }
        return node;
      };

      const rootNode = await scan(handle, '');
      
      setState(prev => ({
        ...prev,
        items: [rootNode], // Replacing the current tree with the local one
        expandedFolderIds: new Set([rootNode.id]),
        selectedFolderId: rootNode.id,
        sources: [
          ...prev.sources,
          { id: rootNode.id, name: handle.name, path: 'Local Folder', isActive: true }
        ]
      }));
      
      alert(`フォルダ「${handle.name}」のスキャンが完了しました。`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        alert('フォルダの読み込み中にエラーが発生しました。');
      }
    }
  };

  // --- Derived Data ---
  const flatData = useMemo(() => {
    const list: FolderNode[] = [];
    const traverse = (node: FolderNode, parentId?: string) => {
      const nodeWithParent = { ...node, parentId };
      list.push(nodeWithParent);
      node.children?.forEach(child => traverse(child, node.id));
    };
    state.items.forEach(item => traverse(item));
    return list;
  }, [state.items]);

  const selectedFolder = useMemo(() => 
    flatData.find(f => f.id === state.selectedFolderId)
  , [flatData, state.selectedFolderId]);

  // --- Tree Layout Calculation ---
  const treeData = useMemo(() => {
    const rootNode = hierarchy(state.items[0], (d) => {
      if (state.expandedFolderIds.has(d.id)) return d.children;
      return null;
    });
    
    // We want hierarchical layout going right
    const treeLayout = tree<FolderNode>()
      .nodeSize([80, 280]) // [height padding, width spacing]
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));
      
    return treeLayout(rootNode);
  }, [state.items, state.expandedFolderIds]);

  const highlightedFolderIds = useMemo(() => {
    if (state.tagMode === 'search' && state.activeTagFilters.size > 0) {
      return new Set(flatData.filter(f => 
        Array.from(state.activeTagFilters).every(tId => f.tags.includes(tId))
      ).map(f => f.id));
    }
    return new Set<string>();
  }, [state.tagMode, state.activeTagFilters, flatData]);

  // --- Actions ---
  const toggleNode = useCallback((id: string) => {
    setState(prev => {
      const next = new Set(prev.expandedFolderIds);
      const isAlreadyExpanded = next.has(id);
      
      if (prev.selectedFolderId === id) {
        // Second click behavior
        if (isAlreadyExpanded) {
          next.delete(id);
        } else {
          next.add(id);
        }
      } else {
        // First click behavior
        next.add(id);
      }
      
      return { ...prev, expandedFolderIds: next, selectedFolderId: id };
    });

    // Determine target camera position
    const node = treeData.descendants().find(d => d.data.id === id);
    if (node && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Move selected folder to 1/3 from left for comfortable viewing of children
      setViewTransform(prev => ({
        ...prev,
        x: rect.width / 3 - node.y * prev.k,
        y: rect.height / 2 - node.x * prev.k
      }));
    }
  }, [treeData]);

  const handleMetadataChange = (id: string, field: keyof FolderMetadata, value: string) => {
    setState(prev => {
      const updateItems = (nodes: FolderNode[]): FolderNode[] => 
        nodes.map(n => n.id === id 
          ? { ...n, metadata: { ...n.metadata, [field]: value } }
          : { ...n, children: n.children ? updateItems(n.children) : undefined }
        );
      return { ...prev, items: updateItems(prev.items) };
    });
  };

  const toggleTag = (tagId: string) => {
    if (state.tagMode === 'assign') {
      if (!state.selectedFolderId) return;
      setState(prev => {
        const updateItems = (nodes: FolderNode[]): FolderNode[] => 
          nodes.map(n => {
            if (n.id === prev.selectedFolderId) {
              const nextTags = n.tags.includes(tagId) 
                ? n.tags.filter(t => t !== tagId)
                : [...n.tags, tagId];
              return { ...n, tags: nextTags };
            }
            return { ...n, children: n.children ? updateItems(n.children) : undefined };
          });
        return { ...prev, items: updateItems(prev.items) };
      });
    } else {
      setState(prev => {
        const next = new Set(prev.activeTagFilters);
        if (next.has(tagId)) {
          next.delete(tagId);
        } else {
          next.add(tagId);
        }
        
        // Auto expand paths to highlighted nodes in search mode
        const expanded = new Set(prev.expandedFolderIds);
        if (next.size > 0) {
          flatData.forEach(f => {
            if (Array.from(next).every(tId => f.tags.includes(tId))) {
              // Add all parents
              let curr = f;
              while (curr.parentId) {
                const parent = flatData.find(p => p.id === curr.parentId);
                if (parent) {
                  expanded.add(parent.id);
                  curr = parent;
                } else break;
              }
            }
          });
        }

        return { ...prev, activeTagFilters: next, expandedFolderIds: expanded, selectedFolderId: null };
      });
    }
  };

  const handleSearch = () => {
    if (!state.searchQuery) return;
    const match = flatData.find(f => f.name.toLowerCase().includes(state.searchQuery.toLowerCase()));
    if (match) {
      // Expand parents
      const expanded = new Set(state.expandedFolderIds);
      let curr = match;
      while (curr.parentId) {
        const parent = flatData.find(p => p.id === curr.parentId);
        if (parent) {
          expanded.add(parent.id);
          curr = parent;
        } else break;
      }
      setState(prev => ({ ...prev, expandedFolderIds: expanded, selectedFolderId: match.id }));
      toggleNode(match.id);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F3F4F6] text-[#1F2937] overflow-hidden font-sans">
      {/* --- Top Header --- */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">D</div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900">
            {t('appTitle')}
          </h1>
        </div>
        
        <div className="flex-1 max-w-xl mx-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9 pr-24 py-1.5 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
            value={state.searchQuery}
            onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
          />
          <button 
            onClick={handleSearch}
            className="absolute right-1 top-1 bottom-1 bg-blue-600 text-white px-4 rounded-full text-xs font-bold hover:bg-blue-700 transition-colors"
          >
            {t('search')}
          </button>
        </div>

        <button 
          onClick={() => setState(prev => ({ ...prev, isSettingsOpen: true }))}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Settings size={20} className="text-gray-500" />
        </button>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* --- Central Area --- */}
        <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: state.theme.backgroundColor }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          
          {/* Tree View Canvas */}
          <div 
            ref={containerRef}
            className="w-full h-full cursor-grab active:cursor-grabbing relative z-10"
          onMouseDown={(e) => {
            const startX = e.clientX - viewTransform.x;
            const startY = e.clientY - viewTransform.y;
            const onMouseMove = (moveEvent: MouseEvent) => {
              setViewTransform(prev => ({
                ...prev,
                x: moveEvent.clientX - startX,
                y: moveEvent.clientY - startY
              }));
            };
            const onMouseUp = () => {
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
          }}
        >
          <motion.div 
            className="absolute"
            animate={{ 
              x: viewTransform.x, 
              y: viewTransform.y,
              scale: viewTransform.k 
            }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          >
            {/* SVG Lines */}
            <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0 }}>
              <AnimatePresence>
                {treeData.links().map((link, i) => (
                  <motion.path
                    key={`${link.source.data.id}-${link.target.data.id}`}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    d={`M ${link.source.y + 180} ${link.source.x} 
                       C ${link.source.y + 230} ${link.source.x}, 
                         ${link.target.y - 50} ${link.target.x}, 
                         ${link.target.y} ${link.target.x}`}
                    fill="none"
                    stroke={highlightedFolderIds.has(link.target.data.id) ? state.theme.focusColor : state.theme.lineColor}
                    strokeWidth={highlightedFolderIds.has(link.target.data.id) ? "2" : "1.5"}
                  />
                ))}
              </AnimatePresence>
            </svg>

            {/* Nodes */}
            <AnimatePresence mode="popLayout">
              {treeData.descendants().map((node) => (
                <FolderNodeComponent 
                  key={node.data.id}
                  node={node}
                  isSelected={state.selectedFolderId === node.data.id}
                  isHighlighted={highlightedFolderIds.has(node.data.id)}
                  onSelect={toggleNode}
                  tags={state.tags}
                  theme={state.theme}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* View Controls */}
        <div className="absolute bottom-6 left-6 p-1 bg-white rounded-lg shadow-lg border border-gray-100 flex items-center gap-1 z-30">
          <button 
            onClick={() => setViewTransform(prev => ({ ...prev, k: Math.min(prev.k + 0.1, 2) }))}
            className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
          >
            <Plus size={18} />
          </button>
          <button 
            onClick={() => setViewTransform(prev => ({ ...prev, k: Math.max(prev.k - 0.1, 0.5) }))}
            className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
          >
            <Minus size={18} />
          </button>
          <div className="h-4 w-px bg-gray-200 mx-1" />
          <button 
            onClick={() => setViewTransform({ x: 100, y: 300, k: 1 })}
            className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      {/* --- Right Sidebar (Info Panel) --- */}
      <aside className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 z-40 shadow-xl">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="font-bold text-xs uppercase tracking-widest text-gray-500">{t('infoPanelTitle')}</h2>
          <button className="text-blue-600 text-xs font-bold hover:underline">{t('save')}</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8">
          {selectedFolder ? (
            <section className="space-y-4 pb-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{t('folderName')}</label>
                <div className="text-sm font-bold text-gray-900 mt-0.5">{selectedFolder.name}</div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{t('fullPath')}</label>
                <div className="text-[11px] font-mono text-gray-500 bg-gray-100 p-2 rounded mt-1 break-all border border-gray-200">
                  {selectedFolder.path}
                </div>
              </div>
              
              <div className="space-y-4">
                 <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{t('description')}</label>
                  <textarea 
                    className="w-full mt-1 text-sm border-gray-200 rounded p-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    rows={3}
                    placeholder="フォルダの説明..."
                    value={selectedFolder.metadata.description}
                    onChange={(e) => handleMetadataChange(selectedFolder.id, 'description', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{t('department')}</label>
                    <input 
                      type="text" 
                      className="w-full mt-1 text-xs border-gray-200 rounded p-1.5 focus:ring-blue-500 outline-none bg-gray-50/50"
                      value={selectedFolder.metadata.department}
                      onChange={(e) => handleMetadataChange(selectedFolder.id, 'department', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{t('owner')}</label>
                    <input 
                      type="text" 
                      className="w-full mt-1 text-xs border-gray-200 rounded p-1.5 focus:ring-blue-500 outline-none bg-gray-50/50"
                      value={selectedFolder.metadata.owner}
                      onChange={(e) => handleMetadataChange(selectedFolder.id, 'owner', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{t('remark')}</label>
                  <textarea 
                    className="w-full mt-1 text-[11px] border-gray-200 rounded p-2 text-gray-500 leading-relaxed outline-none"
                    rows={2}
                    value={selectedFolder.metadata.remark}
                    onChange={(e) => handleMetadataChange(selectedFolder.id, 'remark', e.target.value)}
                  />
                </div>
              </div>
            </section>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-30 grayscale">
              <Folder size={40} className="text-gray-300" />
              <div className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">{t('noSelection')}</div>
            </div>
          )}

          {/* Tag Section - Always Visible */}
          <section className="pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('tags')}</label>
              <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                <button 
                  onClick={() => setState(prev => ({ ...prev, tagMode: 'assign' }))}
                  className={cn(
                    "px-2 py-1 text-[10px] rounded-md transition-all font-bold",
                    state.tagMode === 'assign' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"
                  )}
                >
                  {t('assign')}
                </button>
                <button 
                  onClick={() => setState(prev => ({ ...prev, tagMode: 'search' }))}
                  className={cn(
                    "px-2 py-1 text-[10px] rounded-md transition-all font-bold",
                    state.tagMode === 'search' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"
                  )}
                >
                  {t('tagSearch')}
                </button>
              </div>
            </div>

            {state.tagMode === 'assign' && !selectedFolder ? (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-3">
                <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  タグを付与するには、ツリーからフォルダを選択してください。
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {state.tags.map(tag => {
                  const isActive = state.tagMode === 'assign' 
                    ? (selectedFolder?.tags.includes(tag.id) ?? false)
                    : state.activeTagFilters.has(tag.id);
                  
                  return (
                    <button 
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border",
                        isActive 
                          ? "shadow-sm border-transparent" 
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                      )}
                      style={isActive ? { backgroundColor: tag.color, color: '#fff' } : {}}
                    >
                      {!isActive && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }}></span>}
                      {tag.name}
                      {isActive && <X size={12} className="ml-1 opacity-80" />}
                    </button>
                  );
                })}
                <button 
                  onClick={() => setSettingsCategory('tags')}
                  className="flex items-center gap-1 px-2.5 py-1.5 border border-dashed border-gray-200 text-gray-400 rounded-lg text-xs hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  <Plus size={12} />
                  {t('newTag')}
                </button>
              </div>
            )}
          </section>
        </div>
      </aside>
    </main>

    {/* --- Bottom Status Bar --- */}
    <footer className="h-8 bg-gray-50 border-t border-gray-200 flex items-center px-4 justify-between shrink-0 z-50">
      <div className="flex items-center gap-4">
        <span className="text-[10px] text-gray-500 font-medium">接続先: 192.168.1.10 (Online)</span>
        <span className="text-[10px] text-gray-500 font-medium">総フォルダ数: 1,284</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">System Diagnostic: OK</span>
      </div>
    </footer>

      {/* --- Settings Modal (Slide-out) --- */}
      <AnimatePresence>
        {state.isSettingsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setState(prev => ({ ...prev, isSettingsOpen: false }))}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-[800px] bg-white shadow-2xl z-[70] flex"
            >
              <div className="w-[240px] bg-gray-50 border-r border-gray-100 flex flex-col p-6 space-y-2">
                <div className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Settings size={18} className="text-blue-600" />
                  {t('settings')}
                </div>
                {[
                  { id: 'root', label: t('rootSettings'), icon: Folder },
                  { id: 'lang', label: t('langSettings'), icon: Globe },
                  { id: 'tags', label: t('tagSettings'), icon: PenTool },
                  { id: 'env', label: t('envSettings'), icon: Settings },
                ].map((cat) => (
                  <button 
                    key={cat.id}
                    onClick={() => setSettingsCategory(cat.id as any)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs text-left transition-all",
                      settingsCategory === cat.id 
                        ? "bg-white text-blue-600 shadow-sm border border-blue-100" 
                        : "text-gray-600 hover:bg-gray-100 border border-transparent"
                    )}
                  >
                    <cat.icon size={14} />
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">
                    {settingsCategory === 'root' && t('rootSettings')}
                    {settingsCategory === 'lang' && t('langSettings')}
                    {settingsCategory === 'tags' && t('tagSettings')}
                    {settingsCategory === 'env' && t('envSettings')}
                  </h3>
                  <button 
                    onClick={() => setState(prev => ({ ...prev, isSettingsOpen: false }))}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                   {/* Root Folder Category */}
                    {settingsCategory === 'root' && (
                     <div className="space-y-4">
                       <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('regRoots')}</label>
                          <div className="flex gap-2">
                            <button 
                              onClick={handleSelectLocalFolder}
                              className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-1.5 transition-colors"
                            >
                              <Folder size={14} />
                              ローカルフォルダを選択
                            </button>
                            <button 
                              onClick={() => {
                                const name = prompt('フォルダ表示名');
                                const path = prompt('フォルダパス (ローカルパス可)');
                                if (name && path) {
                                  const newSource = { id: `src-${Date.now()}`, name, path, isActive: true };
                                  setState(prev => ({ ...prev, sources: [...prev.sources, newSource] }));
                                }
                              }}
                              className="text-xs font-bold text-gray-500 hover:text-blue-600 hover:underline flex items-center gap-1 transition-colors"
                            >
                              <Plus size={14} />
                              仮想ルート
                            </button>
                          </div>
                       </div>
                       <div className="space-y-2">
                          {state.sources.map(src => (
                            <div key={src.id} className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100 group">
                              <Folder size={18} className="text-amber-500" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-gray-700">{src.name}</div>
                                <div className="text-[10px] text-gray-400 font-mono truncate">{src.path}</div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                                  <Trash2 size={14} onClick={() => setState(prev => ({ ...prev, sources: prev.sources.filter(s => s.id !== src.id) }))} />
                                </button>
                              </div>
                            </div>
                          ))}
                       </div>
                     </div>
                   )}

                   {/* Language Category */}
                   {settingsCategory === 'lang' && (
                     <div className="space-y-4">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('langSelect')}</label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'ja', label: '日本語' },
                            { id: 'en', label: 'English' },
                            { id: 'th', label: 'ไทย (Thai)' },
                            { id: 'zh', label: '中文 (Chinese)' },
                            { id: 'tl', label: 'Tagalog' },
                            { id: 'pl', label: 'Polski (Polish)' },
                          ].map((lang) => (
                            <button 
                              key={lang.id}
                              onClick={() => setState(prev => ({ ...prev, language: lang.id as any }))}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
                                state.language === lang.id 
                                  ? "border-blue-600 bg-blue-50/50" 
                                  : "border-gray-100 hover:border-gray-200"
                              )}
                            >
                              <span className={cn("text-sm font-bold", state.language === lang.id ? "text-blue-600" : "text-gray-600")}>
                                {lang.label}
                              </span>
                              {state.language === lang.id && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                            </button>
                          ))}
                        </div>
                     </div>
                   )}

                   {/* Tags Category */}
                   {settingsCategory === 'tags' && (
                     <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('tagSettings')}</label>
                           <button 
                             onClick={() => {
                               const name = prompt('タグ名');
                               if (name) {
                                 const newTag: Tag = { id: `tag-${Date.now()}`, name, color: '#3B82F6', isActive: true };
                                 setState(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
                               }
                             }}
                             className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                           >
                             <Plus size={14} />
                             {t('addTag')}
                           </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                           {state.tags.map(tag => (
                             <div key={tag.id} className="flex items-center gap-4 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl group">
                               <input 
                                 type="color" 
                                 value={tag.color} 
                                 onChange={(e) => {
                                   setState(prev => ({
                                     ...prev,
                                     tags: prev.tags.map(t => t.id === tag.id ? { ...t, color: e.target.value } : t)
                                   }));
                                 }}
                                 className="w-8 h-8 rounded-lg overflow-hidden border-none cursor-pointer"
                               />
                               <div className="flex-1 min-w-0">
                                 <input 
                                   type="text" 
                                   value={tag.name} 
                                   onChange={(e) => {
                                     setState(prev => ({
                                       ...prev,
                                       tags: prev.tags.map(t => t.id === tag.id ? { ...t, name: e.target.value } : t)
                                     }));
                                   }}
                                   className="text-sm font-bold text-gray-700 bg-transparent border-none outline-none focus:ring-0 w-full"
                                 />
                                 <div className="text-[10px] text-gray-400 font-mono uppercase">{tag.color}</div>
                               </div>
                               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button 
                                   onClick={() => setState(prev => ({ ...prev, tags: prev.tags.filter(t => t.id !== tag.id) }))}
                                   className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                 >
                                   <Trash2 size={16} />
                                 </button>
                               </div>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}

                   {/* Env Category */}
                   {settingsCategory === 'env' && (
                     <div className="space-y-6">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('colorEdit')}</label>
                        
                        <div className="grid grid-cols-1 gap-6">
                          {[
                            { key: 'backgroundColor', label: 'バックグラウンドの色味', desc: '全体背景のベースカラー' },
                            { key: 'folderColor', label: 'フォルダアイコンの色味', desc: 'フォルダアイコンの基本色' },
                            { key: 'focusColor', label: '強調フォーカスの色味', desc: '選択・ハイライト時の強調色' },
                            { key: 'lineColor', label: '連結ラインの色味', desc: 'フォルダ同士を繋ぐ線の色' },
                          ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-2xl">
                              <div className="flex-1">
                                <div className="text-sm font-bold text-gray-700">{item.label}</div>
                                <div className="text-[10px] text-gray-400">{item.desc}</div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-[10px] font-mono text-gray-400 uppercase">{(state.theme as any)[item.key]}</div>
                                <input 
                                  type="color" 
                                  value={(state.theme as any)[item.key]} 
                                  onChange={(e) => {
                                    setState(prev => ({
                                      ...prev,
                                      theme: { ...prev.theme, [item.key]: e.target.value }
                                    }));
                                  }}
                                  className="w-10 h-10 rounded-xl overflow-hidden border-none cursor-pointer shadow-sm shadow-blue-500/10"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                     </div>
                   )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
