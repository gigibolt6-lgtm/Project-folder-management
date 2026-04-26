import React, { useState, useMemo, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  Settings, 
  X, 
  Info, 
  ChevronRight, 
  Folder, 
  FolderOpen,
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
  Globe,
  GripVertical,
  FolderPen
} from 'lucide-react';
import { hierarchy, tree } from 'd3-hierarchy';
import { cn } from './lib/utils';
import { Tag, FolderNode, AppState, TagMode, FolderMetadata, AppTheme } from './types';
import { INITIAL_TAGS, INITIAL_SOURCES, MOCK_FOLDER_DATA } from './constants';

// --- Icons Mapping ---
const ICON_MAP: Record<string, any> = {
  AlertCircle,
  PenTool,
  Share2,
  CheckCircle,
  Archive,
};

const NODE_FONT_FAMILY_MAP: Record<AppTheme['nodeFontFamily'], string> = {
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  notoSansJp: '"Noto Sans JP", system-ui, sans-serif',
  meiryo: 'Meiryo, system-ui, sans-serif',
  yuGothic: '"Yu Gothic", "YuGothic", system-ui, sans-serif',
  'sans-serif': 'sans-serif',
  monospace: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};

const getNodeFontFamily = (fontKey: AppTheme['nodeFontFamily']) =>
  NODE_FONT_FAMILY_MAP[fontKey] ?? NODE_FONT_FAMILY_MAP.system;

const isInteractiveElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, button, [contenteditable="true"]'));
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
  nodeSize: NodeSize;
  isSelected: boolean;
  isHighlighted: boolean;
  isExpanded: boolean;
  isEditMode: boolean;
  isDragTarget: boolean;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onOpenFolder: (folder: FolderNode) => void;
  onContextMenu: (event: React.MouseEvent, folder: FolderNode) => void;
  onQuickMenuOpen: (event: React.MouseEvent, folder: FolderNode) => void;
  onDragStart: (id: string) => void;
  onDragEnter: (id: string) => void;
  onDragLeave: (id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
  onNodeSizeChange: (id: string, size: { width: number; height: number }) => void;
  tags: Tag[];
  theme: AppTheme;
}

