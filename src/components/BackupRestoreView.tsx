import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, Category, Product, OrderHistoryRecord, FullAppBackup } from '../types';
import {
  exportAllData,
  importAllData,
  parseAndValidateBackup,
  generateBackupFileName,
  resetToFactoryDefaults,
  clearOrderHistory,
  BackupSummaryStats,
} from '../db/indexedDB';
import { copyToClipboard, formatThaiDateTime } from '../utils/orderFormatter';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  FileJson,
  Check,
  Copy,
  Share2,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Smartphone,
  Clock,
  Layers,
  Package,
  Image as ImageIcon,
  History,
  Store,
  X,
  ShieldCheck,
  Sparkles,
  Info,
  Trash2,
  ClipboardPaste,
  ArrowRight,
} from 'lucide-react';

interface LocalSnapshotRecord {
  id: string;
  createdAt: number;
  label: string;
  stats: BackupSummaryStats;
  data: FullAppBackup;
}

const LS_SNAPSHOTS_KEY = 'tonys_kitchen_local_snapshots';
const LS_LAST_BACKUP_TIME_KEY = 'tonys_last_backup_time';
const LS_DEVICE_LABEL_KEY = 'tonys_device_label';

interface Props {
  categories: Category[];
  products: Product[];
  settings: AppSettings;
  orderHistory: OrderHistoryRecord[];
  onDataReloadNeeded: () => Promise<void>;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const BackupRestoreView: React.FC<Props> = ({
  categories,
  products,
  settings,
  orderHistory,
  onDataReloadNeeded,
  onShowToast,
}) => {
  // Device label for backup attribution
  const [deviceLabel, setDeviceLabel] = useState<string>(() => {
    try {
      return localStorage.getItem(LS_DEVICE_LABEL_KEY) || '';
    } catch {
      return '';
    }
  });

  // Last backup time
  const [lastBackupTime, setLastBackupTime] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(LS_LAST_BACKUP_TIME_KEY);
      return stored ? parseInt(stored, 10) : null;
    } catch {
      return null;
    }
  });

  // Local browser snapshots
  const [localSnapshots, setLocalSnapshots] = useState<LocalSnapshotRecord[]>(() => {
    try {
      const stored = localStorage.getItem(LS_SNAPSHOTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Export States
  const [isExporting, setIsExporting] = useState(false);
  const [isCopyingJson, setIsCopyingJson] = useState(false);
  const [hasCopiedJson, setHasCopiedJson] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Import / Restore States
  const [importMethod, setImportMethod] = useState<'file' | 'paste'>('file');
  const [pastedJsonText, setPastedJsonText] = useState('');
  const [isParsingPaste, setIsParsingPaste] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<FullAppBackup | null>(null);
  const [pendingStats, setPendingStats] = useState<BackupSummaryStats | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Post-restore Success Modal
  const [restoreSuccessStats, setRestoreSuccessStats] = useState<BackupSummaryStats | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Reset Confirmations
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);

  // Drag & drop highlight
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current stats calculation
  const currentCategoriesCount = categories.length;
  const currentProductsCount = products.length;
  const currentImagesCount = products.filter((p) => Boolean(p.image && p.image.trim())).length;
  const currentOrdersCount = orderHistory.length;
  const currentHasSettings = Boolean(settings.storeName || settings.logoDataUrl || settings.branchNote);
  const hasCurrentData = currentCategoriesCount > 0 || currentProductsCount > 0 || currentOrdersCount > 0;

  // Persist device label when changed
  const handleDeviceLabelChange = (val: string) => {
    setDeviceLabel(val);
    try {
      localStorage.setItem(LS_DEVICE_LABEL_KEY, val.trim());
    } catch (e) {
      console.warn('Could not persist device label:', e);
    }
  };

  const recordBackupSuccess = () => {
    const now = Date.now();
    setLastBackupTime(now);
    try {
      localStorage.setItem(LS_LAST_BACKUP_TIME_KEY, String(now));
    } catch (e) {
      console.warn('Could not save last backup time:', e);
    }
  };

  // 1. Download Backup JSON File
  const handleDownloadBackup = async () => {
    setIsExporting(true);
    try {
      const backupData = await exportAllData(deviceLabel);
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const fileName = generateBackupFileName();

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      recordBackupSuccess();
      setShowExportModal(false);
      onShowToast('success', `ดาวน์โหลดไฟล์ ${fileName} เรียบร้อยแล้ว`, 'สำรองข้อมูลสำเร็จ');
    } catch (err: any) {
      console.error('Export download failed:', err);
      onShowToast('error', err.message || 'เกิดข้อผิดพลาดในการสำรองข้อมูล', 'ข้อผิดพลาด');
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Copy Backup JSON to Clipboard (Convenient for mobile / LINE notes)
  const handleCopyBackupJson = async () => {
    setIsCopyingJson(true);
    try {
      const backupData = await exportAllData(deviceLabel);
      const jsonStr = JSON.stringify(backupData, null, 2);
      const ok = await copyToClipboard(jsonStr);
      if (ok) {
        setHasCopiedJson(true);
        recordBackupSuccess();
        setTimeout(() => setHasCopiedJson(false), 2500);
        onShowToast('success', 'คัดลอกข้อความ JSON ลงคลิปบอร์ดแล้ว สามารถวางใน LINE หรือแอปโน้ตได้ทันที', 'คัดลอกสำเร็จ');
      } else {
        throw new Error('ไม่สามารถคัดลอกได้');
      }
    } catch (err: any) {
      console.error('Copy JSON failed:', err);
      onShowToast('error', 'ไม่สามารถคัดลอกข้อมูล JSON ได้ กรุณาใช้ปุ่มดาวน์โหลดไฟล์แทน');
    } finally {
      setIsCopyingJson(false);
    }
  };

  // 3. Share Backup File via Web Share API (on supported mobile devices)
  const handleShareBackup = async () => {
    if (!navigator.share) {
      onShowToast('info', 'อุปกรณ์นี้ไม่รองรับการแชร์โดยตรง แนะนำให้กดดาวน์โหลดไฟล์หรือคัดลอก JSON');
      return;
    }
    try {
      const backupData = await exportAllData(deviceLabel);
      const jsonStr = JSON.stringify(backupData, null, 2);
      const fileName = generateBackupFileName();
      const file = new File([jsonStr], fileName, { type: 'application/json' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Tony's Kitchen Backup",
          text: `ไฟล์สำรองข้อมูลร้านค้า Tony's Kitchen (${currentProductsCount} รายการ)`,
          files: [file],
        });
        recordBackupSuccess();
        onShowToast('success', 'ส่งข้อมูลสำรองเรียบร้อยแล้ว');
      } else {
        await navigator.share({
          title: "Tony's Kitchen Backup",
          text: jsonStr,
        });
        recordBackupSuccess();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Web Share failed or cancelled:', err);
      }
    }
  };

  // 4. Save Instant In-Browser Snapshot (Rollback Point)
  const handleSaveLocalSnapshot = async () => {
    try {
      const backupData = await exportAllData(deviceLabel);
      const { stats } = parseAndValidateBackup(backupData);
      const newSnapshot: LocalSnapshotRecord = {
        id: `snap-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        createdAt: Date.now(),
        label: deviceLabel.trim() || 'Snapshot ในเครื่อง',
        stats,
        data: backupData,
      };

      const updated = [newSnapshot, ...localSnapshots].slice(0, 5); // Keep up to 5 latest snapshots
      setLocalSnapshots(updated);
      try {
        localStorage.setItem(LS_SNAPSHOTS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save snapshot to localStorage quota:', e);
      }

      recordBackupSuccess();
      onShowToast('success', 'บันทึก Snapshot ในเบราว์เซอร์นี้เรียบร้อยแล้ว (เก็บประวัติได้สูงสุด 5 รายการ)');
    } catch (err: any) {
      console.error('Save local snapshot failed:', err);
      onShowToast('error', 'ไม่สามารถบันทึก Snapshot ได้');
    }
  };

  // Delete Local Snapshot
  const handleDeleteSnapshot = (id: string) => {
    const updated = localSnapshots.filter((s) => s.id !== id);
    setLocalSnapshots(updated);
    try {
      localStorage.setItem(LS_SNAPSHOTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not update snapshots in localStorage:', e);
    }
    onShowToast('info', 'ลบ Snapshot ออกจากเครื่องแล้ว');
  };

  // Trigger Restore from a Local Snapshot
  const handleTriggerRestoreFromSnapshot = (snapshot: LocalSnapshotRecord) => {
    try {
      const { backupData, stats } = parseAndValidateBackup(snapshot.data);
      setPendingBackupData(backupData);
      setPendingStats(stats);
      setShowRestoreModal(true);
    } catch (err: any) {
      onShowToast('error', err.message || 'ข้อมูล Snapshot ไม่ถูกต้อง');
    }
  };

  // 5. File Import Parser
  const processRawBackupText = (jsonString: string) => {
    try {
      let rawData: any;
      try {
        rawData = JSON.parse(jsonString);
      } catch {
        throw new Error('โครงสร้างไฟล์ไม่ใช่รูปแบบ JSON ที่ถูกต้อง');
      }

      const { backupData, stats } = parseAndValidateBackup(rawData);
      setPendingBackupData(backupData);
      setPendingStats(stats);
      setShowRestoreModal(true);
    } catch (err: any) {
      console.error('Validation error:', err);
      onShowToast('error', err.message || 'ไฟล์สำรองไม่ถูกต้อง ไม่สามารถกู้คืนข้อมูลได้', 'ตรวจสอบไม่ผ่าน');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processRawBackupText(text);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => {
      onShowToast('error', 'ไม่สามารถอ่านไฟล์ได้');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      onShowToast('error', 'กรุณาอัปโหลดเฉพาะไฟล์ .json เท่านั้น');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processRawBackupText(text);
    };
    reader.readAsText(file);
  };

  // Paste JSON Handler
  const handleProcessPastedJson = () => {
    if (!pastedJsonText.trim()) {
      onShowToast('info', 'กรุณาวางข้อความ JSON ก่อนกดยืนยัน');
      return;
    }
    setIsParsingPaste(true);
    try {
      processRawBackupText(pastedJsonText.trim());
    } finally {
      setIsParsingPaste(false);
    }
  };

  // 6. Execute Restore after confirmation
  const handleConfirmRestore = async () => {
    if (!pendingBackupData) return;
    setIsRestoring(true);
    try {
      const res = await importAllData(pendingBackupData);
      await onDataReloadNeeded();
      setShowRestoreModal(false);
      setPendingBackupData(null);
      setPastedJsonText('');
      setRestoreSuccessStats(res.stats);
      setShowSuccessModal(true);
      onShowToast('success', res.message, 'กู้คืนข้อมูลสำเร็จ');
    } catch (err: any) {
      console.error('Restore failed:', err);
      onShowToast('error', err.message || 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล', 'ข้อผิดพลาด');
    } finally {
      setIsRestoring(false);
    }
  };

  // 7. Reset Factory Default
  const handleResetFactory = async () => {
    try {
      await resetToFactoryDefaults();
      await onDataReloadNeeded();
      setShowResetConfirm(false);
      onShowToast('info', 'คืนค่าข้อมูลเริ่มต้น 6 หมวดหมู่วัตถุดิบเรียบร้อยแล้ว', 'คืนค่าเริ่มต้น');
    } catch (err) {
      console.error('Reset factory failed:', err);
      onShowToast('error', 'เกิดข้อผิดพลาดในการคืนค่าเริ่มต้น');
    }
  };

  // 8. Clear Order History
  const handleClearHistory = async () => {
    try {
      await clearOrderHistory();
      await onDataReloadNeeded();
      setShowClearHistoryConfirm(false);
      onShowToast('info', 'ลบประวัติการสั่งซื้อทั้งหมดออกจากเครื่องนี้แล้ว');
    } catch (err) {
      console.error('Clear history failed:', err);
      onShowToast('error', 'ไม่สามารถล้างประวัติได้');
    }
  };

  return (
    <div id="backup-restore-management-view" className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* 1. Header Banner & Security Guarantee */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F27D26] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-[#141414] tracking-tight">
                  ระบบสำรอง & กู้คืนข้อมูล (Backup & Restore)
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
                จัดเก็บข้อมูลทั้งหมดลงไฟล์ JSON ปลอดภัย 100% บนเครื่องของคุณ ไม่ส่งข้อมูลออกภายนอก
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-900 px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Local-First & Offline Privacy</span>
          </div>
        </div>

        {/* Current Database Summary Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200/80">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold">
              <Layers className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>หมวดหมู่</span>
            </div>
            <p className="text-lg font-black text-[#141414] mt-1">{currentCategoriesCount} รายการ</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200/80">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold">
              <Package className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>รายการวัตถุดิบ</span>
            </div>
            <p className="text-lg font-black text-[#141414] mt-1">
              {currentProductsCount} รายการ
              {currentImagesCount > 0 && (
                <span className="text-xs font-bold text-gray-500 ml-1">({currentImagesCount} รูป)</span>
              )}
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200/80">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold">
              <History className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>ประวัติการสั่งซื้อ</span>
            </div>
            <p className="text-lg font-black text-[#141414] mt-1">{currentOrdersCount} รายการ</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200/80">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>สำรองล่าสุด</span>
            </div>
            <p className="text-xs font-bold text-gray-800 mt-1.5 truncate">
              {lastBackupTime ? formatThaiDateTime(new Date(lastBackupTime)) : 'ยังไม่เคยสำรอง'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Workflow: BACKUP (Left) and RESTORE (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT CARD: BACKUP (EXPORT) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#F27D26] flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#141414]">สำรองข้อมูล (Backup / Export)</h3>
                  <p className="text-xs text-gray-500">บันทึกข้อมูลทุกอย่างลงไฟล์ JSON เพื่อเก็บสำรองหรือย้ายเครื่อง</p>
                </div>
              </div>
              <span className="bg-orange-50 text-[#F27D26] text-[11px] font-black px-2.5 py-1 rounded-xl border border-orange-200">
                EXPORT
              </span>
            </div>

            {/* Optional Device Name Label Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#F27D26]" />
                <span>ชื่ออุปกรณ์นี้ (Device Label)</span>
                <span className="text-[10px] text-gray-400 font-normal">(ช่วยให้จำได้ว่างวดนี้สำรองจากเครื่องไหน)</span>
              </label>
              <input
                type="text"
                value={deviceLabel}
                onChange={(e) => handleDeviceLabelChange(e.target.value)}
                placeholder="เช่น iPad แคชเชียร์, มือถือแอดมิน, แท็บเล็ตครัว"
                className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white text-[#141414]"
              />
            </div>

            {/* Primary Action Button: Download JSON File */}
            <div className="space-y-2.5 pt-1">
              <button
                id="main-download-backup-btn"
                type="button"
                disabled={isExporting}
                onClick={handleDownloadBackup}
                className="w-full p-4 rounded-2xl bg-[#F27D26] hover:bg-[#d96614] active:bg-[#c2580c] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <Download className="w-5 h-5 stroke-[2.5]" />
                <span>{isExporting ? 'กำลังประมวลผลไฟล์...' : 'ดาวน์โหลดไฟล์สำรอง (Download JSON)'}</span>
              </button>

              {/* Secondary Options: Copy JSON or Native Share */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  id="copy-backup-json-btn"
                  type="button"
                  disabled={isCopyingJson}
                  onClick={handleCopyBackupJson}
                  className="py-2.5 px-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-[#141414] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="คัดลอกข้อมูล JSON ไว้ส่งต่อใน LINE หรือ Notes"
                >
                  {hasCopiedJson ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                      <span className="text-emerald-700">คัดลอกสำเร็จ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-gray-600" />
                      <span>{isCopyingJson ? 'กำลังคัดลอก...' : 'คัดลอก JSON'}</span>
                    </>
                  )}
                </button>

                {typeof navigator !== 'undefined' && 'share' in navigator ? (
                  <button
                    id="share-backup-btn"
                    type="button"
                    onClick={handleShareBackup}
                    className="py-2.5 px-3 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-[#F27D26]" />
                    <span>แชร์เข้า LINE / AirDrop</span>
                  </button>
                ) : (
                  <button
                    id="save-browser-snapshot-btn"
                    type="button"
                    onClick={handleSaveLocalSnapshot}
                    className="py-2.5 px-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="บันทึกจุดสำรองด่วนไว้ในเบราว์เซอร์นี้"
                  >
                    <HardDrive className="w-4 h-4 text-amber-600" />
                    <span>สร้าง Snapshot ด่วน</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Helper Note */}
            <div className="bg-orange-50/60 rounded-2xl p-3.5 border border-orange-200/70 text-xs text-orange-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-orange-900">
                <Sparkles className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>คำแนะนำการย้ายเครื่อง:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-orange-900/90">
                เมื่อดาวน์โหลดไฟล์แล้ว สามารถส่งไฟล์ JSON ให้เพื่อนร่วมงานทาง LINE, อีเมล หรือ AirDrop แล้วเปิดระบบนี้บนอีกเครื่องเพื่อกด Import ได้ทันที
              </p>
            </div>
          </div>

          {/* Quick Snapshot Action Button if not placed in row */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div className="text-[11px] text-gray-500">
                บันทึกจุดย้อนกลับไว้ในเครื่องนี้ (Local Rollback Point):
              </div>
              <button
                type="button"
                onClick={handleSaveLocalSnapshot}
                className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-xs text-[#141414] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>บันทึก Snapshot</span>
              </button>
            </div>
          )}
        </div>

        {/* RIGHT CARD: RESTORE (IMPORT) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gray-100 text-[#141414] flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#141414]">กู้คืนข้อมูล (Restore / Import)</h3>
                  <p className="text-xs text-gray-500">นำเข้าไฟล์หรือข้อความ JSON เพื่อแทนที่ข้อมูลในเครื่องนี้</p>
                </div>
              </div>
              <span className="bg-gray-100 text-gray-800 text-[11px] font-black px-2.5 py-1 rounded-xl border border-gray-200">
                IMPORT
              </span>
            </div>

            {/* Switch Import Mode (File vs Paste) */}
            <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setImportMethod('file')}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  importMethod === 'file'
                    ? 'bg-white text-[#141414] shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <FileJson className="w-4 h-4 text-[#F27D26]" />
                <span>เลือกไฟล์สำรอง (.json)</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMethod('paste')}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  importMethod === 'paste'
                    ? 'bg-white text-[#141414] shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <ClipboardPaste className="w-4 h-4 text-[#F27D26]" />
                <span>วางข้อความ JSON</span>
              </button>
            </div>

            {/* Method A: File Upload / Drag and Drop */}
            {importMethod === 'file' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-[#F27D26] bg-orange-50/80 scale-[1.01]'
                    : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/70 hover:border-gray-300'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-center mx-auto text-[#F27D26] mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[#141414]">แตะเพื่อเลือกไฟล์ JSON หรือลากไฟล์มาวางที่นี่</p>
                <p className="text-xs text-gray-500 mt-1">รองรับไฟล์สำรองของ Tony's Kitchen ทุกรุ่น</p>
              </div>
            )}

            {/* Method B: Paste JSON Text Box */}
            {importMethod === 'paste' && (
              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={pastedJsonText}
                  onChange={(e) => setPastedJsonText(e.target.value)}
                  placeholder="วางโค้ด JSON ที่คัดลอกจาก LINE หรือแอปโน้ตที่นี่..."
                  className="w-full p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white text-[#141414]"
                />
                <button
                  id="process-paste-json-btn"
                  type="button"
                  disabled={isParsingPaste || !pastedJsonText.trim()}
                  onClick={handleProcessPastedJson}
                  className="w-full py-3 rounded-2xl bg-[#141414] hover:bg-stone-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>ตรวจสอบข้อมูลและเตรียมกู้คืน</span>
                </button>
              </div>
            )}

            {/* Warning Notice about Overwrite */}
            <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-xs text-amber-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>การกู้คืนจะเขียนทับข้อมูลในเครื่องนี้</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900/90">
                ระบบจะให้คุณตรวจทานสรุปรายการก่อนกู้คืนจริงเสมอ ข้อมูลในเครื่องจะถูกเปลี่ยนตามไฟล์สำรองแบบสมบูรณ์
              </p>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-gray-400 text-center">
            🔒 ตรวจสอบความสมบูรณ์ของข้อมูลระดับ Transaction ก่อนบันทึกจริง
          </div>
        </div>
      </div>

      {/* 3. In-Browser Local Snapshots (Rollback Points) */}
      {localSnapshots.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-[#F27D26]" />
              <h3 className="font-bold text-base text-[#141414]">
                ประวัติ Snapshots ในเครื่องนี้ ({localSnapshots.length})
              </h3>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              กู้คืนจุดย้อนกลับได้ทันทีโดยไม่ต้องค้นหาไฟล์ในเครื่อง
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {localSnapshots.map((snap) => (
              <div
                key={snap.id}
                className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200 flex flex-col justify-between gap-3 text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#141414] text-sm flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {formatThaiDateTime(new Date(snap.createdAt))}
                    </span>
                    <span className="bg-gray-200 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                      {snap.label}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-600 flex flex-wrap gap-x-3 gap-y-1 pt-1">
                    <span>หมวดหมู่: <b>{snap.stats.categoriesCount}</b></span>
                    <span>วัตถุดิบ: <b>{snap.stats.productsCount}</b></span>
                    <span>รูปภาพ: <b>{snap.stats.imageCount}</b></span>
                    <span>ประวัติออเดอร์: <b>{snap.stats.orderHistoryCount}</b></span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200/60">
                  <button
                    type="button"
                    onClick={() => handleDeleteSnapshot(snap.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-xl hover:bg-white"
                    title="ลบ Snapshot นี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerRestoreFromSnapshot(snap)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#141414] hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>กู้คืน Snapshot นี้</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Danger Zone & Factory Reset */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-bold text-base text-[#141414]">การจัดการขั้นสูง & คืนค่าเริ่มต้น</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Reset to Factory Defaults */}
          <div className="p-4 rounded-2xl bg-red-50/50 border border-red-200 flex flex-col justify-between gap-3">
            <div>
              <p className="font-bold text-xs sm:text-sm text-red-950">คืนค่าข้อมูลตั้งต้น (Reset to Initial Seed)</p>
              <p className="text-[11px] text-red-800/80 mt-0.5">
                รีเซ็ตหมวดหมู่และวัตถุดิบกลับเป็น 6 หมวดหมู่เริ่มต้นของ Tony's Kitchen ข้อมูลที่แก้ไขเองจะถูกลบ
              </p>
            </div>
            <button
              id="reset-factory-danger-btn"
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              รีเซ็ตเป็นค่าเริ่มต้น
            </button>
          </div>

          {/* Clear Order History */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col justify-between gap-3">
            <div>
              <p className="font-bold text-xs sm:text-sm text-gray-900">ล้างประวัติการสั่งซื้อทั้งหมด</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                ลบประวัติออเดอร์ย้อนหลังทั้งหมด ({currentOrdersCount} รายการ) ออกจากเครื่องนี้
              </p>
            </div>
            <button
              id="clear-order-history-danger-btn"
              type="button"
              disabled={currentOrdersCount === 0}
              onClick={() => setShowClearHistoryConfirm(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-[#141414] hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40"
            >
              ล้างประวัติการสั่งซื้อ
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: RESTORE PREVIEW & CONFIRMATION */}
      {showRestoreModal && pendingBackupData && pendingStats && (
        <div
          id="restore-preview-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#141414]">ยืนยันการกู้คืนข้อมูลสำรอง?</h3>
                  <p className="text-[11px] text-gray-500">
                    วันที่ Backup: {pendingStats.backupCreatedAt ? formatThaiDateTime(new Date(pendingStats.backupCreatedAt)) : 'ไม่ระบุ'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(false);
                  setPendingBackupData(null);
                  setPendingStats(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Device attribution if available */}
            {pendingStats.deviceLabel && (
              <div className="bg-orange-50 border border-orange-200 px-3.5 py-2 rounded-xl text-xs font-bold text-orange-950 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#F27D26]" />
                <span>สำรองมาจากอุปกรณ์: {pendingStats.deviceLabel}</span>
              </div>
            )}

            {/* Data Comparison: Current vs Backup */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2.5 text-xs">
              <p className="font-bold text-gray-700 pb-1.5 border-b border-gray-200">
                เปรียบเทียบข้อมูล (ปัจจุบัน vs ไฟล์สำรอง):
              </p>

              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    หมวดหมู่:
                  </span>
                  <div className="space-x-2 font-bold">
                    <span className="text-gray-400">ปัจจุบัน {currentCategoriesCount}</span>
                    <span className="text-gray-400">➔</span>
                    <span className="text-[#141414]">ใหม่ {pendingStats.categoriesCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    รายการวัตถุดิบ:
                  </span>
                  <div className="space-x-2 font-bold">
                    <span className="text-gray-400">ปัจจุบัน {currentProductsCount}</span>
                    <span className="text-gray-400">➔</span>
                    <span className="text-[#141414]">ใหม่ {pendingStats.productsCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    รูปภาพวัตถุดิบ:
                  </span>
                  <div className="space-x-2 font-bold">
                    <span className="text-gray-400">ปัจจุบัน {currentImagesCount}</span>
                    <span className="text-gray-400">➔</span>
                    <span className="text-[#141414]">ใหม่ {pendingStats.imageCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    ประวัติออเดอร์:
                  </span>
                  <div className="space-x-2 font-bold">
                    <span className="text-gray-400">ปัจจุบัน {currentOrdersCount}</span>
                    <span className="text-gray-400">➔</span>
                    <span className="text-[#141414]">ใหม่ {pendingStats.orderHistoryCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5" />
                    การตั้งค่าร้านค้า:
                  </span>
                  <span className={`font-bold ${pendingStats.hasSettings ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {pendingStats.hasSettings ? 'มีในไฟล์สำรอง' : 'ไม่มี'}
                  </span>
                </div>
              </div>
            </div>

            {/* Prominent Warning Box */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1 text-xs">
              <p className="font-bold flex items-center gap-1 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>คำเตือน: ข้อมูลในเครื่องจะถูกเขียนทับทั้งหมด</span>
              </p>
              <p className="text-[11px] leading-relaxed text-amber-900/90">
                การกู้คืนจะแทนที่หมวดหมู่ วัตถุดิบ และประวัติการสั่งซื้อปัจจุบันของเครื่องนี้ด้วยข้อมูลจาก Backup แบบสมบูรณ์
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(false);
                  setPendingBackupData(null);
                  setPendingStats(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs sm:text-sm font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                id="confirm-execute-restore-btn"
                type="button"
                disabled={isRestoring}
                onClick={handleConfirmRestore}
                className="flex-1 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#d96614] text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isRestoring ? 'กำลังกู้คืน...' : 'ยืนยันกู้คืนข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: POST-RESTORE SUCCESS */}
      {showSuccessModal && restoreSuccessStats && (
        <div
          id="restore-success-dialog"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#141414]">กู้คืนข้อมูลสำเร็จ!</h3>
              <p className="text-xs text-gray-600 mt-1">
                ระบบได้แทนที่ข้อมูลในเครื่องนี้ด้วยข้อมูลจากไฟล์สำรองเรียบร้อยแล้ว
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200 text-xs text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">หมวดหมู่:</span>
                <span className="font-bold text-[#141414]">{restoreSuccessStats.categoriesCount} รายการ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">วัตถุดิบ:</span>
                <span className="font-bold text-[#141414]">{restoreSuccessStats.productsCount} รายการ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">รูปภาพ:</span>
                <span className="font-bold text-[#141414]">{restoreSuccessStats.imageCount} รูป</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ประวัติการสั่งซื้อ:</span>
                <span className="font-bold text-[#141414]">{restoreSuccessStats.orderHistoryCount} รายการ</span>
              </div>
            </div>

            <button
              id="dismiss-restore-success-btn"
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 rounded-2xl bg-[#141414] hover:bg-stone-800 text-white text-sm font-bold shadow-xs transition-colors cursor-pointer"
            >
              ตกลงและเริ่มใช้งาน
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: RESET FACTORY CONFIRM */}
      {showResetConfirm && (
        <div
          id="factory-reset-confirm-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#141414]">ยืนยันคืนค่าเริ่มต้นของระบบ?</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              หมวดหมู่และวัตถุดิบจะถูกรีเซ็ตกลับเป็น 6 หมวดหมู่มาตรฐานของ Tony's Kitchen วัตถุดิบและหมวดหมู่ที่คุณสร้างเองจะถูกลบ
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs sm:text-sm font-bold hover:bg-gray-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleResetFactory}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-bold hover:bg-red-700 shadow-xs cursor-pointer"
              >
                ยืนยันรีเซ็ต
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CLEAR ORDER HISTORY CONFIRM */}
      {showClearHistoryConfirm && (
        <div
          id="clear-history-confirm-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#141414]">ล้างประวัติการสั่งซื้อทั้งหมด?</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              ประวัติการสั่งซื้อย้อนหลังทั้งหมดจะถูกลบออกจากเครื่องนี้
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearHistoryConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs sm:text-sm font-bold hover:bg-gray-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="flex-1 py-2.5 rounded-xl bg-[#141414] text-white text-xs sm:text-sm font-bold hover:bg-stone-800 cursor-pointer"
              >
                ล้างประวัติ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
