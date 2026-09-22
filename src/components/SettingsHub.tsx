import React, { useState, useEffect } from 'react';
import { AppSettings, Category, Product, OrderHistoryRecord, CartState } from '../types';
import { ProductManagement } from './ProductManagement';
import { CategoryManagement } from './CategoryManagement';
import { SettingsView } from './SettingsView';
import { OrderHistoryView } from './OrderHistoryView';
import { GoogleSheetsSync } from './GoogleSheetsSync';
import { BackupRestoreView } from './BackupRestoreView';
import { Package, Layers, Sliders, ArrowLeft, History, FileSpreadsheet, Database } from 'lucide-react';

interface Props {
  categories: Category[];
  products: Product[];
  settings: AppSettings;
  orderHistory: OrderHistoryRecord[];
  currentCart: CartState;
  initialSubTab?: ManagementSubTab;
  onSubTabChange?: (tab: ManagementSubTab) => void;
  onBackToOrder: () => void;
  onQuickReorder: (order: OrderHistoryRecord, mode: 'merge' | 'replace') => { addedCount: number; unavailableItems: string[] };
  onDeleteOrder: (orderId: string) => Promise<void>;
  onClearAllHistory: () => Promise<void>;
  onSaveCategory: (category: Partial<Category> & { name: string }) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onReorderCategories: (categories: Category[]) => Promise<void>;
  onSaveProduct: (product: Partial<Product> & { name: string; categoryId: string }) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onToggleProductActive: (productId: string) => Promise<void>;
  onEnableAllProducts?: () => Promise<void>;
  onReorderProducts?: (orderedProductsInCat: Product[]) => Promise<void>;
  onImportProductsFromSheets?: (
    importedProducts: {
      name: string;
      categoryName: string;
      price: number;
      unit: string;
      productCode?: string;
      isActive: boolean;
      sortOrder: number;
    }[]
  ) => Promise<void>;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onDataReloadNeeded: () => Promise<void>;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export type ManagementSubTab = 'products' | 'categories' | 'history' | 'sheets' | 'backup' | 'settings';

export const SettingsHub: React.FC<Props> = ({
  categories,
  products,
  settings,
  orderHistory,
  currentCart,
  initialSubTab = 'products',
  onSubTabChange,
  onBackToOrder,
  onQuickReorder,
  onDeleteOrder,
  onClearAllHistory,
  onSaveCategory,
  onDeleteCategory,
  onReorderCategories,
  onSaveProduct,
  onDeleteProduct,
  onToggleProductActive,
  onEnableAllProducts,
  onReorderProducts,
  onImportProductsFromSheets,
  onSaveSettings,
  onDataReloadNeeded,
  onShowToast,
}) => {
  const [currentSubTab, setCurrentSubTab] = useState<ManagementSubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab && initialSubTab !== currentSubTab) {
      setCurrentSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleSwitchSubTab = (tab: ManagementSubTab) => {
    setCurrentSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  return (
    <div id="settings-hub-view" className="space-y-6 pb-20">
      {/* Top Management Header & Back Button */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            id="back-to-order-btn"
            type="button"
            onClick={onBackToOrder}
            className="p-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-[#141414] transition-all flex items-center gap-2 font-bold text-sm shadow-2xs"
            aria-label="กลับไปหน้าสั่งของ"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            <span>กลับไปหน้าสั่งของ</span>
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#141414] tracking-tight">
              การจัดการระบบ
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              จัดการรายการวัตถุดิบ หมวดหมู่ ประวัติการสั่งซื้อ Google Sheets และการตั้งค่าร้าน
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1.5 bg-[#F8F7F4] p-1.5 rounded-2xl border border-gray-200 overflow-x-auto no-scrollbar">
          <button
            id="subtab-products-btn"
            type="button"
            onClick={() => handleSwitchSubTab('products')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              currentSubTab === 'products'
                ? 'bg-[#141414] text-white shadow-2xs'
                : 'text-gray-600 hover:text-[#141414] hover:bg-white/60'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>วัตถุดิบ</span>
            <span className="text-[11px] opacity-70">({products.length})</span>
          </button>

          <button
            id="subtab-categories-btn"
            type="button"
            onClick={() => handleSwitchSubTab('categories')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              currentSubTab === 'categories'
                ? 'bg-[#141414] text-white shadow-2xs'
                : 'text-gray-600 hover:text-[#141414] hover:bg-white/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>หมวดหมู่</span>
            <span className="text-[11px] opacity-70">({categories.length})</span>
          </button>

          <button
            id="subtab-history-btn"
            type="button"
            onClick={() => handleSwitchSubTab('history')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              currentSubTab === 'history'
                ? 'bg-[#141414] text-white shadow-2xs'
                : 'text-gray-600 hover:text-[#141414] hover:bg-white/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>ประวัติการสั่งซื้อ</span>
            <span className="text-[11px] opacity-70">({orderHistory.length})</span>
          </button>

          <button
            id="subtab-sheets-btn"
            type="button"
            onClick={() => handleSwitchSubTab('sheets')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              currentSubTab === 'sheets'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-gray-600 hover:text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Google Sheets</span>
          </button>

          <button
            id="subtab-backup-btn"
            type="button"
            onClick={() => handleSwitchSubTab('backup')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              currentSubTab === 'backup'
                ? 'bg-[#F27D26] text-white shadow-2xs'
                : 'text-gray-600 hover:text-[#F27D26] hover:bg-orange-50'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>สำรอง & กู้คืน (Backup)</span>
          </button>

          <button
            id="subtab-settings-btn"
            type="button"
            onClick={() => handleSwitchSubTab('settings')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              currentSubTab === 'settings'
                ? 'bg-[#141414] text-white shadow-2xs'
                : 'text-gray-600 hover:text-[#141414] hover:bg-white/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>ตั้งค่าร้านค้า</span>
          </button>
        </div>
      </div>

      {/* Render Active Sub-Tab View */}
      {currentSubTab === 'products' && (
        <ProductManagement
          categories={categories}
          products={products}
          onSaveProduct={onSaveProduct}
          onDeleteProduct={onDeleteProduct}
          onToggleActive={onToggleProductActive}
          onEnableAllProducts={onEnableAllProducts}
          onReorderProducts={onReorderProducts}
        />
      )}

      {currentSubTab === 'categories' && (
        <CategoryManagement
          categories={categories}
          products={products}
          onSaveCategory={onSaveCategory}
          onDeleteCategory={onDeleteCategory}
          onReorderCategories={onReorderCategories}
        />
      )}

      {currentSubTab === 'history' && (
        <OrderHistoryView
          orderHistory={orderHistory}
          products={products}
          currentCart={currentCart}
          onQuickReorder={onQuickReorder}
          onDeleteOrder={onDeleteOrder}
          onClearAllHistory={onClearAllHistory}
          onNavigateToOrder={onBackToOrder}
          onShowToast={onShowToast}
        />
      )}

      {currentSubTab === 'sheets' && (
        <GoogleSheetsSync
          categories={categories}
          products={products}
          orderHistory={orderHistory}
          onImportProducts={async (importedItems) => {
            if (onImportProductsFromSheets) {
              await onImportProductsFromSheets(importedItems);
            }
          }}
          onShowToast={onShowToast}
        />
      )}

      {currentSubTab === 'backup' && (
        <BackupRestoreView
          categories={categories}
          products={products}
          settings={settings}
          orderHistory={orderHistory}
          onDataReloadNeeded={onDataReloadNeeded}
          onShowToast={onShowToast}
        />
      )}

      {currentSubTab === 'settings' && (
        <SettingsView
          settings={settings}
          categories={categories}
          products={products}
          orderHistory={orderHistory}
          onSaveSettings={onSaveSettings}
          onDataReloadNeeded={onDataReloadNeeded}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};