const FolderNodeComponent: React.FC<FolderNodeProps> = ({ 
  node, 
  nodeSize,
  isSelected, 
  isHighlighted,
  isExpanded,
  isEditMode,
  isDragTarget,
  onSelect,
  onToggleExpand,
  onOpenFolder,
  onContextMenu,
  onQuickMenuOpen,
  onDragStart,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragEnd,
  onNodeSizeChange,
  tags,
  theme
}) => {
  const data = node.data as FolderNode;
  const nodeTags = tags.filter(t => data.tags.includes(t.id));
  const hasChildren = (data.children?.length ?? 0) > 0;
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const minContentWidth = 66; // tag 3個分の目安
  const maxContentWidth = 220; // tag 10個分の目安
  const estimatedCharWidth = Math.max(6, theme.nodeFontSize * 0.62);
  const preferredContentWidth = Math.min(
    Math.max(data.name.length * estimatedCharWidth + 24, minContentWidth),
    maxContentWidth
  );

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const target = nodeRef.current;

    const notifySize = () => {
      const rect = target.getBoundingClientRect();
      onNodeSizeChange(data.id, {
        width: rect.width,
        height: rect.height
      });
    };

    notifySize();
    const observer = new ResizeObserver(() => notifySize());
    observer.observe(target);
    return () => observer.disconnect();
  }, [data.id, onNodeSizeChange, data.name, data.tags.length, isSelected, isHighlighted, isEditMode, isExpanded]);

  return (
    <motion.div
      ref={nodeRef}
      layoutId={`node-${data.id}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(data.id);
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.button === 2) {
          e.preventDefault();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isEditMode) {
          onContextMenu(e, data);
        }
      }}
      draggable={isEditMode}
      onDragStart={(e) => {
        if (!isEditMode) return;
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', data.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(data.id);
      }}
      onDragEnter={(e) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.stopPropagation();
        onDragEnter(data.id);
      }}
      onDragOver={(e) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDragLeave={(e) => {
        if (!isEditMode) return;
        e.stopPropagation();
        onDragLeave(data.id);
      }}
      onDrop={(e) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.stopPropagation();
        onDrop(data.id);
      }}
      onDragEnd={(e) => {
        if (!isEditMode) return;
        e.stopPropagation();
        onDragEnd();
      }}
      className={cn(
        "absolute flex items-center gap-2.5 p-2 bg-white rounded-lg border border-gray-200 transition-all cursor-pointer group shadow-sm hover:shadow-md",
        isEditMode ? "cursor-move" : "",
        isSelected ? "ring-2 ring-blue-500/20 z-20" : "",
        isHighlighted ? "ring-2 ring-blue-400/30 border-blue-400 z-10 bg-blue-50/30" : "",
        isEditMode ? "border-blue-200 bg-blue-50/20" : "",
        isDragTarget ? "ring-2 ring-blue-400 border-blue-400 bg-blue-100/40" : ""
      )}
      style={{
        left: node.y,
        top: node.x - nodeSize.height / 2,
        minWidth: '180px',
        borderColor: isSelected ? theme.focusColor : undefined
      }}
    >
      <button
        type="button"
        disabled={isEditMode}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          if (!isEditMode) onOpenFolder(data);
        }}
        title="フォルダを開く"
        aria-label="フォルダを開く"
        className={cn(
          "p-1.5 rounded transition-colors",
          isEditMode
            ? "bg-gray-50 text-gray-300 cursor-not-allowed"
            : "bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
        )}
      >
        <FolderOpen size={18} />
      </button>
      
      <div
        className="flex-1 overflow-hidden"
        style={{
          width: preferredContentWidth,
          minWidth: minContentWidth,
          maxWidth: maxContentWidth
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div
            className="font-bold break-words tracking-tight"
            style={{
              fontSize: `${theme.nodeFontSize}px`,
              color: theme.nodeTextColor,
              fontFamily: getNodeFontFamily(theme.nodeFontFamily),
              lineHeight: 1.2,
            }}
          >
            {data.name}
          </div>
          {isEditMode && <GripVertical size={12} className="text-blue-400 shrink-0" />}
          {isEditMode && (
            <button
              type="button"
              className="p-1 rounded hover:bg-blue-100 text-blue-500"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onQuickMenuOpen(event, data);
              }}
              title="編集メニュー"
              aria-label="編集メニュー"
            >
              <MoreVertical size={12} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-0.5 mt-1">
          {nodeTags.map(t => (
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

      {hasChildren ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            onToggleExpand(data.id);
          }}
          title={isExpanded ? '子フォルダを折りたたむ' : '子フォルダを展開'}
          aria-label={isExpanded ? '子フォルダを折りたたむ' : '子フォルダを展開'}
          className="w-6 h-6 shrink-0 rounded border border-gray-200 bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-center"
        >
          {isExpanded ? <Minus size={12} /> : <Plus size={12} />}
        </button>
      ) : (
        <div className="w-6 h-6 shrink-0" aria-hidden="true" />
      )}

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

type ContextMenuState = {
  x: number;
  y: number;
  folderId: string;
} | null;

type FolderDialogState =
  | { type: 'rename'; folderId: string; value: string }
  | { type: 'create'; folderId: string; value: string }
  | { type: 'delete'; folderId: string }
  | null;

type NodeSize = {
  width: number;
  height: number;
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
    selectLocalFolder: 'ローカルフォルダを選択',
    virtualRoot: '仮想ルート',
    promptFolderDisplayName: 'フォルダ表示名',
    promptFolderPath: 'フォルダパス (ローカルパス可)',
    promptTagName: 'タグ名',
    folderDescriptionPlaceholder: 'フォルダの説明...',
    assignHint: 'タグを付与するには、ツリーからフォルダを選択してください。',
    connectionTo: '接続先',
    online: 'オンライン',
    totalFolders: '総フォルダ数',
    statusSelected: '選択中',
    statusDescendants: '選択以下',
    statusMode: 'モード',
    statusNone: 'なし',
    browserNotSupported: 'お使いのブラウザはローカルフォルダの選択に対応していないか、セキュリティ動作が制限されています。Chrome/Edgeの最新版をご利用ください。',
    iframeRestriction: 'セキュリティ上の理由により、プレビュー画面（iframe）内ではローカルフォルダを選択できません。\n\n右上の「新規タブで開く」ボタンからアプリを別画面で開いてお試しください。',
    folderScanComplete: 'フォルダ「{name}」のスキャンが完了しました。',
    folderLoadError: 'フォルダの読み込み中にエラーが発生しました。',
    folderOpenFailed: 'フォルダを開けませんでした。ローカルフォルダを選択後にお試しください。',
    desktopOnlyFeature: 'この機能はデスクトップアプリ版で利用できます。',
    folderNotFound: 'フォルダが存在しません。',
    localFolder: 'ローカルフォルダ',
    bgColorLabel: 'バックグラウンドの色味',
    bgColorDesc: '全体背景のベースカラー',
    folderColorLabel: 'フォルダアイコンの色味',
    folderColorDesc: 'フォルダアイコンの基本色',
    focusColorLabel: '強調フォーカスの色味',
    focusColorDesc: '選択・ハイライト時の強調色',
    lineColorLabel: '連結ラインの色味',
    lineColorDesc: 'フォルダ同士を繋ぐ線の色',
    treeViewSettings: 'ツリー表示設定',
    nodeHorizontalGapLabel: 'ノード横間隔',
    nodeHorizontalGapDesc: '親子ノード間の左右の距離',
    nodeVerticalGapLabel: 'ノード縦間隔',
    nodeVerticalGapDesc: '同階層ノード同士の上下の距離',
    nodeFontSizeLabel: 'フォントサイズ',
    nodeFontSizeDesc: 'フォルダ名の文字サイズ',
    nodeFontFamilyLabel: 'フォント',
    nodeFontFamilyDesc: 'フォルダ名に使う書体',
    nodeTextColorLabel: '文字色',
    nodeTextColorDesc: 'フォルダ名の色',
    fontSystem: 'システム標準',
    fontNotoSansJp: 'Noto Sans JP',
    fontMeiryo: 'Meiryo',
    fontYuGothic: 'Yu Gothic',
    fontSansSerif: 'sans-serif',
    fontMonospace: 'monospace',
    folderEditModeSettings: 'フォルダ編集モード',
    folderEditModeTitle: 'フォルダ編集モード',
    folderEditModeDescription: 'ONにするとドラッグ移動・右クリック編集（名前変更/子作成/削除）が有効になります。',
    folderEditModeOn: 'フォルダ編集モード ON',
    folderEditModeHint: 'ドラッグでフォルダ移動、右クリックで編集できます',
    renameFolder: 'フォルダ名変更',
    createChildFolder: '子フォルダ作成',
    deleteFolder: 'フォルダ削除',
    cancel: 'キャンセル',
    rename: '変更',
    create: '作成',
    delete: '削除',
    createChildFolderDescription: '選択中のフォルダ内に新しい子フォルダを作成します',
    confirmDeleteFolder: 'このフォルダを削除しますか？',
    confirmDeleteWarning: 'この操作により配下のファイル・フォルダも削除されます（ゴミ箱移動ではありません）。',
    emptyFolderName: 'フォルダ名を入力してください',
    invalidFolderName: 'フォルダ名に使用できない文字が含まれています',
    folderNameUnchanged: '名前が変更されていません',
    folderAlreadyExists: '同じ名前のフォルダが既に存在します',
    cannotMoveToSelf: 'このフォルダは自身の配下へ移動できません',
    cannotMoveRoot: 'ルートフォルダは移動できません',
    moveFailed: 'フォルダの移動に失敗しました。アクセス権限を確認してください',
    renameFailed: 'フォルダ名変更に失敗しました',
    createFailed: '子フォルダ作成に失敗しました',
    deleteFailed: 'フォルダ削除に失敗しました',
    editModeTagDisabled: 'フォルダ編集モード中はタグ操作できません',
    operationNotSupported: 'このブラウザ環境ではフォルダ編集の一部操作に制約があります',
    langName_ja: '日本語',
    langName_en: '英語',
    langName_th: 'タイ語',
    langName_zh: '中国語',
    langName_tl: 'タガログ語',
    langName_pl: 'ポーランド語',
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
    selectLocalFolder: 'Select Local Folder',
    virtualRoot: 'Virtual Root',
    promptFolderDisplayName: 'Folder display name',
    promptFolderPath: 'Folder path (local path allowed)',
    promptTagName: 'Tag name',
    folderDescriptionPlaceholder: 'Folder description...',
    assignHint: 'Select a folder from the tree to assign tags.',
    connectionTo: 'Connected to',
    online: 'Online',
    totalFolders: 'Total folders',
    statusSelected: 'Selected',
    statusDescendants: 'Under selected',
    statusMode: 'Mode',
    statusNone: 'None',
    browserNotSupported: 'Your browser does not support local folder selection or security policies are restricting it. Please use the latest Chrome/Edge.',
    iframeRestriction: 'For security reasons, local folders cannot be selected in the preview (iframe).\n\nPlease open the app in a separate tab using the top-right button and try again.',
    folderScanComplete: 'Finished scanning folder "{name}".',
    folderLoadError: 'An error occurred while loading the folder.',
    folderOpenFailed: 'Could not open the folder. Please try after selecting a local folder.',
    desktopOnlyFeature: 'This feature is available in the desktop app.',
    folderNotFound: 'Folder does not exist.',
    localFolder: 'Local Folder',
    bgColorLabel: 'Background color',
    bgColorDesc: 'Base color of the app background',
    folderColorLabel: 'Folder icon color',
    folderColorDesc: 'Primary color of folder icons',
    focusColorLabel: 'Focus highlight color',
    focusColorDesc: 'Accent color for selection/highlight',
    lineColorLabel: 'Connector line color',
    lineColorDesc: 'Color of lines connecting folders',
    treeViewSettings: 'Tree View Settings',
    nodeHorizontalGapLabel: 'Horizontal node gap',
    nodeHorizontalGapDesc: 'Left-right distance between parent and child nodes',
    nodeVerticalGapLabel: 'Vertical node gap',
    nodeVerticalGapDesc: 'Top-bottom distance between sibling nodes',
    nodeFontSizeLabel: 'Font size',
    nodeFontSizeDesc: 'Folder name text size',
    nodeFontFamilyLabel: 'Font',
    nodeFontFamilyDesc: 'Typeface used for folder names',
    nodeTextColorLabel: 'Text color',
    nodeTextColorDesc: 'Folder name text color',
    fontSystem: 'System default',
    fontNotoSansJp: 'Noto Sans JP',
    fontMeiryo: 'Meiryo',
    fontYuGothic: 'Yu Gothic',
    fontSansSerif: 'sans-serif',
    fontMonospace: 'monospace',
    folderEditModeSettings: 'Folder Edit Mode',
    folderEditModeTitle: 'Folder Edit Mode',
    folderEditModeDescription: 'When ON, drag/move and context menu edits (rename/create child/delete) are enabled.',
    folderEditModeOn: 'Folder Edit Mode ON',
    folderEditModeHint: 'Drag to move folders, right-click to edit',
    renameFolder: 'Rename Folder',
    createChildFolder: 'Create Child Folder',
    deleteFolder: 'Delete Folder',
    cancel: 'Cancel',
    rename: 'Rename',
    create: 'Create',
    delete: 'Delete',
    createChildFolderDescription: 'Create a new child folder inside the selected folder.',
    confirmDeleteFolder: 'Do you want to delete this folder?',
    confirmDeleteWarning: 'All nested files and folders will be permanently deleted (not moved to trash).',
    emptyFolderName: 'Please enter a folder name',
    invalidFolderName: 'Folder name contains invalid characters',
    folderNameUnchanged: 'Folder name was not changed',
    folderAlreadyExists: 'A folder with the same name already exists',
    cannotMoveToSelf: 'This folder cannot be moved into itself',
    cannotMoveRoot: 'Root folder cannot be moved',
    moveFailed: 'Failed to move folder. Please check access permissions',
    renameFailed: 'Failed to rename folder',
    createFailed: 'Failed to create child folder',
    deleteFailed: 'Failed to delete folder',
    editModeTagDisabled: 'Tag actions are disabled while folder edit mode is ON',
    operationNotSupported: 'Some folder edit operations are not supported in this browser environment',
    langName_ja: 'Japanese',
    langName_en: 'English',
    langName_th: 'Thai',
    langName_zh: 'Chinese',
    langName_tl: 'Tagalog',
    langName_pl: 'Polish',
  },
  th: {
    appTitle: 'ตัวจัดการแท็กโครงสร้างเอกสาร',
    searchPlaceholder: 'ค้นหาโฟลเดอร์หรือแท็ก...',
    search: 'ค้นหา',
    infoPanelTitle: 'รายละเอียด',
    save: 'บันทึก',
    folderName: 'ชื่อโฟลเดอร์',
    fullPath: 'พาธเต็ม',
    description: 'คำอธิบาย',
    department: 'แผนก',
    owner: 'ผู้รับผิดชอบ',
    remark: 'หมายเหตุ',
    tags: 'แท็ก',
    assign: 'กำหนด',
    tagSearch: 'ค้นหา',
    newTag: 'ใหม่',
    noSelection: 'ยังไม่ได้เลือกโฟลเดอร์',
    settings: 'การตั้งค่า',
    rootSettings: 'การตั้งค่าโฟลเดอร์ราก',
    langSettings: 'การตั้งค่าภาษา',
    tagSettings: 'การตั้งค่าแท็ก',
    envSettings: 'การตั้งค่าสภาพแวดล้อม',
    regRoots: 'โฟลเดอร์รากที่ลงทะเบียน',
    addRoot: 'เพิ่มโฟลเดอร์ราก',
    addTag: 'เพิ่มแท็ก',
    colorEdit: 'ปรับแต่งสี',
    selectLocalFolder: 'เลือกโฟลเดอร์ภายในเครื่อง',
    virtualRoot: 'โฟลเดอร์รากเสมือน',
    promptFolderDisplayName: 'ชื่อที่แสดงของโฟลเดอร์',
    promptFolderPath: 'พาธโฟลเดอร์ (ใส่พาธในเครื่องได้)',
    promptTagName: 'ชื่อแท็ก',
    folderDescriptionPlaceholder: 'คำอธิบายโฟลเดอร์...',
    assignHint: 'เลือกโฟลเดอร์จากต้นไม้เพื่อกำหนดแท็ก',
    connectionTo: 'เชื่อมต่อกับ',
    online: 'ออนไลน์',
    totalFolders: 'จำนวนโฟลเดอร์ทั้งหมด',
    browserNotSupported: 'เบราว์เซอร์ของคุณไม่รองรับการเลือกโฟลเดอร์ในเครื่อง หรือถูกจำกัดด้วยนโยบายความปลอดภัย โปรดใช้ Chrome/Edge เวอร์ชันล่าสุด',
    iframeRestriction: 'ด้วยเหตุผลด้านความปลอดภัย ไม่สามารถเลือกโฟลเดอร์ในเครื่องจากหน้าพรีวิว (iframe) ได้\n\nโปรดเปิดแอปในแท็บใหม่จากปุ่มมุมขวาบนแล้วลองอีกครั้ง',
    folderScanComplete: 'สแกนโฟลเดอร์ \"{name}\" เสร็จสิ้นแล้ว',
    folderLoadError: 'เกิดข้อผิดพลาดขณะโหลดโฟลเดอร์',
    folderOpenFailed: 'ไม่สามารถเปิดโฟลเดอร์ได้ โปรดลองหลังจากเลือกโฟลเดอร์ในเครื่อง',
    localFolder: 'โฟลเดอร์ในเครื่อง',
    bgColorLabel: 'สีพื้นหลัง',
    bgColorDesc: 'สีพื้นฐานของพื้นหลังแอป',
    folderColorLabel: 'สีไอคอนโฟลเดอร์',
    folderColorDesc: 'สีหลักของไอคอนโฟลเดอร์',
    focusColorLabel: 'สีเน้นโฟกัส',
    focusColorDesc: 'สีเน้นสำหรับการเลือก/ไฮไลต์',
    lineColorLabel: 'สีเส้นเชื่อม',
    lineColorDesc: 'สีของเส้นที่เชื่อมโฟลเดอร์',
    langSelect: 'เลือกภาษา',
    langName_ja: 'ภาษาญี่ปุ่น',
    langName_en: 'ภาษาอังกฤษ',
    langName_th: 'ภาษาไทย',
    langName_zh: 'ภาษาจีน',
    langName_tl: 'ภาษาตากาล็อก',
    langName_pl: 'ภาษาโปแลนด์',
  },
  zh: {
    appTitle: '文档结构标签管理器',
    searchPlaceholder: '搜索文件夹或标签...',
    search: '搜索',
    infoPanelTitle: '详细信息',
    save: '保存',
    folderName: '文件夹名称',
    fullPath: '完整路径',
    description: '说明',
    department: '部门',
    owner: '负责人',
    remark: '备注',
    tags: '标签',
    assign: '分配',
    tagSearch: '搜索',
    newTag: '新建',
    noSelection: '未选择文件夹',
    settings: '设置',
    rootSettings: '根文件夹设置',
    langSettings: '语言设置',
    tagSettings: '标签设置',
    envSettings: '环境设置',
    regRoots: '已注册根目录',
    addRoot: '添加根文件夹',
    addTag: '添加标签',
    colorEdit: '颜色自定义',
    selectLocalFolder: '选择本地文件夹',
    virtualRoot: '虚拟根目录',
    promptFolderDisplayName: '文件夹显示名称',
    promptFolderPath: '文件夹路径（可输入本地路径）',
    promptTagName: '标签名称',
    folderDescriptionPlaceholder: '文件夹说明...',
    assignHint: '请先从树中选择一个文件夹再分配标签。',
    connectionTo: '连接到',
    online: '在线',
    totalFolders: '文件夹总数',
    browserNotSupported: '您的浏览器不支持本地文件夹选择，或受到安全策略限制。请使用最新版 Chrome/Edge。',
    iframeRestriction: '出于安全原因，无法在预览页面（iframe）中选择本地文件夹。\n\n请点击右上角按钮在新标签页打开应用后再试。',
    folderScanComplete: '文件夹“{name}”扫描完成。',
    folderLoadError: '加载文件夹时发生错误。',
    folderOpenFailed: '无法打开文件夹。请先选择本地文件夹后重试。',
    localFolder: '本地文件夹',
    bgColorLabel: '背景颜色',
    bgColorDesc: '应用背景的基础色',
    folderColorLabel: '文件夹图标颜色',
    folderColorDesc: '文件夹图标主色',
    focusColorLabel: '焦点高亮颜色',
    focusColorDesc: '选择/高亮时的强调色',
    lineColorLabel: '连接线颜色',
    lineColorDesc: '连接文件夹线条的颜色',
    langSelect: '选择语言',
    langName_ja: '日语',
    langName_en: '英语',
    langName_th: '泰语',
    langName_zh: '中文',
    langName_tl: '他加禄语',
    langName_pl: '波兰语',
  },
  tl: {
    appTitle: 'Tag Manager ng Istruktura ng Dokumento',
    searchPlaceholder: 'Maghanap ng folder o tag...',
    search: 'Maghanap',
    infoPanelTitle: 'Detalye',
    save: 'I-save',
    folderName: 'Pangalan ng Folder',
    fullPath: 'Buong Path',
    description: 'Paglalarawan',
    department: 'Departamento',
    owner: 'May-ari',
    remark: 'Puna',
    tags: 'Mga Tag',
    assign: 'I-assign',
    tagSearch: 'Maghanap',
    newTag: 'Bago',
    noSelection: 'Walang napiling folder',
    settings: 'Mga Setting',
    rootSettings: 'Setting ng Root Folder',
    langSettings: 'Setting ng Wika',
    tagSettings: 'Setting ng Tag',
    envSettings: 'Setting ng Environment',
    regRoots: 'Naka-rehistrong Root',
    addRoot: 'Magdagdag ng Root Folder',
    addTag: 'Magdagdag ng Tag',
    colorEdit: 'Pag-customize ng Kulay',
    selectLocalFolder: 'Pumili ng Lokal na Folder',
    virtualRoot: 'Virtual Root',
    promptFolderDisplayName: 'Display name ng folder',
    promptFolderPath: 'Path ng folder (puwedeng local path)',
    promptTagName: 'Pangalan ng tag',
    folderDescriptionPlaceholder: 'Paglalarawan ng folder...',
    assignHint: 'Pumili muna ng folder mula sa tree bago mag-assign ng tag.',
    connectionTo: 'Konektado sa',
    online: 'Online',
    totalFolders: 'Kabuuang Folder',
    browserNotSupported: 'Hindi suportado ng browser mo ang pagpili ng local folder o may security restriction. Gumamit ng pinakabagong Chrome/Edge.',
    iframeRestriction: 'Dahil sa seguridad, hindi maaaring pumili ng local folder sa preview (iframe).\n\nBuksan ang app sa bagong tab gamit ang button sa kanang-itaas at subukan muli.',
    folderScanComplete: 'Tapos na ang pag-scan sa folder na \"{name}\".',
    folderLoadError: 'May error habang nilo-load ang folder.',
    folderOpenFailed: 'Hindi mabuksan ang folder. Subukan muli matapos pumili ng local folder.',
    localFolder: 'Lokal na Folder',
    bgColorLabel: 'Kulay ng Background',
    bgColorDesc: 'Base na kulay ng background ng app',
    folderColorLabel: 'Kulay ng Icon ng Folder',
    folderColorDesc: 'Pangunahing kulay ng folder icons',
    focusColorLabel: 'Kulay ng Focus Highlight',
    focusColorDesc: 'Accent color para sa selection/highlight',
    lineColorLabel: 'Kulay ng Connecting Line',
    lineColorDesc: 'Kulay ng mga linyang nagdurugtong sa folders',
    langSelect: 'Pumili ng Wika',
    langName_ja: 'Hapon',
    langName_en: 'Ingles',
    langName_th: 'Thai',
    langName_zh: 'Tsino',
    langName_tl: 'Tagalog',
    langName_pl: 'Polish',
  },
  pl: {
    appTitle: 'Menedżer tagów struktury dokumentów',
    searchPlaceholder: 'Szukaj folderów lub tagów...',
    search: 'Szukaj',
    infoPanelTitle: 'Szczegóły',
    save: 'Zapisz',
    folderName: 'Nazwa folderu',
    fullPath: 'Pełna ścieżka',
    description: 'Opis',
    department: 'Dział',
    owner: 'Właściciel',
    remark: 'Uwagi',
    tags: 'Tagi',
    assign: 'Przypisz',
    tagSearch: 'Szukaj',
    newTag: 'Nowy',
    noSelection: 'Nie wybrano folderu',
    settings: 'Ustawienia',
    rootSettings: 'Ustawienia folderu głównego',
    langSettings: 'Ustawienia języka',
    tagSettings: 'Ustawienia tagów',
    envSettings: 'Ustawienia środowiska',
    regRoots: 'Zarejestrowane foldery główne',
    addRoot: 'Dodaj folder główny',
    addTag: 'Dodaj tag',
    colorEdit: 'Dostosowanie kolorów',
    selectLocalFolder: 'Wybierz folder lokalny',
    virtualRoot: 'Wirtualny folder główny',
    promptFolderDisplayName: 'Nazwa wyświetlana folderu',
    promptFolderPath: 'Ścieżka folderu (może być lokalna)',
    promptTagName: 'Nazwa tagu',
    folderDescriptionPlaceholder: 'Opis folderu...',
    assignHint: 'Wybierz folder z drzewa, aby przypisać tagi.',
    connectionTo: 'Połączono z',
    online: 'Online',
    totalFolders: 'Łączna liczba folderów',
    browserNotSupported: 'Twoja przeglądarka nie obsługuje wyboru lokalnych folderów lub ogranicza to polityka bezpieczeństwa. Użyj najnowszej wersji Chrome/Edge.',
    iframeRestriction: 'Ze względów bezpieczeństwa nie można wybierać lokalnych folderów w podglądzie (iframe).\n\nOtwórz aplikację w nowej karcie przyciskiem w prawym górnym rogu i spróbuj ponownie.',
    folderScanComplete: 'Skanowanie folderu „{name}” zakończone.',
    folderLoadError: 'Wystąpił błąd podczas ładowania folderu.',
    folderOpenFailed: 'Nie udało się otworzyć folderu. Spróbuj ponownie po wybraniu folderu lokalnego.',
    localFolder: 'Folder lokalny',
    bgColorLabel: 'Kolor tła',
    bgColorDesc: 'Bazowy kolor tła aplikacji',
    folderColorLabel: 'Kolor ikony folderu',
    folderColorDesc: 'Główny kolor ikon folderów',
    focusColorLabel: 'Kolor podświetlenia fokusu',
    focusColorDesc: 'Kolor akcentu dla wyboru/podświetlenia',
    lineColorLabel: 'Kolor linii łączącej',
    lineColorDesc: 'Kolor linii łączących foldery',
    langSelect: 'Wybierz język',
    langName_ja: 'Japoński',
    langName_en: 'Angielski',
    langName_th: 'Tajski',
    langName_zh: 'Chiński',
    langName_tl: 'Tagalski',
    langName_pl: 'Polski',
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
      nodeHorizontalGap: 220,
      nodeVerticalGap: 110,
      nodeFontSize: 14,
      nodeFontFamily: 'system',
      nodeTextColor: '#111827',
    }
  });

  const t = (key: string, vars?: Record<string, string>) => {
    const template = TRANSLATIONS[state.language]?.[key] || TRANSLATIONS['en'][key] || key;
    if (!vars) return template;
    return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), template);
  };

  const [settingsCategory, setSettingsCategory] = useState<'root' | 'lang' | 'tags' | 'env' | 'edit'>('root');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [viewTransform, setViewTransform] = useState({ x: 100, y: 300, k: 1 });
  const containerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const folderHandleMapRef = useRef<Map<string, any>>(new Map());
  const [isFolderEditMode, setIsFolderEditMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [dialogState, setDialogState] = useState<FolderDialogState>(null);
  const [folderDialogInput, setFolderDialogInput] = useState('');
  const folderDialogInputRef = useRef<HTMLInputElement | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [nodeSizeMap, setNodeSizeMap] = useState<Record<string, NodeSize>>({});
  const MIN_TREE_ZOOM = 0.5;
  const MAX_TREE_ZOOM = 2;
  const TREE_ZOOM_STEP = 0.1;
  const THEME_STORAGE_KEY = 'project-folder-management-theme';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<AppTheme>;
      setState(prev => ({ ...prev, theme: { ...prev.theme, ...parsed } }));
    } catch (error) {
      console.warn('Failed to parse stored theme settings', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state.theme));
  }, [state.theme]);

  const createTag = useCallback((rawTagName: string) => {
    const name = rawTagName.trim();
    if (!name) return;

    const fallbackColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name,
      color: fallbackColors[state.tags.length % fallbackColors.length],
      isActive: true
    };
    setState(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
  }, [state.tags.length]);

  const updateNodePathRecursive = useCallback((node: FolderNode, parentPath: string): FolderNode => {
    const basePath = parentPath ? `${parentPath}/${node.name}` : `/${node.name}`;
    const normalizedPath = basePath.replace(/\/+/g, '/');
    return {
      ...node,
      path: normalizedPath,
      children: node.children?.map(child => updateNodePathRecursive(child, normalizedPath)),
    };
  }, []);

  const extractNodeFromTree = useCallback((nodes: FolderNode[], targetId: string): {
    nextNodes: FolderNode[];
    extractedNode: FolderNode | null;
  } => {
    let extractedNode: FolderNode | null = null;
    const nextNodes = nodes
      .map(node => {
        if (node.id === targetId) {
          extractedNode = node;
          return null;
        }
        if (!node.children?.length) return node;
        const { nextNodes: nextChildren, extractedNode: childExtracted } = extractNodeFromTree(node.children, targetId);
        if (childExtracted) extractedNode = childExtracted;
        return { ...node, children: nextChildren };
      })
      .filter((node): node is FolderNode => node !== null);
    return { nextNodes, extractedNode };
  }, []);

  const isDescendant = useCallback((sourceId: string, targetId: string) => {
    const findNode = (nodes: FolderNode[]): FolderNode | null => {
      for (const node of nodes) {
        if (node.id === sourceId) return node;
        if (node.children?.length) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    const sourceNode = findNode(state.items);
    if (!sourceNode) return false;
    const containsTarget = (node: FolderNode): boolean => {
      if (node.id === targetId) return true;
      return (node.children ?? []).some(containsTarget);
    };
    return (sourceNode.children ?? []).some(containsTarget);
  }, [state.items]);

  // --- Local Folder Scanning Logic ---
  const handleSelectLocalFolder = async () => {
    try {
      if (window.folderApi?.selectAndScanFolder) {
        const result = await window.folderApi.selectAndScanFolder();
        if (!result.ok) {
          if (!result.cancelled) {
            alert(result.message || t('folderLoadError'));
          }
          return;
        }
        if (!result.folder) {
          alert(t('folderLoadError'));
          return;
        }

        const rootNode = result.folder;
        setState(prev => ({
          ...prev,
          items: [rootNode],
          expandedFolderIds: new Set([rootNode.id]),
          selectedFolderId: rootNode.id,
          sources: [
            ...prev.sources,
            { id: rootNode.id, name: rootNode.name, path: rootNode.path, isActive: true }
          ]
        }));
        alert(t('folderScanComplete', { name: rootNode.name }));
        return;
      }

      // Check if in iframe
      const isInIframe = window.self !== window.top;
      
      // @ts-ignore - File System Access API
      if (!window.showDirectoryPicker) {
        alert(t('browserNotSupported'));
        return;
      }

      if (isInIframe) {
        alert(t('iframeRestriction'));
        return;
      }

      // @ts-ignore
      const handle = await window.showDirectoryPicker();
      
      const joinFolderPath = (basePath: string, name: string) => {
        if (!basePath) return name;
        const separator = basePath.includes('\\') ? '\\' : '/';
        return `${basePath}${separator}${name}`;
      };

      const scan = async (dirHandle: any, parentPath: string): Promise<FolderNode> => {
        const nodeId = Math.random().toString(36).substring(2, 11);
        const nodePath = joinFolderPath(parentPath, dirHandle.name);
        const node: FolderNode = {
          id: nodeId,
          name: dirHandle.name,
          path: nodePath,
          tags: [],
          metadata: { description: '', department: '', owner: '', remark: '' },
          children: []
        };
        folderHandleMapRef.current.set(nodeId, dirHandle);

        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'directory') {
            const childNode = await scan(entry, node.path);
            node.children?.push(childNode);
          }
        }
        return node;
      };

      const absoluteRootPath = (handle as any).path as string | undefined;
      const rootParentPath = absoluteRootPath
        ? absoluteRootPath.replace(/[\\/]?[^\\/]+$/, '')
        : '';
      const rootNode = await scan(handle, rootParentPath);
      
      setState(prev => ({
        ...prev,
        items: [rootNode], // Replacing the current tree with the local one
        expandedFolderIds: new Set([rootNode.id]),
        selectedFolderId: rootNode.id,
        sources: [
          ...prev.sources,
          { id: rootNode.id, name: handle.name, path: rootNode.path, isActive: true }
        ]
      }));
      
      alert(t('folderScanComplete', { name: handle.name }));
      alert(t('desktopOnlyFeature'));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        alert(t('folderLoadError'));
      }
    }
  };

  useEffect(() => {
    const registerRoots = async () => {
      if (!window.folderApi?.registerRoot) return;
      for (const root of state.items) {
        try {
          console.log('[folder-root] register start', root.path);
          const result = await window.folderApi.registerRoot(root.path);
          if (!result.ok) {
            console.warn('[folder-root] register failed', root.path, result.message);
          }
        } catch (error) {
          console.warn('[folder-root] register error', root.path, error);
        }
      }
    };
    void registerRoots();
  }, [state.items]);

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

  const totalFolderCount = useMemo(() => {
    const countNodes = (node: FolderNode): number =>
      1 + (node.children?.reduce((sum, child) => sum + countNodes(child), 0) ?? 0);
    return state.items.reduce((sum, root) => sum + countNodes(root), 0);
  }, [state.items]);

  const selectedSubtreeCount = useMemo(() => {
    if (!selectedFolder) return null;
    const countNodes = (node: FolderNode): number =>
      1 + (node.children?.reduce((sum, child) => sum + countNodes(child), 0) ?? 0);
    return countNodes(selectedFolder);
  }, [selectedFolder]);

  const currentModeLabel = useMemo(() => {
    if (isFolderEditMode) {
      return t('folderEditModeTitle');
    }
    const tagMode = state.tagMode === 'search' ? 'search' : 'assign';
    const detailLabel = tagMode === 'search' ? t('tagSearch') : t('assign');
    return `${t('tags')} / ${detailLabel}`;
  }, [isFolderEditMode, state.tagMode, t]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2800);
  }, []);
  const isNodeDragEnabled = isFolderEditMode && !dialogState;

  const getFolderById = useCallback((id: string) => flatData.find(f => f.id === id), [flatData]);
  const normalizeClientPath = useCallback((value: string) => {
    const trimmed = value.trim().replace(/\\/g, '/').replace(/\/+/g, '/');
    if (!trimmed) return '';
    const normalized = trimmed.endsWith('/') && trimmed.length > 1 ? trimmed.slice(0, -1) : trimmed;
    return normalized.toLowerCase();
  }, []);
  const isSameOrChildPath = useCallback((candidatePath: string, rootPath: string) => {
    const candidate = normalizeClientPath(candidatePath);
    const root = normalizeClientPath(rootPath);
    if (!candidate || !root) return false;
    return candidate === root || candidate.startsWith(`${root}/`);
  }, [normalizeClientPath]);

  const INVALID_FOLDER_CHARS = /[\\/:*?"<>|]/;
  const sanitizeFolderName = (value: string) => value.trim();

  const findRootForPath = useCallback((targetPath: string): FolderNode | null => {
    for (const root of state.items) {
      if (isSameOrChildPath(targetPath, root.path)) {
        return root;
      }
    }
    return null;
  }, [isSameOrChildPath, state.items]);

  const findRootById = useCallback((folderId: string): FolderNode | null => {
    const folder = getFolderById(folderId);
    if (!folder) return null;
    return findRootForPath(folder.path);
  }, [findRootForPath, getFolderById]);

  const replaceRootByPath = useCallback((items: FolderNode[], rootPath: string, newRoot: FolderNode | null | undefined) => {
    if (!newRoot || !Array.isArray(newRoot.children)) return items;
    const normalizedRootPath = normalizeClientPath(rootPath);
    let replaced = false;
    const nextItems = items.map(root => {
      if (normalizeClientPath(root.path) === normalizedRootPath) {
        replaced = true;
        return newRoot;
      }
      return root;
    });
    return replaced ? nextItems : items;
  }, [normalizeClientPath]);

  // --- Tree Layout Calculation ---
  const treeData = useMemo(() => {
    const visibleNodes = flatData.filter(folder => {
      if (!folder.parentId) return true;
      let currentParentId = folder.parentId;
      while (currentParentId) {
        if (!state.expandedFolderIds.has(currentParentId)) return false;
        const parent = flatData.find(item => item.id === currentParentId);
        currentParentId = parent?.parentId ?? '';
      }
      return true;
    });
    const visibleSizeList = visibleNodes.map(folder => nodeSizeMap[folder.id]).filter(Boolean) as NodeSize[];
    const maxNodeHeight = visibleSizeList.length ? Math.max(...visibleSizeList.map(size => size.height)) : 72;
    const maxNodeWidth = visibleSizeList.length ? Math.max(...visibleSizeList.map(size => size.width)) : 220;

    const rootNode = hierarchy(state.items[0], (d) => {
      if (state.expandedFolderIds.has(d.id)) return d.children;
      return null;
    });
    
    // We want hierarchical layout going right
    const treeLayout = tree<FolderNode>()
      .nodeSize([
        Math.max(state.theme.nodeVerticalGap, maxNodeHeight + 12),
        Math.max(state.theme.nodeHorizontalGap, maxNodeWidth + 60)
      ])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));
      
    return treeLayout(rootNode);
  }, [state.items, state.expandedFolderIds, flatData, nodeSizeMap, state.theme.nodeHorizontalGap, state.theme.nodeVerticalGap]);

  const highlightedFolderIds = useMemo(() => {
    if (state.tagMode === 'search' && state.activeTagFilters.size > 0) {
      return new Set(flatData.filter(f => 
        Array.from(state.activeTagFilters).every(tId => f.tags.includes(tId))
      ).map(f => f.id));
    }
    return new Set<string>();
  }, [state.tagMode, state.activeTagFilters, flatData]);

  const handleNodeSizeChange = useCallback((id: string, size: NodeSize) => {
    setNodeSizeMap(prev => {
      const current = prev[id];
      if (current && Math.abs(current.width - size.width) < 1 && Math.abs(current.height - size.height) < 1) {
        return prev;
      }
      return { ...prev, [id]: size };
    });
  }, []);

  // --- Actions ---
  const handleSelectNode = useCallback((id: string) => {
    setState(prev => ({ ...prev, selectedFolderId: id }));

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

  const handleToggleExpand = useCallback((id: string) => {
    setState(prev => {
      const next = new Set(prev.expandedFolderIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { ...prev, expandedFolderIds: next };
    });
  }, []);

  const handleOpenFolder = useCallback(async (folder: FolderNode) => {
    try {
      if (!window.folderApi?.openFolder) {
        alert(t('desktopOnlyFeature'));
        return;
      }

      const result = await window.folderApi.openFolder(folder.path);
      if (!result.ok) {
        if (result.message?.includes('存在しません')) {
          alert(t('folderNotFound'));
          return;
        }
        alert(result.message || t('folderOpenFailed'));
      }
    } catch (error) {
      console.error(error);
      alert(t('folderOpenFailed'));
    }
  }, [t]);

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

  const handleMoveNode = useCallback(async (sourceId: string, targetId: string) => {
    if (!isFolderEditMode) return;
    const source = getFolderById(sourceId);
    const target = getFolderById(targetId);
    if (!source || !target) return;
    if (!source.parentId) return showToast(t('cannotMoveRoot'));
    if (sourceId === targetId || isDescendant(sourceId, targetId)) {
      return showToast(t('cannotMoveToSelf'));
    }

    try {
      console.log('[folder-edit] move start', source.path, target.path);
      if (!window.folderApi?.moveFolder || !window.folderApi?.scanFolderPath) {
        showToast(t('desktopOnlyFeature'));
        return;
      }
      const sourceRoot = findRootForPath(source.path);
      const destinationRoot = findRootForPath(target.path);
      if (!sourceRoot || !destinationRoot) {
        console.warn('[folder-edit] move root not found', source.path, target.path);
        showToast(t('folderLoadError'));
        return;
      }
      const moveResult = await window.folderApi.moveFolder(source.path, target.path);
      if (!moveResult.ok) {
        console.warn('[folder-edit] move failed', moveResult.message);
        showToast(moveResult.message || t('moveFailed'));
        return;
      }

      const rootPaths = Array.from(new Set([sourceRoot.path, destinationRoot.path]));
      for (const rootPath of rootPaths) {
        console.log('[folder-edit] rescan root', rootPath);
        const scanResult = await window.folderApi.scanFolderPath(rootPath);
        if (!scanResult.ok || !scanResult.folder) {
          console.warn('[folder-edit] move rescan failed', rootPath, scanResult.message);
          showToast(scanResult.message || t('folderLoadError'));
          return;
        }
        setState(prev => ({ ...prev, items: replaceRootByPath(prev.items, rootPath, scanResult.folder as FolderNode) }));
      }
    } catch (error) {
      console.error(error);
      showToast(t('moveFailed'));
    }
  }, [findRootForPath, getFolderById, isDescendant, isFolderEditMode, replaceRootByPath, showToast, t]);

  const executeRenameFolder = useCallback(async (folderId: string, rawName: string) => {
    if (!isFolderEditMode) return false;
    const folder = getFolderById(folderId);
    if (!folder || !folder.parentId) return false;
    const nextName = sanitizeFolderName(rawName);
    if (!nextName) {
      showToast(t('emptyFolderName'));
      return false;
    }
    if (INVALID_FOLDER_CHARS.test(nextName)) {
      showToast(t('invalidFolderName'));
      return false;
    }
    if (nextName === folder.name) {
      showToast(t('folderNameUnchanged'));
      return false;
    }

    try {
      console.log('[folder-edit] rename start', folder.path, nextName);
      if (!window.folderApi?.renameFolder || !window.folderApi?.scanFolderPath) {
        showToast(t('desktopOnlyFeature'));
        return false;
      }
      const rootFolder = findRootForPath(folder.path);
      if (!rootFolder) {
        console.warn('[folder-edit] rename root not found', folder.path);
        showToast(t('folderLoadError'));
        return false;
      }
      const renameResult = await window.folderApi.renameFolder(folder.path, nextName);
      if (!renameResult.ok) {
        console.warn('[folder-edit] rename failed', renameResult.message);
        showToast(renameResult.message || t('renameFailed'));
        return false;
      }

      console.log('[folder-edit] rescan root', rootFolder.path);
      const scanResult = await window.folderApi.scanFolderPath(rootFolder.path);
      if (!scanResult.ok || !scanResult.folder) {
        console.warn('[folder-edit] rename rescan failed', rootFolder.path, scanResult.message);
        showToast(scanResult.message || t('folderLoadError'));
        return false;
      }

      setState(prev => ({ ...prev, items: replaceRootByPath(prev.items, rootFolder.path, scanResult.folder as FolderNode) }));
      return true;
    } catch (error) {
      console.error(error);
      showToast(t('renameFailed'));
      return false;
    }
  }, [findRootForPath, getFolderById, isFolderEditMode, replaceRootByPath, showToast, t]);

  const executeCreateChildFolder = useCallback(async (folderId: string, rawName: string) => {
    if (!isFolderEditMode) return false;
    const folder = getFolderById(folderId);
    if (!folder) return false;
    const nextName = sanitizeFolderName(rawName);
    if (!nextName) {
      showToast(t('emptyFolderName'));
      return false;
    }
    if (INVALID_FOLDER_CHARS.test(nextName)) {
      showToast(t('invalidFolderName'));
      return false;
    }

    try {
      console.log('[folder-edit] create start', folder.path, nextName);
      if (!window.folderApi?.createFolder || !window.folderApi?.scanFolderPath) {
        showToast(t('desktopOnlyFeature'));
        return false;
      }
      const rootFolder = findRootForPath(folder.path);
      if (!rootFolder) {
        console.warn('[folder-edit] create root not found', folder.path);
        showToast(t('folderLoadError'));
        return false;
      }
      const createResult = await window.folderApi.createFolder(folder.path, nextName);
      if (!createResult.ok) {
        console.warn('[folder-edit] create failed', createResult.message);
        showToast(createResult.message || t('createFailed'));
        return false;
      }

      console.log('[folder-edit] rescan root', rootFolder.path);
      const scanResult = await window.folderApi.scanFolderPath(rootFolder.path);
      if (!scanResult.ok || !scanResult.folder) {
        console.warn('[folder-edit] create rescan failed', rootFolder.path, scanResult.message);
        showToast(scanResult.message || t('folderLoadError'));
        return false;
      }

      setState(prev => ({
        ...prev,
        items: replaceRootByPath(prev.items, rootFolder.path, scanResult.folder as FolderNode),
        expandedFolderIds: new Set([...prev.expandedFolderIds, folderId]),
      }));
      return true;
    } catch (error) {
      console.error(error);
      showToast(t('createFailed'));
      return false;
    }
  }, [findRootForPath, getFolderById, isFolderEditMode, replaceRootByPath, showToast, t]);

  const executeDeleteFolder = useCallback(async (folderId: string) => {
    if (!isFolderEditMode) return;
    const folder = getFolderById(folderId);
    if (!folder || !folder.parentId) return showToast(t('cannotMoveRoot'));
    try {
      console.log('[folder-edit] delete start', folder.path);
      if (!window.folderApi?.deleteFolder || !window.folderApi?.scanFolderPath) {
        showToast(t('desktopOnlyFeature'));
        return;
      }
      const rootFolder = findRootForPath(folder.path);
      if (!rootFolder) {
        console.warn('[folder-edit] delete root not found', folder.path);
        showToast(t('folderLoadError'));
        return;
      }
      const deleteResult = await window.folderApi.deleteFolder(folder.path);
      if (!deleteResult.ok) {
        console.warn('[folder-edit] delete failed', deleteResult.message);
        showToast(deleteResult.message || t('deleteFailed'));
        return;
      }

      console.log('[folder-edit] rescan root', rootFolder.path);
      const scanResult = await window.folderApi.scanFolderPath(rootFolder.path);
      if (!scanResult.ok || !scanResult.folder) {
        console.warn('[folder-edit] delete rescan failed', rootFolder.path, scanResult.message);
        showToast(scanResult.message || t('folderLoadError'));
        return;
      }

      const removedPrefix = normalizeClientPath(folder.path);
      setState(prev => ({
        ...prev,
        items: replaceRootByPath(prev.items, rootFolder.path, scanResult.folder as FolderNode),
        selectedFolderId: prev.selectedFolderId === folderId ? null : prev.selectedFolderId,
        expandedFolderIds: new Set(
          Array.from(prev.expandedFolderIds).filter(id => !normalizeClientPath(id).startsWith(removedPrefix))
        ),
      }));
    } catch (error) {
      console.error(error);
      showToast(t('deleteFailed'));
    }
  }, [findRootForPath, getFolderById, isFolderEditMode, normalizeClientPath, replaceRootByPath, showToast, t]);

  const toggleTag = (tagId: string) => {
    if (isFolderEditMode) {
      showToast(t('editModeTagDisabled'));
      return;
    }
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
      handleSelectNode(match.id);
    }
  };

  const handleNodeContextMenu = (e: React.MouseEvent, folder: FolderNode) => {
    if (!isFolderEditMode || dialogState) return;
    console.log('[context-menu] open', folder.id, folder.path);
    setState(prev => ({ ...prev, selectedFolderId: folder.id }));
    setContextMenu({ x: e.clientX, y: e.clientY, folderId: folder.id });
  };

  const handleDropToNode = async (targetId: string) => {
    if (!isFolderEditMode || !draggingNodeId || dialogState) return;
    try {
      const sourceNode = getFolderById(draggingNodeId);
      const targetNode = getFolderById(targetId);
      if (!sourceNode || !targetNode) return;
      if (sourceNode.id === targetNode.id) return;
      if (!sourceNode.parentId) {
        showToast(t('cannotMoveRoot'));
        return;
      }
      if (isDescendant(sourceNode.id, targetNode.id)) {
        showToast(t('cannotMoveToSelf'));
        return;
      }
      await handleMoveNode(draggingNodeId, targetId);
    } finally {
      setDragOverNodeId(null);
      setDraggingNodeId(null);
    }
  };

  const handleNodeDragStart = (nodeId: string) => {
    if (!isFolderEditMode || dialogState) return;
    console.log('[drag] start', nodeId);
    setContextMenu(null);
    setDraggingNodeId(nodeId);
    setDragOverNodeId(null);
  };

  const handleNodeDragEnter = (nodeId: string) => {
    if (!isFolderEditMode || !draggingNodeId || draggingNodeId === nodeId || dialogState) return;
    setDragOverNodeId(nodeId);
  };

  const handleNodeDragLeave = (nodeId: string) => {
    if (dragOverNodeId === nodeId) {
      setDragOverNodeId(null);
    }
  };

  const handleNodeDragEnd = () => {
    console.log('[drag] end');
    setDraggingNodeId(null);
    setDragOverNodeId(null);
  };

  const applyTreeZoom = useCallback((nextScale: number, anchor?: { x: number; y: number }) => {
    const clampedScale = Math.max(MIN_TREE_ZOOM, Math.min(MAX_TREE_ZOOM, nextScale));
    setViewTransform(prev => {
      if (!anchor) return { ...prev, k: clampedScale };
      const worldX = (anchor.x - prev.x) / prev.k;
      const worldY = (anchor.y - prev.y) / prev.k;
      return {
        x: anchor.x - worldX * clampedScale,
        y: anchor.y - worldY * clampedScale,
        k: clampedScale
      };
    });
  }, []);

  const handleTreeWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (dialogState) return;
    event.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const anchor = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    const direction = event.deltaY < 0 ? 1 : -1;
    const nextScale = viewTransform.k + direction * TREE_ZOOM_STEP;
    applyTreeZoom(nextScale, anchor);
  }, [applyTreeZoom, dialogState, viewTransform.k]);

  useEffect(() => {
    if (!contextMenu) return;
    if (dialogState) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!contextMenuRef.current) return;
      if (!contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;
      if (isTyping) return;
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu, dialogState]);

  useEffect(() => {
    if (dialogState && contextMenu) {
      setContextMenu(null);
    }
  }, [dialogState, contextMenu]);

  useEffect(() => {
    if (!dialogState) {
      setFolderDialogInput('');
      return;
    }
    if (dialogState.type === 'rename') {
      setFolderDialogInput(dialogState.value ?? '');
      return;
    }
    if (dialogState.type === 'create') {
      setFolderDialogInput('');
      return;
    }
    setFolderDialogInput('');
  }, [dialogState?.type, dialogState?.folderId]);

  const openFolderDialog = useCallback((nextDialog: FolderDialogState) => {
    setContextMenu(null);
    setDialogState(nextDialog);
  }, []);

  const submitFolderDialog = useCallback(async () => {
    if (!dialogState || (dialogState.type !== 'rename' && dialogState.type !== 'create')) return;
    const nextName = folderDialogInput.trim();
    if (!nextName) {
      showToast(t('emptyFolderName'));
      return;
    }
    const success = dialogState.type === 'rename'
      ? await executeRenameFolder(dialogState.folderId, nextName)
      : await executeCreateChildFolder(dialogState.folderId, nextName);
    if (success) setDialogState(null);
  }, [dialogState, executeCreateChildFolder, executeRenameFolder, folderDialogInput, showToast, t]);

  const focusFolderDialogInput = useCallback(async () => {
    try {
      await window.electronAPI?.focusAppWindow?.();
    } catch (error) {
      console.warn('[folder-dialog] focusAppWindow failed', error);
    }
    window.requestAnimationFrame(() => {
      const input = folderDialogInputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      input.select();
    });
  }, []);

  useLayoutEffect(() => {
    if (!dialogState || (dialogState.type !== 'rename' && dialogState.type !== 'create')) return;
    void focusFolderDialogInput();
  }, [dialogState?.type, dialogState?.folderId, focusFolderDialogInput]);

  
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
          {isFolderEditMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-2 shadow-sm">
              <div className="text-xs font-bold">{t('folderEditModeOn')}</div>
              <div className="text-[11px]">{t('folderEditModeHint')}</div>
            </div>
          )}
          
          {/* Tree View Canvas */}
          <div 
            ref={containerRef}
            className={cn(
              "w-full h-full relative z-10",
              isFolderEditMode ? "cursor-default" : "cursor-grab active:cursor-grabbing"
            )}
          onWheel={handleTreeWheel}
          onMouseDown={(e) => {
            if (dialogState) return;
            if (isFolderEditMode) return;
            if (isInteractiveElement(e.target)) return;
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
          onContextMenu={(e) => {
            if (dialogState) {
              e.preventDefault();
              e.stopPropagation();
            }
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
                  (() => {
                    const defaultNodeSize: NodeSize = { width: 220, height: 72 };
                    const sourceSize = nodeSizeMap[link.source.data.id] ?? defaultNodeSize;
                    const parentAnchorX = link.source.y + sourceSize.width;
                    const parentAnchorY = link.source.x;
                    const childAnchorX = link.target.y;
                    const childAnchorY = link.target.x;
                    const horizontalDistance = Math.max(childAnchorX - parentAnchorX, 0);
                    const curveOffset = Math.min(80, Math.max(40, horizontalDistance / 2));

                    return (
                      <motion.path
                        key={`${link.source.data.id}-${link.target.data.id}-${i}`}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        d={`M ${parentAnchorX} ${parentAnchorY}
                          C ${parentAnchorX + curveOffset} ${parentAnchorY},
                            ${childAnchorX - curveOffset} ${childAnchorY},
                            ${childAnchorX} ${childAnchorY}`}
                        fill="none"
                        stroke={highlightedFolderIds.has(link.target.data.id) ? state.theme.focusColor : state.theme.lineColor}
                        strokeWidth={highlightedFolderIds.has(link.target.data.id) ? "2" : "1.5"}
                      />
                    );
                  })()
                ))}
              </AnimatePresence>
            </svg>

            {/* Nodes */}
            <AnimatePresence mode="popLayout">
              {treeData.descendants().map((node) => (
                <FolderNodeComponent
                  key={node.data.id}
                  node={node}
                  nodeSize={nodeSizeMap[node.data.id] ?? { width: 220, height: 72 }}
                  isSelected={state.selectedFolderId === node.data.id}
                  isHighlighted={highlightedFolderIds.has(node.data.id)}
                  isExpanded={state.expandedFolderIds.has(node.data.id)}
                  isEditMode={isNodeDragEnabled}
                  isDragTarget={dragOverNodeId === node.data.id}
                  onSelect={handleSelectNode}
                  onToggleExpand={handleToggleExpand}
                  onOpenFolder={handleOpenFolder}
                  onContextMenu={handleNodeContextMenu}
                  onQuickMenuOpen={handleNodeContextMenu}
                  onDragStart={handleNodeDragStart}
                  onDragEnter={handleNodeDragEnter}
                  onDragLeave={handleNodeDragLeave}
                  onDrop={handleDropToNode}
                  onDragEnd={handleNodeDragEnd}
                  onNodeSizeChange={handleNodeSizeChange}
                  tags={state.tags}
                  theme={state.theme}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* View Controls */}
        <div
          className="absolute bottom-6 left-6 p-1 bg-white rounded-lg shadow-lg border border-gray-100 flex items-center gap-1 z-30"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button 
            onClick={() => applyTreeZoom(viewTransform.k + TREE_ZOOM_STEP)}
            className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
          >
            <Plus size={18} />
          </button>
          <button 
            onClick={() => applyTreeZoom(viewTransform.k - TREE_ZOOM_STEP)}
            className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
          >
            <Minus size={18} />
          </button>
          <div className="h-4 w-px bg-gray-200 mx-1" />
          <div className="text-[11px] font-bold text-gray-600 min-w-10 text-center">
            {Math.round(viewTransform.k * 100)}%
          </div>
          <div className="h-4 w-px bg-gray-200 mx-1" />
          <button 
            onClick={() => applyTreeZoom(1)}
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
                    placeholder={t('folderDescriptionPlaceholder')}
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
                  {t('assignHint')}
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
              </div>
            )}
          </section>
        </div>
      </aside>
    </main>

    {/* --- Bottom Status Bar --- */}
    <footer className="h-8 bg-gray-50 border-t border-gray-200 flex items-center px-4 shrink-0 z-50">
      <div className="flex items-center gap-2 min-w-0 text-[10px] text-gray-500 font-medium">
        <span className="shrink-0">
          {t('totalFolders')}: {totalFolderCount.toLocaleString()}
        </span>
        <span className="text-gray-300">|</span>
        <span className="shrink-0">{t('statusSelected')}:</span>
        <span className="min-w-0 max-w-40 truncate" title={selectedFolder?.name ?? t('statusNone')}>
          {selectedFolder?.name ?? t('statusNone')}
        </span>
        <span className="text-gray-300">|</span>
        <span className="shrink-0">
          {t('statusDescendants')}: {selectedSubtreeCount?.toLocaleString() ?? '-'}
        </span>
        <span className="text-gray-300">|</span>
        <span className="shrink-0">{t('statusMode')}: {currentModeLabel}</span>
      </div>
    </footer>

    {contextMenu && isFolderEditMode && !dialogState && (
      <div
        ref={contextMenuRef}
        className="fixed z-[9999] min-w-44 bg-white border border-gray-200 rounded-lg shadow-xl p-1"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <button
          className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-100 rounded"
          onClick={() => {
            const folderId = contextMenu.folderId;
            const folder = getFolderById(folderId);
            console.log('[context-menu] rename click', folderId);
            if (!folder) {
              console.warn('[context-menu] rename target not found', folderId);
              showToast(t('folderNotFound'));
              setContextMenu(null);
              return;
            }
            openFolderDialog({ type: 'rename', folderId, value: folder.name ?? '' });
          }}
        >
          {t('renameFolder')}
        </button>
        <button
          className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-100 rounded"
          onClick={() => {
            const folderId = contextMenu.folderId;
            const folder = getFolderById(folderId);
            console.log('[context-menu] create click', folderId);
            if (!folder) {
              console.warn('[context-menu] create target not found', folderId);
              showToast(t('folderNotFound'));
              setContextMenu(null);
              return;
            }
            openFolderDialog({ type: 'create', folderId, value: '' });
          }}
        >
          {t('createChildFolder')}
        </button>
        <button
          className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded"
          onClick={() => {
            const folderId = contextMenu.folderId;
            const folder = getFolderById(folderId);
            console.log('[context-menu] delete click', folderId);
            if (!folder) {
              console.warn('[context-menu] delete target not found', folderId);
              showToast(t('folderNotFound'));
              setContextMenu(null);
              return;
            }
            openFolderDialog({ type: 'delete', folderId });
          }}
        >
          {t('deleteFolder')}
        </button>
      </div>
    )}

    {dialogState && typeof document !== 'undefined' && createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div
          className="absolute inset-0 z-[100] bg-black/30"
          onClick={() => {
            setDialogState(null);
          }}
        />
        <div
          draggable={false}
          className="relative z-[101] w-[420px] space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.stopPropagation()}
        >
          {dialogState.type === 'rename' && (
            <>
              <h3 className="text-lg font-bold text-gray-900">{t('renameFolder')}</h3>
              <input
                ref={folderDialogInputRef}
                draggable={false}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={folderDialogInput}
                onChange={(event) => setFolderDialogInput(event.target.value)}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  void focusFolderDialogInput();
                }}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  folderDialogInputRef.current?.focus({ preventScroll: true });
                }}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  const nativeEvent = event.nativeEvent as KeyboardEvent;
                  const isComposing = nativeEvent.isComposing || event.key === 'Process';
                  if (isComposing) return;
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setDialogState(null);
                    return;
                  }
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  void submitFolderDialog();
                }}
              />
              <div className="flex justify-end gap-2">
                <button draggable={false} className="px-3 py-1.5 text-sm text-gray-500" onClick={() => setDialogState(null)}>{t('cancel')}</button>
                <button
                  draggable={false}
                  className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg"
                  onClick={async () => {
                    await submitFolderDialog();
                  }}
                >
                  {t('rename')}
                </button>
              </div>
            </>
          )}

          {dialogState.type === 'create' && (
            <>
              <h3 className="text-lg font-bold text-gray-900">{t('createChildFolder')}</h3>
              <p className="text-xs text-gray-500">{t('createChildFolderDescription')}</p>
              <input
                ref={folderDialogInputRef}
                draggable={false}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={folderDialogInput}
                onChange={(event) => setFolderDialogInput(event.target.value)}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  void focusFolderDialogInput();
                }}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  folderDialogInputRef.current?.focus({ preventScroll: true });
                }}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  const nativeEvent = event.nativeEvent as KeyboardEvent;
                  const isComposing = nativeEvent.isComposing || event.key === 'Process';
                  if (isComposing) return;
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setDialogState(null);
                    return;
                  }
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  void submitFolderDialog();
                }}
              />
              <div className="flex justify-end gap-2">
                <button draggable={false} className="px-3 py-1.5 text-sm text-gray-500" onClick={() => setDialogState(null)}>{t('cancel')}</button>
                <button
                  draggable={false}
                  className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg"
                  onClick={async () => {
                    await submitFolderDialog();
                  }}
                >
                  {t('create')}
                </button>
              </div>
            </>
          )}

          {dialogState.type === 'delete' && (
            <>
              <h3 className="text-lg font-bold text-gray-900">{t('deleteFolder')}</h3>
              <p className="text-sm text-gray-700">{t('confirmDeleteFolder')}</p>
              <p className="text-xs text-red-600">{t('confirmDeleteWarning')}</p>
              <div className="flex justify-end gap-2">
                <button draggable={false} className="px-3 py-1.5 text-sm text-gray-500" onClick={() => setDialogState(null)}>{t('cancel')}</button>
                <button
                  draggable={false}
                  className="px-3 py-1.5 text-sm font-semibold text-white bg-red-600 rounded-lg"
                  onClick={async () => {
                    await executeDeleteFolder(dialogState.folderId);
                    setDialogState(null);
                  }}
                >
                  {t('delete')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>,
      document.body
    )}

    {toastMessage && (
      <div className="fixed bottom-12 right-6 z-[100] bg-gray-900 text-white text-xs px-4 py-2 rounded-lg shadow-xl">
        {toastMessage}
      </div>
    )}

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
              className="fixed top-0 right-0 h-full w-[860px] max-w-[calc(100vw-32px)] bg-white shadow-2xl z-[70] flex overflow-hidden"
            >
              <div className="w-[240px] shrink-0 bg-gray-50 border-r border-gray-100 flex flex-col p-6 space-y-2 overflow-y-auto">
                <div className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Settings size={18} className="text-blue-600" />
                  {t('settings')}
                </div>
                {[
                  { id: 'root', label: t('rootSettings'), icon: Folder },
                  { id: 'lang', label: t('langSettings'), icon: Globe },
                  { id: 'tags', label: t('tagSettings'), icon: PenTool },
                  { id: 'edit', label: t('folderEditModeSettings'), icon: FolderPen },
                  { id: 'env', label: t('envSettings'), icon: Settings },
                ].map((cat) => (
                  <button 
                    key={cat.id}
                    onClick={() => setSettingsCategory(cat.id as any)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs text-left transition-all min-w-0",
                      settingsCategory === cat.id 
                        ? "bg-white text-blue-600 shadow-sm border border-blue-100" 
                        : "text-gray-600 hover:bg-gray-100 border border-transparent"
                    )}
                  >
                    <cat.icon size={14} className="shrink-0" />
                    <span className="truncate whitespace-nowrap">{cat.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">
                    {settingsCategory === 'root' && t('rootSettings')}
                    {settingsCategory === 'lang' && t('langSettings')}
                    {settingsCategory === 'tags' && t('tagSettings')}
                    {settingsCategory === 'edit' && t('folderEditModeTitle')}
                    {settingsCategory === 'env' && t('envSettings')}
                  </h3>
                  <button 
                    onClick={() => setState(prev => ({ ...prev, isSettingsOpen: false }))}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-8 space-y-8 flex-1 overflow-y-auto overflow-x-hidden">
                   {/* Root Folder Category */}
                    {settingsCategory === 'root' && (
                     <div className="space-y-4">
                       <div className="flex items-center justify-between gap-3 flex-wrap">
                          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('regRoots')}</label>
                          <div className="flex items-center gap-2 min-w-0">
                            <button 
                              onClick={handleSelectLocalFolder}
                              className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                            >
                              <Folder size={14} />
                              {t('selectLocalFolder')}
                            </button>
                            <button 
                              onClick={() => {
                                const name = prompt(t('promptFolderDisplayName'));
                                const path = prompt(t('promptFolderPath'));
                                if (name && path) {
                                  const newSource = { id: `src-${Date.now()}`, name, path, isActive: true };
                                  setState(prev => ({ ...prev, sources: [...prev.sources, newSource] }));
                                }
                              }}
                              className="text-xs font-bold text-gray-500 hover:text-blue-600 hover:underline flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                            >
                              <Plus size={14} />
                              {t('virtualRoot')}
                            </button>
                          </div>
                       </div>
                       <div className="space-y-2">
                          {state.sources.map(src => (
                            <div key={src.id} className="flex items-center gap-3 min-w-0 p-3 bg-gray-50/50 rounded-xl border border-gray-100 group">
                              <Folder size={18} className="text-amber-500 shrink-0" />
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="text-sm font-bold text-gray-700 truncate" title={src.name}>{src.name}</div>
                                <div className="text-[10px] text-gray-400 font-mono truncate" title={src.path}>{src.path}</div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            { id: 'ja', label: t('langName_ja') },
                            { id: 'en', label: t('langName_en') },
                            { id: 'th', label: t('langName_th') },
                            { id: 'zh', label: t('langName_zh') },
                            { id: 'tl', label: t('langName_tl') },
                            { id: 'pl', label: t('langName_pl') },
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
                               setIsAddingTag(true);
                             }}
                             className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                           >
                             <Plus size={14} />
                             {t('addTag')}
                           </button>
                        </div>
                        {isAddingTag && (
                          <div className="flex items-center gap-2 p-3 bg-blue-50/40 border border-blue-100 rounded-xl">
                            <input
                              autoFocus
                              type="text"
                              value={newTagName}
                              placeholder={t('promptTagName')}
                              onChange={(e) => setNewTagName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  createTag(newTagName);
                                  setNewTagName('');
                                  setIsAddingTag(false);
                                }
                                if (e.key === 'Escape') {
                                  setNewTagName('');
                                  setIsAddingTag(false);
                                }
                              }}
                              className="flex-1 text-sm rounded-lg border border-blue-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                            />
                            <button
                              onClick={() => {
                                createTag(newTagName);
                                setNewTagName('');
                                setIsAddingTag(false);
                              }}
                              className="text-xs font-bold text-white bg-blue-600 px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              {t('addTag')}
                            </button>
                            <button
                              onClick={() => {
                                setNewTagName('');
                                setIsAddingTag(false);
                              }}
                              className="text-xs font-bold text-gray-500 hover:text-gray-700 px-2 py-2"
                            >
                              {t('cancel')}
                            </button>
                          </div>
                        )}
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

                   {/* Folder Edit Mode Category */}
                   {settingsCategory === 'edit' && (
                     <div className="space-y-5">
                       <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('folderEditModeTitle')}</label>
                       <div className="p-5 rounded-2xl border border-blue-100 bg-blue-50/40 space-y-3">
                         <p className="text-sm text-blue-900 font-medium">{t('folderEditModeDescription')}</p>
                         <button
                           onClick={() => setIsFolderEditMode(prev => !prev)}
                           className={cn(
                             "relative inline-flex h-7 w-14 items-center rounded-full transition-colors",
                             isFolderEditMode ? "bg-blue-600" : "bg-gray-300"
                           )}
                         >
                           <span
                             className={cn(
                               "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                               isFolderEditMode ? "translate-x-8" : "translate-x-1"
                             )}
                           />
                         </button>
                       </div>
                     </div>
                   )}

                   {/* Env Category */}
                   {settingsCategory === 'env' && (
                     <div className="space-y-6">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('treeViewSettings')}</label>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-bold text-gray-700">{t('nodeHorizontalGapLabel')}</div>
                                <div className="text-[10px] text-gray-400">{t('nodeHorizontalGapDesc')}</div>
                              </div>
                              <div className="text-[10px] font-mono text-gray-500">{state.theme.nodeHorizontalGap}px</div>
                            </div>
                            <input
                              type="range"
                              min={120}
                              max={360}
                              step={5}
                              value={state.theme.nodeHorizontalGap}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                setState(prev => ({ ...prev, theme: { ...prev.theme, nodeHorizontalGap: value } }));
                              }}
                              className="w-full mt-3"
                            />
                          </div>

                          <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-bold text-gray-700">{t('nodeVerticalGapLabel')}</div>
                                <div className="text-[10px] text-gray-400">{t('nodeVerticalGapDesc')}</div>
                              </div>
                              <div className="text-[10px] font-mono text-gray-500">{state.theme.nodeVerticalGap}px</div>
                            </div>
                            <input
                              type="range"
                              min={70}
                              max={180}
                              step={5}
                              value={state.theme.nodeVerticalGap}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                setState(prev => ({ ...prev, theme: { ...prev.theme, nodeVerticalGap: value } }));
                              }}
                              className="w-full mt-3"
                            />
                          </div>

                          <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-bold text-gray-700">{t('nodeFontSizeLabel')}</div>
                                <div className="text-[10px] text-gray-400">{t('nodeFontSizeDesc')}</div>
                              </div>
                              <div className="text-[10px] font-mono text-gray-500">{state.theme.nodeFontSize}px</div>
                            </div>
                            <input
                              type="range"
                              min={11}
                              max={18}
                              step={1}
                              value={state.theme.nodeFontSize}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                setState(prev => ({ ...prev, theme: { ...prev.theme, nodeFontSize: value } }));
                              }}
                              className="w-full mt-3"
                            />
                          </div>

                          <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl">
                            <div className="text-sm font-bold text-gray-700">{t('nodeFontFamilyLabel')}</div>
                            <div className="text-[10px] text-gray-400 mb-3">{t('nodeFontFamilyDesc')}</div>
                            <select
                              value={state.theme.nodeFontFamily}
                              onChange={(e) => {
                                setState(prev => ({
                                  ...prev,
                                  theme: { ...prev.theme, nodeFontFamily: e.target.value as AppTheme['nodeFontFamily'] }
                                }));
                              }}
                              className="w-full text-xs border border-gray-200 rounded p-2 bg-white"
                            >
                              <option value="system">{t('fontSystem')}</option>
                              <option value="notoSansJp">{t('fontNotoSansJp')}</option>
                              <option value="meiryo">{t('fontMeiryo')}</option>
                              <option value="yuGothic">{t('fontYuGothic')}</option>
                              <option value="sans-serif">{t('fontSansSerif')}</option>
                              <option value="monospace">{t('fontMonospace')}</option>
                            </select>
                          </div>

                          <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl flex items-center justify-between">
                            <div>
                              <div className="text-sm font-bold text-gray-700">{t('nodeTextColorLabel')}</div>
                              <div className="text-[10px] text-gray-400">{t('nodeTextColorDesc')}</div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-[10px] font-mono text-gray-400 uppercase">{state.theme.nodeTextColor}</div>
                              <input
                                type="color"
                                value={state.theme.nodeTextColor}
                                onChange={(e) => {
                                  setState(prev => ({ ...prev, theme: { ...prev.theme, nodeTextColor: e.target.value } }));
                                }}
                                className="w-10 h-10 rounded-xl overflow-hidden border-none cursor-pointer shadow-sm shadow-blue-500/10"
                              />
                            </div>
                          </div>
                        </div>

                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('colorEdit')}</label>
                        
                        <div className="grid grid-cols-1 gap-6">
                          {[
                            { key: 'backgroundColor', label: t('bgColorLabel'), desc: t('bgColorDesc') },
                            { key: 'folderColor', label: t('folderColorLabel'), desc: t('folderColorDesc') },
                            { key: 'focusColor', label: t('focusColorLabel'), desc: t('focusColorDesc') },
                            { key: 'lineColor', label: t('lineColorLabel'), desc: t('lineColorDesc') },
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
