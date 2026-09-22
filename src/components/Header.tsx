import React, { useRef } from 'react';
import { AppSettings, ActiveTab } from '../types';
import { Settings, Camera, Database } from 'lucide-react';
import { compressAndResizeImage } from '../utils/imageUtils';

interface HeaderProps {
  settings: AppSettings;
  activeTab: ActiveTab;
  activeSubTab?: string;
  onOpenSettings: () => void;
  onOpenBackup?: () => void;
  onUpdateLogo: (logoDataUrl: string) => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  activeTab,
  activeSubTab,
  onOpenSettings,
  onOpenBackup,
  onUpdateLogo,
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressAndResizeImage(file, 400, 0.9);
      await onUpdateLogo(dataUrl);
    } catch (err) {
      console.error('Logo upload failed:', err);
    } finally {
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-xs px-3 sm:px-6 py-2.5 sm:py-3 pt-[calc(0.625rem+env(safe-area-inset-top,0px))]"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Tony's Kitchen Logo & Branding */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="relative group shrink-0">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
              aria-label="เปลี่ยนโลโก้ร้าน"
            />
            <button
              id="header-logo-button"
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#F27D26] overflow-hidden flex items-center justify-center shadow-2xs transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
              title="แตะเพื่อเปลี่ยนรูปโลโก้ร้าน"
            >
              {settings.logoDataUrl ? (
                <img
                  src={settings.logoDataUrl}
                  alt={settings.storeName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-black text-base sm:text-lg tracking-tight">TK</span>
              )}
              {/* Overlay hint */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold tracking-tight text-[#141414] leading-tight truncate">
              {settings.storeName || "Tony's Kitchen"}
            </h1>
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-semibold truncate">
              {settings.branchNote || 'Ingredient Order'}
            </p>
          </div>
        </div>

        {/* Right: Status badge & Settings Gear */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* OFFLINE READY Badge (Compact) */}
          <div
            id="offline-ready-badge"
            className="bg-green-50 text-green-700 px-2 sm:px-2.5 py-1 rounded-full text-[9px] sm:text-[11px] font-bold border border-green-200 flex items-center gap-1.5 shadow-2xs select-none"
            title="ระบบทำงานแบบ Local-First ไม่ต้องต่ออินเทอร์เน็ต"
          >
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="tracking-wide hidden md:inline">OFFLINE READY</span>
            <span className="tracking-wide md:hidden">OFFLINE</span>
          </div>

          {/* Quick Backup/Restore Button */}
          {onOpenBackup && (
            <button
              id="header-backup-button"
              type="button"
              onClick={onOpenBackup}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer ${
                activeTab === 'settings' && activeSubTab === 'backup'
                  ? 'bg-[#F27D26] text-white border-[#F27D26]'
                  : 'bg-orange-50 text-orange-950 border-orange-200 hover:bg-orange-100'
              }`}
              title="ระบบสำรองและกู้คืนข้อมูล (Backup & Restore)"
              aria-label="ระบบสำรองและกู้คืนข้อมูล"
            >
              <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F27D26] shrink-0" />
              <span className="hidden xs:inline">Backup</span>
            </button>
          )}

          {/* Settings Gear Button */}
          <button
            id="header-settings-button"
            type="button"
            onClick={onOpenSettings}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center transition-all active:scale-95 shadow-2xs cursor-pointer ${
              activeTab === 'settings' && activeSubTab !== 'backup'
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-[#F8F7F4] text-gray-700 border-gray-200 hover:bg-gray-200'
            }`}
            title="การตั้งค่าและจัดการระบบ"
            aria-label="การตั้งค่าและจัดการระบบ"
          >
            <Settings className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${activeTab === 'settings' && activeSubTab !== 'backup' ? 'rotate-90' : ''} transition-transform duration-300`} />
          </button>
        </div>
      </div>
    </header>
  );
};
