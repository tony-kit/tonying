import React, { useState, useRef } from 'react';
import { AppSettings, OrderHistoryRecord, Category, Product } from '../types';
import {
  Sliders,
  Camera,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  History,
  Check,
  Copy,
  AlertTriangle,
  FileJson,
  Store,
  ShieldCheck,
  Wine,
  Receipt,
  Clock,
  Sparkles,
  Smartphone,
  CheckCircle2,
  Layers,
  Package,
  Image as ImageIcon,
  Info,
  X,
} from 'lucide-react';
import { compressAndResizeImage } from '../utils/imageUtils';
import {
  exportAllData,
  importAllData,
  parseAndValidateBackup,
  generateBackupFileName,
  resetToFactoryDefaults,
  FullAppBackup,
  BackupSummaryStats,
  clearOrderHistory,
} from '../db/indexedDB';
import { copyToClipboard, formatCurrency, formatThaiDateTime } from '../utils/orderFormatter';

interface Props {
  settings: AppSettings;
  categories: Category[];
  products: Product[];
  orderHistory: OrderHistoryRecord[];
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onDataReloadNeeded: () => Promise<void>;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const SettingsView: React.FC<Props> = ({
  settings,
  categories,
  products,
  orderHistory,
  onSaveSettings,
  onDataReloadNeeded,
  onShowToast,
}) => {
  const [storeName, setStoreName] = useState(settings.storeName || "Tony's Kitchen");
  const [branchNote, setBranchNote] = useState(settings.branchNote || '');
  const [lineSupplierNote, setLineSupplierNote] = useState(settings.lineSupplierNote || '');
  const [drinkLineTargetName, setDrinkLineTargetName] = useState(settings.drinkLineTargetName || 'สั่งโค้กTony');
  const [drinkLineGroupLink, setDrinkLineGroupLink] = useState(
    settings.drinkLineGroupLink || 'https://line.me/R/ti/g/RB55pEzZJp'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  
  // Device label for backup metadata
  const [deviceLabel, setDeviceLabel] = useState<string>(() => {
    try {
      return localStorage.getItem('tonys_device_label') || '';
    } catch {
      return '';
    }
  });

  // Export Summary Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Import Preview & Validation state
  const [pendingBackupData, setPendingBackupData] = useState<FullAppBackup | null>(null);
  const [pendingStats, setPendingStats] = useState<BackupSummaryStats | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Post-restore confirmation modal state
  const [restoreSuccessStats, setRestoreSuccessStats] = useState<BackupSummaryStats | null>(null);
  const [showRestoreSuccessModal, setShowRestoreSuccessModal] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const jsonImportInputRef = useRef<HTMLInputElement>(null);

  // Statistics for current device data
  const currentCategoriesCount = categories.length;
  const currentProductsCount = products.length;
  const currentImagesCount = products.filter((p) => Boolean(p.image && p.image.trim())).length;
  const currentOrdersCount = orderHistory.length;
  const currentHasSettings = Boolean(settings.storeName || settings.logoDataUrl || settings.branchNote);
  const hasCurrentData = currentCategoriesCount > 0 || currentProductsCount > 0 || currentOrdersCount > 0;

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings({
        storeName: storeName.trim() || "Tony's Kitchen",
        branchNote: branchNote.trim(),
        lineSupplierNote: lineSupplierNote.trim(),
        drinkLineTargetName: drinkLineTargetName.trim() || 'สั่งโค้กTony',
        drinkLineGroupLink: drinkLineGroupLink.trim(),
      });
      onShowToast('success', 'บันทึกข้อมูลร้านค้าเรียบร้อยแล้ว', 'สำเร็จ');
    } catch (err) {
      console.error('Save settings failed:', err);
      onShowToast('error', 'บันทึกข้อมูลไม่สำเร็จ', 'ข้อผิดพลาด');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressAndResizeImage(file, 400, 0.9);
      await onSaveSettings({ logoDataUrl: dataUrl });
      onShowToast('success', 'อัปเดตโลโก้ร้านค้าเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Logo upload failed:', err);
      onShowToast('error', 'ไม่สามารถอัปโหลดโลโก้ได้');
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    await onSaveSettings({ logoDataUrl: null });
    onShowToast('info', 'ลบโลโก้เรียบร้อยแล้ว (ใช้ข้อความเริ่มต้น)');
  };

  // Open Export Summary Modal
  const handleOpenExportModal = () => {
    setShowExportModal(true);
  };

  // Execute JSON backup download after confirmation
  const handleConfirmExport = async () => {
    setIsExporting(true);
    try {
      if (deviceLabel.trim()) {
        try {
          localStorage.setItem('tonys_device_label', deviceLabel.trim());
        } catch (e) {
          console.warn('Could not persist device label in localStorage:', e);
        }
      }
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

      setShowExportModal(false);
      onShowToast('success', `ดาวน์โหลดไฟล์ ${fileName} เรียบร้อยแล้ว`, 'สำรองข้อมูลสำเร็จ');
    } catch (err) {
      console.error('Export failed:', err);
      onShowToast('error', 'เกิดข้อผิดพลาดในการสำรองข้อมูล');
    } finally {
      setIsExporting(false);
    }
  };

  // Import JSON backup - Dry check structure & validate then open preview modal
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let rawData: any;
        try {
          rawData = JSON.parse(text);
        } catch {
          throw new Error('ไฟล์สำรองไม่ถูกต้อง ไม่สามารถกู้คืนข้อมูลได้');
        }

        // Validate structure, format version & parse stats
        const { backupData, stats } = parseAndValidateBackup(rawData);

        setPendingBackupData(backupData);
        setPendingStats(stats);
        setShowRestoreConfirm(true);
      } catch (err: any) {
        console.error('Import validation failed:', err);
        onShowToast('error', err.message || 'ไฟล์สำรองไม่ถูกต้อง ไม่สามารถกู้คืนข้อมูลได้', 'กู้คืนข้อมูลไม่สำเร็จ');
      } finally {
        if (jsonImportInputRef.current) jsonImportInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Perform the actual atomic restore after user confirms
  const handleConfirmRestore = async () => {
    if (!pendingBackupData) return;
    setIsRestoring(true);
    try {
      const res = await importAllData(pendingBackupData);
      await onDataReloadNeeded();
      setShowRestoreConfirm(false);
      setPendingBackupData(null);
      setRestoreSuccessStats(res.stats);
      setShowRestoreSuccessModal(true);
      onShowToast('success', res.message, 'กู้คืนข้อมูลสำเร็จ');
    } catch (err: any) {
      console.error('Restore execution failed:', err);
      onShowToast('error', err.message || 'ไฟล์สำรองไม่ถูกต้อง ไม่สามารถกู้คืนข้อมูลได้', 'ข้อผิดพลาด');
    } finally {
      setIsRestoring(false);
    }
  };

  // Reset to Factory Default Data
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

  // Clear order history
  const handleClearHistory = async () => {
    await clearOrderHistory();
    await onDataReloadNeeded();
    setShowClearHistoryConfirm(false);
    onShowToast('info', 'ลบประวัติการสั่งซื้อทั้งหมดแล้ว');
  };

  const handleCopyHistoryText = async (id: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      onShowToast('success', 'คัดลอกข้อความออเดอร์แล้ว');
    }
  };

