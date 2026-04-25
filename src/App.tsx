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
  Globe,
  GripVertical,
  FolderPen
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
  isEditMode: boolean;
  isDragTarget: boolean;
  onSelect: (id: string) => void;
  onOpenFolder: (folder: FolderNode) => void;
  tags: Tag[];
  theme: any;
}

const FolderNodeComponent: React.FC<FolderNodeProps> = ({ 
  node, 
  isSelected, 
  isHighlighted,
  isEditMode,
  isDragTarget,
  onSelect,
  onOpenFolder,
  tags,
  theme
}) => {
  const data = node.data as FolderNode;
  const nodeTags = tags.filter(t => data.tags.includes(t.id));
  const lastRightClickRef = useRef<number>(0);

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
      onMouseDown={(e) => {
        if (e.button !== 2) return;
        e.preventDefault();
        e.stopPropagation();
        const now = Date.now();
        if (now - lastRightClickRef.current <= 350) {
          onOpenFolder(data);
        }
        lastRightClickRef.current = now;
      }}
      onContextMenu={(e) => {
        e.preventDefault();
      }}
      className={cn(
        "absolute flex items-center gap-2.5 p-2 bg-white rounded-lg border border-gray-200 transition-all cursor-pointer group shadow-sm hover:shadow-md",
        isSelected ? "ring-2 ring-blue-500/20 z-20" : "",
        isHighlighted ? "ring-2 ring-blue-400/30 border-blue-400 z-10 bg-blue-50/30" : "",
        isEditMode ? "border-blue-200 bg-blue-50/20" : "",
        isDragTarget ? "ring-2 ring-blue-400 border-blue-400 bg-blue-100/40" : ""
      )}
      style={{
        left: node.y,
        top: node.x,
        transform: 'translateY(-50%)',
        minWidth: '160px',
        borderColor: isSelected ? theme.focusColor : undefined
      }}
    >
      <div
        className={cn(
          "p-1.5 rounded bg-gray-50 group-hover:bg-blue-50 transition-colors",
          isSelected && "bg-blue-50"
        )}
        style={isSelected ? { color: theme.focusColor } : { color: theme.folderColor }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onOpenFolder(data);
        }}
      >
        <Folder size={18} className={cn(isSelected ? "fill-current opacity-20" : "")} />
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-gray-900 truncate tracking-tight">{data.name}</div>
          {isEditMode && <GripVertical size={12} className="text-blue-400 shrink-0" />}
        </div>
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
    browserNotSupported: 'お使いのブラウザはローカルフォルダの選択に対応していないか、セキュリティ動作が制限されています。Chrome/Edgeの最新版をご利用ください。',
    iframeRestriction: 'セキュリティ上の理由により、プレビュー画面（iframe）内ではローカルフォルダを選択できません。\n\n右上の「新規タブで開く」ボタンからアプリを別画面で開いてお試しください。',
    folderScanComplete: 'フォルダ「{name}」のスキャンが完了しました。',
    folderLoadError: 'フォルダの読み込み中にエラーが発生しました。',
    folderOpenFailed: 'フォルダを開けませんでした。ローカルフォルダを選択後にお試しください。',
    localFolder: 'ローカルフォルダ',
    bgColorLabel: 'バックグラウンドの色味',
    bgColorDesc: '全体背景のベースカラー',
    folderColorLabel: 'フォルダアイコンの色味',
    folderColorDesc: 'フォルダアイコンの基本色',
    focusColorLabel: '強調フォーカスの色味',
    focusColorDesc: '選択・ハイライト時の強調色',
    lineColorLabel: '連結ラインの色味',
    lineColorDesc: 'フォルダ同士を繋ぐ線の色',
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
    browserNotSupported: 'Your browser does not support local folder selection or security policies are restricting it. Please use the latest Chrome/Edge.',
    iframeRestriction: 'For security reasons, local folders cannot be selected in the preview (iframe).\n\nPlease open the app in a separate tab using the top-right button and try again.',
    folderScanComplete: 'Finished scanning folder "{name}".',
    folderLoadError: 'An error occurred while loading the folder.',
    folderOpenFailed: 'Could not open the folder. Please try after selecting a local folder.',
    localFolder: 'Local Folder',
    bgColorLabel: 'Background color',
    bgColorDesc: 'Base color of the app background',
    folderColorLabel: 'Folder icon color',
    folderColorDesc: 'Primary color of folder icons',
    focusColorLabel: 'Focus highlight color',
    focusColorDesc: 'Accent color for selection/highlight',
    lineColorLabel: 'Connector line color',
    lineColorDesc: 'Color of lines connecting folders',
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
    }
  });

  const t = (key: string, vars?: Record<string, string>) => {
    const template = TRANSLATIONS[state.language]?.[key] || TRANSLATIONS['en'][key] || key;
    if (!vars) return template;
    return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), template);
  };

  const [settingsCategory, setSettingsCategory] = useState<'root' | 'lang' | 'tags' | 'env' | 'edit'>('root');
  const [viewTransform, setViewTransform] = useState({ x: 100, y: 300, k: 1 });
  const containerRef = useRef<HTMLDivElement>(null);
  const folderHandleMapRef = useRef<Map<string, any>>(new Map());

  // --- Local Folder Scanning Logic ---
  const handleSelectLocalFolder = async () => {
    try {
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
      
      const scan = async (dirHandle: any, parentPath: string): Promise<FolderNode> => {
        const nodeId = Math.random().toString(36).substring(2, 11);
        const node: FolderNode = {
          id: nodeId,
          name: dirHandle.name,
          path: `${parentPath}/${dirHandle.name}`,
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

      const rootNode = await scan(handle, '');
      
      setState(prev => ({
        ...prev,
        items: [rootNode], // Replacing the current tree with the local one
        expandedFolderIds: new Set([rootNode.id]),
        selectedFolderId: rootNode.id,
        sources: [
          ...prev.sources,
          { id: rootNode.id, name: handle.name, path: t('localFolder'), isActive: true }
        ]
      }));
      
      alert(t('folderScanComplete', { name: handle.name }));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        alert(t('folderLoadError'));
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

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2800);
  }, []);

  const getFolderById = useCallback((id: string) => flatData.find(f => f.id === id), [flatData]);

  const INVALID_FOLDER_CHARS = /[\\/:*?"<>|]/;
  const sanitizeFolderName = (value: string) => value.trim();

  const updateNodeAndDescendantPaths = (node: FolderNode, parentPath: string): FolderNode => {
    const nextPath = `${parentPath}/${node.name}`.replace(/\/+/g, '/');
    return {
      ...node,
      path: nextPath,
      children: node.children?.map(child => updateNodeAndDescendantPaths(child, nextPath))
    };
  };

  const remapHandlesForSubtree = useCallback(async (node: FolderNode, dirHandle: any) => {
    folderHandleMapRef.current.set(node.id, dirHandle);
    for (const child of node.children ?? []) {
      const childHandle = await dirHandle.getDirectoryHandle(child.name);
      await remapHandlesForSubtree(child, childHandle);
    }
  }, []);

  const removeHandlesForSubtree = (node: FolderNode) => {
    folderHandleMapRef.current.delete(node.id);
    (node.children ?? []).forEach(removeHandlesForSubtree);
  };

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

  const handleOpenFolder = useCallback(async (folder: FolderNode) => {
    try {
      const folderHandle = folderHandleMapRef.current.get(folder.id);
      // @ts-ignore
      if (folderHandle && window.showDirectoryPicker) {
        // @ts-ignore
        await window.showDirectoryPicker({ startIn: folderHandle });
        return;
      }

      const href = folder.path.startsWith('file://')
        ? folder.path
        : `file://${encodeURI(folder.path)}`;
      const openedWindow = window.open(href, '_blank', 'noopener,noreferrer');
      if (!openedWindow) {
        alert(t('folderOpenFailed'));
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
    const source = getFolderById(sourceId);
    const target = getFolderById(targetId);
    if (!source || !target) return;
    if (!source.parentId) return showToast(t('cannotMoveRoot'));
    if (sourceId === targetId || isDescendant(sourceId, targetId)) {
      return showToast(t('cannotMoveToSelf'));
    }

    try {
      const sourceParentHandle = folderHandleMapRef.current.get(source.parentId);
      const sourceHandle = folderHandleMapRef.current.get(sourceId);
      const targetHandle = folderHandleMapRef.current.get(targetId);
      if (!sourceParentHandle || !sourceHandle || !targetHandle) {
        return showToast(t('operationNotSupported'));
      }

      const canCreate = await ensureNoDuplicateFolder(targetHandle, source.name);
      if (!canCreate) return showToast(t('folderAlreadyExists'));

      const copiedHandle = await targetHandle.getDirectoryHandle(source.name, { create: true });
      const copyRecursive = async (fromDir: any, toDir: any) => {
        for await (const entry of fromDir.values()) {
          if (entry.kind === 'directory') {
            const child = await toDir.getDirectoryHandle(entry.name, { create: true });
            await copyRecursive(entry, child);
          } else if (entry.kind === 'file') {
            const file = await entry.getFile();
            const newFileHandle = await toDir.getFileHandle(entry.name, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(await file.arrayBuffer());
            await writable.close();
          }
        }
      };
      await copyRecursive(sourceHandle, copiedHandle);
      await sourceParentHandle.removeEntry(source.name, { recursive: true });

      setState(prev => ({
        ...prev,
        items: moveNodeInState(prev.items, sourceId, targetId),
        expandedFolderIds: new Set([...prev.expandedFolderIds, targetId]),
      }));

      const latestSource = getFolderById(sourceId);
      if (latestSource) {
        await remapHandlesForSubtree(latestSource, copiedHandle);
      }
    } catch (error) {
      console.error(error);
      showToast(t('moveFailed'));
    }
  }, [ensureNoDuplicateFolder, getFolderById, isDescendant, remapHandlesForSubtree, showToast, t]);

  const executeRenameFolder = useCallback(async (folderId: string, rawName: string) => {
    const folder = getFolderById(folderId);
    if (!folder || !folder.parentId) return;
    const nextName = sanitizeFolderName(rawName);
    if (!nextName) return showToast(t('emptyFolderName'));
    if (INVALID_FOLDER_CHARS.test(nextName)) return showToast(t('invalidFolderName'));
    if (nextName === folder.name) return showToast(t('folderNameUnchanged'));

    try {
      const parentHandle = folderHandleMapRef.current.get(folder.parentId);
      const sourceHandle = folderHandleMapRef.current.get(folderId);
      if (!parentHandle || !sourceHandle) return showToast(t('operationNotSupported'));
      const canCreate = await ensureNoDuplicateFolder(parentHandle, nextName);
      if (!canCreate) return showToast(t('folderAlreadyExists'));

      const targetHandle = await parentHandle.getDirectoryHandle(nextName, { create: true });
      const copyRecursive = async (fromDir: any, toDir: any) => {
        for await (const entry of fromDir.values()) {
          if (entry.kind === 'directory') {
            const child = await toDir.getDirectoryHandle(entry.name, { create: true });
            await copyRecursive(entry, child);
          } else if (entry.kind === 'file') {
            const file = await entry.getFile();
            const newFileHandle = await toDir.getFileHandle(entry.name, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(await file.arrayBuffer());
            await writable.close();
          }
        }
      };
      await copyRecursive(sourceHandle, targetHandle);
      await parentHandle.removeEntry(folder.name, { recursive: true });

      setState(prev => ({ ...prev, items: renameNodeInState(prev.items, folderId, nextName) }));
      await remapHandlesForSubtree({ ...folder, name: nextName }, targetHandle);
    } catch (error) {
      console.error(error);
      showToast(t('renameFailed'));
    }
  }, [ensureNoDuplicateFolder, getFolderById, remapHandlesForSubtree, showToast, t]);

  const executeCreateChildFolder = useCallback(async (folderId: string, rawName: string) => {
    const folder = getFolderById(folderId);
    if (!folder) return;
    const nextName = sanitizeFolderName(rawName);
    if (!nextName) return showToast(t('emptyFolderName'));
    if (INVALID_FOLDER_CHARS.test(nextName)) return showToast(t('invalidFolderName'));

    try {
      const parentHandle = folderHandleMapRef.current.get(folderId);
      if (!parentHandle) return showToast(t('operationNotSupported'));
      const canCreate = await ensureNoDuplicateFolder(parentHandle, nextName);
      if (!canCreate) return showToast(t('folderAlreadyExists'));

      const newHandle = await parentHandle.getDirectoryHandle(nextName, { create: true });
      const newNode: FolderNode = {
        id: Math.random().toString(36).substring(2, 11),
        name: nextName,
        path: `${folder.path}/${nextName}`,
        tags: [],
        metadata: { description: '', department: '', owner: '', remark: '' },
        children: []
      };

      setState(prev => ({
        ...prev,
        items: addChildNodeInState(prev.items, folderId, newNode),
        selectedFolderId: newNode.id,
        expandedFolderIds: new Set([...prev.expandedFolderIds, folderId]),
      }));
      folderHandleMapRef.current.set(newNode.id, newHandle);
    } catch (error) {
      console.error(error);
      showToast(t('createFailed'));
    }
  }, [ensureNoDuplicateFolder, getFolderById, showToast, t]);

  const executeDeleteFolder = useCallback(async (folderId: string) => {
    const folder = getFolderById(folderId);
    if (!folder || !folder.parentId) return showToast(t('cannotMoveRoot'));
    try {
      const parentHandle = folderHandleMapRef.current.get(folder.parentId);
      if (!parentHandle) return showToast(t('operationNotSupported'));
      await parentHandle.removeEntry(folder.name, { recursive: true });

      setState(prev => ({
        ...prev,
        items: deleteNodeInState(prev.items, folderId),
        selectedFolderId: prev.selectedFolderId === folderId ? folder.parentId : prev.selectedFolderId,
      }));
      removeHandlesForSubtree(folder);
    } catch (error) {
      console.error(error);
      showToast(t('deleteFailed'));
    }
  }, [getFolderById, showToast, t]);

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
      toggleNode(match.id);
    }
  };

  const handleNodeContextMenu = (e: React.MouseEvent, folder: FolderNode) => {
    if (!isFolderEditMode) return;
    setContextMenu({ x: e.clientX, y: e.clientY, folderId: folder.id });
  };

  const handleDropToNode = async (targetId: string) => {
    if (!isFolderEditMode || !draggingNodeId) return;
    setDragOverNodeId(null);
    if (draggingNodeId === targetId) return;
    await handleMoveNode(draggingNodeId, targetId);
    setDraggingNodeId(null);
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
          {isFolderEditMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-2 shadow-sm">
              <div className="text-xs font-bold">{t('folderEditModeOn')}</div>
              <div className="text-[11px]">{t('folderEditModeHint')}</div>
            </div>
          )}
          
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
                  isEditMode={isFolderEditMode}
                  isDragTarget={dragOverNodeId === node.data.id}
                  onSelect={toggleNode}
                  onOpenFolder={handleOpenFolder}
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
        <span className="text-[10px] text-gray-500 font-medium">{t('connectionTo')}: 192.168.1.10 ({t('online')})</span>
        <span className="text-[10px] text-gray-500 font-medium">
          {t('totalFolders')}: {flatData.length.toLocaleString()}
        </span>
      </div>
    </footer>

    {contextMenu && isFolderEditMode && (
      <div
        className="fixed z-[95] min-w-44 bg-white border border-gray-200 rounded-lg shadow-xl p-1"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        <button
          className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-100 rounded"
          onClick={() => {
            const folder = getFolderById(contextMenu.folderId);
            setDialogState({ type: 'rename', folderId: contextMenu.folderId, value: folder?.name ?? '' });
            setContextMenu(null);
          }}
        >
          {t('renameFolder')}
        </button>
        <button
          className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-100 rounded"
          onClick={() => {
            setDialogState({ type: 'create', folderId: contextMenu.folderId, value: '' });
            setContextMenu(null);
          }}
        >
          {t('createChildFolder')}
        </button>
        <button
          className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded"
          onClick={() => {
            setDialogState({ type: 'delete', folderId: contextMenu.folderId });
            setContextMenu(null);
          }}
        >
          {t('deleteFolder')}
        </button>
      </div>
    )}

    {dialogState && (
      <div className="fixed inset-0 z-[90] bg-black/30 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-[420px] p-6 space-y-4">
          {dialogState.type === 'rename' && (
            <>
              <h3 className="text-lg font-bold text-gray-900">{t('renameFolder')}</h3>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={dialogState.value}
                onChange={(e) => setDialogState({ ...dialogState, value: e.target.value })}
              />
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1.5 text-sm text-gray-500" onClick={() => setDialogState(null)}>{t('cancel')}</button>
                <button
                  className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg"
                  onClick={async () => {
                    await executeRenameFolder(dialogState.folderId, dialogState.value);
                    setDialogState(null);
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
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={dialogState.value}
                onChange={(e) => setDialogState({ ...dialogState, value: e.target.value })}
              />
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1.5 text-sm text-gray-500" onClick={() => setDialogState(null)}>{t('cancel')}</button>
                <button
                  className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg"
                  onClick={async () => {
                    await executeCreateChildFolder(dialogState.folderId, dialogState.value);
                    setDialogState(null);
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
                <button className="px-3 py-1.5 text-sm text-gray-500" onClick={() => setDialogState(null)}>{t('cancel')}</button>
                <button
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
      </div>
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
                  { id: 'edit', label: t('folderEditModeSettings'), icon: FolderPen },
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
                              className="text-xs font-bold text-gray-500 hover:text-blue-600 hover:underline flex items-center gap-1 transition-colors"
                            >
                              <Plus size={14} />
                              {t('virtualRoot')}
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
                               const name = prompt(t('promptTagName'));
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