  return (
    <div id="settings-screen-view" className="space-y-6 max-w-4xl mx-auto pb-28">
      {/* Top Header Bento Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-[#F27D26] flex items-center justify-center text-white shrink-0 shadow-sm">
          <Sliders className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#141414] leading-tight">
            การตั้งค่าระบบ & สำรองข้อมูล
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            ระบบทำงานแบบ Local-First ปลอดภัย 100% ไม่ส่งข้อมูลออกนอกเครื่อง
          </p>
        </div>
      </div>

      {/* Section 1: Logo & Store Information Bento Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Store className="w-5 h-5 text-[#F27D26]" />
          <h3 className="font-bold text-base text-[#141414]">ข้อมูลร้านค้า & โลโก้</h3>
        </div>

        {/* Logo Uploader */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">
            โลโก้ร้านค้า (แสดงมุมซ้ายบน)
          </label>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center relative shrink-0 shadow-2xs">
              {settings.logoDataUrl ? (
                <img
                  src={settings.logoDataUrl}
                  alt={settings.storeName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-1 text-[#F27D26]">
                  <span className="text-xs font-black">TONY'S</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="px-4 py-2.5 bg-[#F27D26] hover:bg-[#d96614] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Camera className="w-4 h-4" />
                <span>{settings.logoDataUrl ? 'เปลี่ยนรูปโลโก้' : 'อัปโหลดรูปโลโก้'}</span>
              </button>
              {settings.logoDataUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-xs text-red-600 font-semibold hover:underline text-left"
                >
                  ลบโลโก้ (ใช้ข้อความเริ่มต้น)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Store Info Form */}
        <form onSubmit={handleSaveInfo} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              ชื่อร้านอาหาร
            </label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white text-[#141414]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              คำอธิบายสาขา / ข้อความหัวกระดาษ
            </label>
            <input
              type="text"
              value={branchNote}
              onChange={(e) => setBranchNote(e.target.value)}
              placeholder="เช่น ครัวโทนี่ — สาขาหลัก หรือ สั่งวัตถุดิบประจำวัน"
              className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white text-[#141414]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              ข้อความส่งท้ายใน LINE ถึงซัพพลายเออร์
            </label>
            <input
              type="text"
              value={lineSupplierNote}
              onChange={(e) => setLineSupplierNote(e.target.value)}
              placeholder="เช่น กรุณาส่งของก่อน 10:00 น. ขอบคุณครับ/ค่ะ"
              className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white text-[#141414]"
            />
          </div>

          {/* Drink Orders Specific LINE Target Configuration */}
          <div className="pt-4 border-t border-gray-100 space-y-3 bg-[#06C755]/5 p-4 rounded-2xl border border-[#06C755]/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#06C755] text-white flex items-center justify-center text-xs font-black">
                L
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#141414]">ห้อง LINE สำหรับส่งใบสั่งเครื่องดื่ม</h4>
                <p className="text-[11px] text-gray-500">กำหนดห้องแชทและลิงก์สำหรับส่งภาพไปยังตัวแทนเครื่องดื่ม</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                ชื่อห้องแชท LINE ปลายทาง
              </label>
              <input
                type="text"
                value={drinkLineTargetName}
                onChange={(e) => setDrinkLineTargetName(e.target.value)}
                placeholder="เช่น สั่งโค้กTony"
                className="w-full px-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#06C755] text-[#141414]"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                เช่น &quot;สั่งโค้กTony&quot; ระบบจะแสดงชื่อห้องนี้ให้ผู้สั่งเห็นชัดเจนเวลาแชร์
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                ลิงก์เชิญกลุ่ม LINE (Group Invite Link หรือ LINE ID)
              </label>
              <input
                type="text"
                value={drinkLineGroupLink}
                onChange={(e) => setDrinkLineGroupLink(e.target.value)}
                placeholder="เช่น https://line.me/ti/g/... หรือ line://ti/p/@coke"
                className="w-full px-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#06C755] text-[#141414]"
              />
              <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                💡 <strong>วิธีนำลิงก์กลุ่มมาใส่:</strong> ในแอป LINE เปิดห้องแชท &quot;สั่งโค้กTony&quot; &gt; กดเมนู 3 ขีดขวาบน &gt; เลือก <strong>&quot;เชิญ (Invite)&quot;</strong> &gt; เลือก <strong>&quot;ลิงก์ (Share via link)&quot;</strong> &gt; คัดลอกลิงก์มาวางที่นี่ เมื่อกดส่งภาพ ระบบจะเด้งเปิดเข้าห้อง &quot;สั่งโค้กTony&quot; ให้โดยตรงทันที!
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-[#141414] hover:bg-stone-800 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-colors disabled:opacity-50"
          >
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลร้าน'}
          </button>
        </form>
      </div>

      {/* Section 2: Backup & Restore Bento Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <FileJson className="w-5 h-5 text-[#F27D26]" />
          <div>
            <h3 className="font-bold text-base text-[#141414]">สำรองและกู้คืนข้อมูล (Local-First Backup)</h3>
            <p className="text-xs text-gray-500">
              ส่งออกไฟล์ JSON เพื่อนำไปเก็บสำรอง หรือย้ายข้อมูลไปยังมือถือ/แท็บเล็ตเครื่องอื่น
            </p>
          </div>
        </div>

        {/* Clear Multi-Device & Local-First Guidance */}
        <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 text-xs text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900 text-xs sm:text-sm">
            <Info className="w-4 h-4 text-[#F27D26] shrink-0" />
            <span>Backup / Restore ไม่ใช่การ Sync</span>
          </div>
          <ul className="space-y-1 text-[11px] sm:text-xs text-amber-900/90 leading-relaxed list-disc list-inside">
            <li>Backup ใช้สำหรับเก็บสำรองข้อมูล หรือย้ายข้อมูลไปยังโทรศัพท์ / Tablet เครื่องอื่น</li>
            <li>หากใช้หลายเครื่อง ให้ใช้ Backup จากเครื่องหลักเป็นข้อมูลต้นฉบับ และ Import ไปยังเครื่องอื่น</li>
            <li>การสำรองข้อมูลทำงานบนเครื่องของคุณ 100% ปลอดภัย ไม่ส่งข้อมูลไปยังเซิร์ฟเวอร์ภายนอก</li>
          </ul>
        </div>

        <input
          ref={jsonImportInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportBackup}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Export Button */}
          <button
            id="export-backup-btn"
            type="button"
            onClick={handleOpenExportModal}
            className="p-5 rounded-2xl border border-orange-200 bg-orange-50/70 hover:bg-orange-100 text-orange-950 text-left transition-colors flex items-start gap-3.5 shadow-2xs cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F27D26] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">สำรองข้อมูลทั้งหมด (Export JSON)</p>
              <p className="text-xs text-orange-800 mt-0.5">
                ดูสรุปข้อมูล {currentProductsCount} รายการ และดาวน์โหลดไฟล์สำรอง
              </p>
            </div>
          </button>

          {/* Import Button */}
          <button
            id="import-backup-btn"
            type="button"
            onClick={() => jsonImportInputRef.current?.click()}
            className="p-5 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-[#141414] text-left transition-colors flex items-start gap-3.5 shadow-2xs cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#141414] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">กู้คืนข้อมูลจากไฟล์ (Import JSON)</p>
              <p className="text-xs text-gray-500 mt-0.5">
                ตรวจสอบตัวอย่างและนำเข้าข้อมูลสำรองเข้าสู่เครื่องนี้
              </p>
            </div>
          </button>
        </div>

        {/* Reset to Factory Defaults */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#141414]">คืนค่าข้อมูลตั้งต้น (Reset to Initial Seed)</p>
            <p className="text-[11px] text-gray-500">
              รีเซ็ตหมวดหมู่และวัตถุดิบตัวอย่างเริ่มต้น 6 หมวด
            </p>
          </div>
          <button
            id="reset-factory-btn"
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors cursor-pointer"
          >
            รีเซ็ตค่าเริ่มต้น
          </button>
        </div>
      </div>

      {/* Section 3: Order History Bento Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#F27D26]" />
            <h3 className="font-bold text-base text-[#141414]">
              ประวัติการสั่งซื้อย้อนหลัง ({orderHistory.length})
            </h3>
          </div>
          {orderHistory.length > 0 && (
            <button
              id="clear-order-history-btn"
              type="button"
              onClick={() => setShowClearHistoryConfirm(true)}
              className="text-xs font-bold text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
            >
              ล้างประวัติ
            </button>
          )}
        </div>

        {orderHistory.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">
            ยังไม่มีประวัติการส่งออเดอร์ เมื่อกดยืนยันออเดอร์ ระบบจะบันทึกประวัติไว้ที่นี่
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {orderHistory.map((rec) => (
              <div
                key={rec.id}
                id={`history-item-${rec.id}`}
                className="p-4 rounded-2xl border border-gray-200 bg-gray-50/70 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {rec.orderType === 'drink' ? (
                      <span className="px-2.5 py-0.5 rounded-lg font-bold bg-orange-100 text-orange-900 border border-orange-200 flex items-center gap-1 text-[10px]">
                        <Wine className="w-3 h-3 text-[#F27D26]" />
                        เครื่องดื่ม
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg font-bold bg-gray-200 text-gray-800 flex items-center gap-1 text-[10px]">
                        <Receipt className="w-3 h-3" />
                        วัตถุดิบทั่วไป
                      </span>
                    )}
                    <span className="text-gray-500 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatThaiDateTime(new Date(rec.timestamp))}
                    </span>
                  </div>

                  {rec.grandTotal > 0 && (
                    <span className="font-bold text-[#141414]">
                      ฿{formatCurrency(rec.grandTotal)}
                    </span>
                  )}
                </div>

                <div className="text-gray-700 line-clamp-2 text-[11px] font-medium">
                  {rec.items.map((it) => `${it.productName} (${it.quantity} ${it.unit})`).join(', ')}
                </div>

                {rec.versionBText && (
                  <div className="pt-1 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleCopyHistoryText(rec.id, rec.versionBText!)}
                      className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl text-gray-700 font-bold flex items-center gap-1 text-[11px] shadow-2xs cursor-pointer"
                    >
                      {copiedId === rec.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>คัดลอกข้อความ LINE</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export Summary Modal */}
      {showExportModal && (
        <div
          id="export-summary-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#F27D26] flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#141414]">ข้อมูลที่จะสำรอง</h3>
                  <p className="text-[11px] text-gray-500">ตรวจสอบรายการที่จะบันทึกลงไฟล์ JSON</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary List */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-600 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-400" />
                  หมวดหมู่:
                </span>
                <span className="font-bold text-[#141414]">{currentCategoriesCount} รายการ</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-600 flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  สินค้า:
                </span>
                <span className="font-bold text-[#141414]">{currentProductsCount} รายการ</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-600 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                  รูปภาพสินค้า:
                </span>
                <span className="font-bold text-[#141414]">{currentImagesCount} รูป</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-600 flex items-center gap-2">
                  <History className="w-4 h-4 text-gray-400" />
                  ประวัติการสั่งซื้อ:
                </span>
                <span className="font-bold text-[#141414]">{currentOrdersCount} รายการ</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-600 flex items-center gap-2">
                  <Store className="w-4 h-4 text-gray-400" />
                  ตั้งค่าร้าน:
                </span>
                <span className={`font-bold ${currentHasSettings ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {currentHasSettings ? 'มี' : 'ไม่มี'}
                </span>
              </div>
            </div>

            {/* Optional Device Label Input */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-gray-400" />
                ชื่ออุปกรณ์นี้ (ไม่บังคับ — เช่น Tablet ครัว, มือถือแอดมิน)
              </label>
              <input
                type="text"
                value={deviceLabel}
                onChange={(e) => setDeviceLabel(e.target.value)}
                placeholder="เช่น Tablet ครัว"
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white text-[#141414]"
              />
            </div>

            <div className="bg-orange-50/70 p-3 rounded-xl border border-orange-200/70 text-[11px] text-orange-900 leading-relaxed">
              💡 ไฟล์ JSON จะถูกบันทึกไว้ในเครื่อง คุณสามารถนำไปส่งต่อผ่าน AirDrop, LINE, หรือบันทึกใน Google Drive ได้ตามต้องการ
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs sm:text-sm font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                id="confirm-export-btn"
                type="button"
                disabled={isExporting}
                onClick={handleConfirmExport}
                className="flex-1 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#d96614] text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isExporting ? 'กำลังบันทึก...' : 'ยืนยัน Backup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Preview & Confirmation Modal */}
      {showRestoreConfirm && pendingBackupData && pendingStats && (
        <div
          id="restore-backup-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#141414]">
                  กู้คืนข้อมูลสำรอง?
                </h3>
                <p className="text-[11px] text-gray-500">
                  วันที่ Backup: {pendingStats.backupCreatedAt ? formatThaiDateTime(new Date(pendingStats.backupCreatedAt)) : 'ไม่ระบุ'}
                </p>
                {pendingStats.deviceLabel && (
                  <p className="text-[11px] text-orange-700 font-semibold flex items-center gap-1 mt-0.5">
                    <Smartphone className="w-3 h-3" />
                    จากอุปกรณ์: {pendingStats.deviceLabel}
                  </p>
                )}
              </div>
            </div>

            {/* Content Summary in Backup File */}
            <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200 space-y-2 text-xs">
              <p className="font-bold text-gray-700 pb-1 border-b border-gray-200">ข้อมูลในไฟล์:</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500">หมวดหมู่:</span>
                  <span className="font-bold text-[#141414]">{pendingStats.categoriesCount} รายการ</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500">สินค้า:</span>
                  <span className="font-bold text-[#141414]">{pendingStats.productsCount} รายการ</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500">รูปภาพสินค้า:</span>
                  <span className="font-bold text-[#141414]">{pendingStats.imageCount} รูป</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500">ประวัติการสั่งซื้อ:</span>
                  <span className="font-bold text-[#141414]">{pendingStats.orderHistoryCount} รายการ</span>
                </div>
              </div>
              <div className="flex justify-between text-[11px] pt-1 border-t border-gray-200/60">
                <span className="text-gray-500">ตั้งค่าร้าน:</span>
                <span className={`font-bold ${pendingStats.hasSettings ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {pendingStats.hasSettings ? 'มี' : 'ไม่มี'}
                </span>
              </div>
            </div>

            {/* Prominent Warning Box */}
            {hasCurrentData ? (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>เครื่องนี้มีข้อมูลอยู่แล้ว</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900">
                  การกู้คืนจะเขียนทับข้อมูลปัจจุบันของเครื่องนี้ทั้งหมด ด้วยข้อมูลจากไฟล์สำรอง (รวมถึงรายการหมวดหมู่ วัตถุดิบ และประวัติการสั่งซื้อ)
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-xs leading-relaxed">
                <p className="text-[11px]">
                  การกู้คืนข้อมูลจะเปลี่ยนข้อมูลปัจจุบันของเครื่องนี้ ด้วยข้อมูลจากไฟล์สำรอง
                </p>
              </div>
            )}

            <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              💡 หมายเหตุ: การ Restore ไม่ใช่การ Sync ข้อมูลของเครื่องนี้จะถูกแทนที่ตามไฟล์สำรองแบบ Snapshot สมบูรณ์
            </div>

            <div className="flex gap-2 pt-1">
              <button
                id="cancel-restore-backup-btn"
                type="button"
                onClick={() => {
                  setShowRestoreConfirm(false);
                  setPendingBackupData(null);
                  setPendingStats(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs sm:text-sm font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                id="confirm-restore-backup-btn"
                type="button"
                disabled={isRestoring}
                onClick={handleConfirmRestore}
                className="flex-1 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#d96614] text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? 'กำลังกู้คืน...' : 'กู้คืนข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Restore Confirmation Modal */}
      {showRestoreSuccessModal && restoreSuccessStats && (
        <div
          id="restore-success-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#141414]">
                กู้คืนข้อมูลสำเร็จ
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                ข้อมูลของเครื่องนี้ถูกแทนที่ด้วยข้อมูลจาก Backup แล้ว
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200 text-xs text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">หมวดหมู่:</span>
                <span className="font-bold text-[#141414]">{restoreSuccessStats.categoriesCount} รายการ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">สินค้า:</span>
                <span className="font-bold text-[#141414]">{restoreSuccessStats.productsCount} รายการ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ประวัติการสั่งซื้อ:</span>
                <span className="font-bold text-[#141414]">{restoreSuccessStats.orderHistoryCount} รายการ</span>
              </div>
            </div>

            <button
              id="close-restore-success-btn"
              type="button"
              onClick={() => setShowRestoreSuccessModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#141414] hover:bg-stone-800 text-white text-sm font-bold shadow-xs transition-colors cursor-pointer"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div
          id="factory-reset-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#141414]">
              ยืนยันการคืนค่าเริ่มต้นของระบบ?
            </h3>
            <p className="text-xs text-gray-500">
              หมวดหมู่และวัตถุดิบจะถูกรีเซ็ตกลับเป็น 6 หมวดหมู่มาตรฐานของ Tony's Kitchen ข้อมูลที่แก้ไขเองจะถูกลบ
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleResetFactory}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-xs cursor-pointer"
              >
                ยืนยันรีเซ็ต
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear History Confirmation Modal */}
      {showClearHistoryConfirm && (
        <div
          id="clear-history-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#141414]">
              ล้างประวัติการสั่งซื้อทั้งหมด?
            </h3>
            <p className="text-xs text-gray-500">
              ประวัติการสั่งซื้อย้อนหลังจะถูกลบออกจากเครื่อง
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearHistoryConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="flex-1 py-2.5 rounded-xl bg-[#141414] text-white text-sm font-bold hover:bg-stone-800 cursor-pointer"
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
