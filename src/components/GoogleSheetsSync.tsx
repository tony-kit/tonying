import React, { useState, useEffect, useId } from 'react';
import { Category, Product, OrderHistoryRecord } from '../types';
import {
  FileSpreadsheet,
  UploadCloud,
  DownloadCloud,
  ExternalLink,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  LogOut,
  FolderOpen,
  Layers,
  Package,
  History,
  ShieldAlert,
  Loader2,
  FileCheck,
  Info,
} from 'lucide-react';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  getCurrentUser,
} from '../services/googleAuth';
import {
  listSpreadsheets,
  createTonyKitchenSpreadsheet,
  getSpreadsheetDetails,
  syncProductsToGoogleSheet,
  syncOrdersToGoogleSheet,
  importProductsFromGoogleSheet,
  SpreadsheetFileInfo,
  SpreadsheetDetails,
  ImportResult,
} from '../services/googleSheets';
import { User } from 'firebase/auth';
import { formatCurrency, formatThaiDateTime } from '../utils/orderFormatter';

interface Props {
  categories: Category[];
  products: Product[];
  orderHistory: OrderHistoryRecord[];
  onImportProducts: (
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
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

const STORAGE_KEY_SPREADSHEET_ID = 'tonys_connected_spreadsheet_id';

export const GoogleSheetsSync: React.FC<Props> = ({
  categories,
  products,
  orderHistory,
  onImportProducts,
  onShowToast,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Spreadsheets list
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetFileInfo[]>([]);
  const [isLoadingSpreadsheets, setIsLoadingSpreadsheets] = useState(false);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SPREADSHEET_ID) || '';
    } catch {
      return '';
    }
  });
  const [spreadsheetDetails, setSpreadsheetDetails] = useState<SpreadsheetDetails | null>(null);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);

  // Action status states
  const [isSyncingProducts, setIsSyncingProducts] = useState(false);
  const [isSyncingOrders, setIsSyncingOrders] = useState(false);
  const [isReadingSheet, setIsReadingSheet] = useState(false);
  const [isApplyingImport, setIsApplyingImport] = useState(false);

  // Modals for destructive or bulk mutations
  const [showExportProductsConfirm, setShowExportProductsConfirm] = useState(false);
  const [showExportOrdersConfirm, setShowExportOrdersConfirm] = useState(false);
  const [showImportPreviewModal, setShowImportPreviewModal] = useState(false);
  const [pendingImportResult, setPendingImportResult] = useState<ImportResult | null>(null);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        setAuthError(null);
      },
      () => {
        // User logged out or needs fresh token
        setCurrentUser(getCurrentUser());
        setAccessToken(null);
      }
    );

    // Initial check
    getAccessToken().then((token) => {
      if (token) {
        setAccessToken(token);
        setCurrentUser(getCurrentUser());
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch spreadsheets list once authenticated
  useEffect(() => {
    if (accessToken) {
      loadSpreadsheetsList(accessToken);
    } else {
      setSpreadsheets([]);
      setSpreadsheetDetails(null);
    }
  }, [accessToken]);

  // Load details of selected spreadsheet
  useEffect(() => {
    if (accessToken && selectedSpreadsheetId) {
      loadSelectedSheetDetails(accessToken, selectedSpreadsheetId);
    }
  }, [accessToken, selectedSpreadsheetId]);

  const loadSpreadsheetsList = async (token: string) => {
    setIsLoadingSpreadsheets(true);
    try {
      const list = await listSpreadsheets(token);
      setSpreadsheets(list);
      
      // If we don't have a selected ID or current one isn't in the list, auto-select Tony's Kitchen sheet if found
      if (!selectedSpreadsheetId && list.length > 0) {
        const found = list.find((s) => s.name.includes("Tony's Kitchen"));
        const targetId = found ? found.id : list[0].id;
        setSelectedSpreadsheetId(targetId);
        try {
          localStorage.setItem(STORAGE_KEY_SPREADSHEET_ID, targetId);
        } catch {
          // ignore
        }
      }
    } catch (err: unknown) {
      console.error('Error loading spreadsheets:', err);
    } finally {
      setIsLoadingSpreadsheets(false);
    }
  };

  const loadSelectedSheetDetails = async (token: string, sheetId: string) => {
    try {
      const details = await getSpreadsheetDetails(token, sheetId);
      setSpreadsheetDetails(details);
    } catch (err: unknown) {
      console.error('Error fetching sheet details:', err);
    }
  };

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (!res) {
        // User closed the popup or cancelled - do not show an error banner
        return;
      }
      setCurrentUser(res.user);
      setAccessToken(res.accessToken);
      onShowToast('success', `เข้าสู่ระบบด้วย Google สำเร็จ (${res.user.email})`, 'เชื่อมต่อสำเร็จ');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถเข้าสู่ระบบ Google ได้';
      setAuthError(msg);
      onShowToast('error', msg, 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setAccessToken(null);
    setSpreadsheets([]);
    setSpreadsheetDetails(null);
    onShowToast('info', 'ออกจากระบบ Google สำเร็จ');
  };

  const handleSelectSpreadsheet = (id: string) => {
    setSelectedSpreadsheetId(id);
    try {
      localStorage.setItem(STORAGE_KEY_SPREADSHEET_ID, id);
    } catch {
      // ignore
    }
  };

  const handleCreateNewSpreadsheet = async () => {
    if (!accessToken) return;
    setIsCreatingSheet(true);
    try {
      const created = await createTonyKitchenSpreadsheet(accessToken);
      setSpreadsheets((prev) => [{ id: created.spreadsheetId, name: created.title, webViewLink: created.spreadsheetUrl }, ...prev]);
      setSelectedSpreadsheetId(created.spreadsheetId);
      setSpreadsheetDetails(created);
      try {
        localStorage.setItem(STORAGE_KEY_SPREADSHEET_ID, created.spreadsheetId);
      } catch {
        // ignore
      }
      onShowToast('success', `สร้าง Google Sheet "${created.title}" เรียบร้อยแล้ว`, 'สร้างสำเร็จ');
    } catch (err: unknown) {
      console.error('Create spreadsheet failed:', err);
      const msg = err instanceof Error ? err.message : 'ไม่สามารถสร้าง Google Sheet ได้';
      onShowToast('error', msg, 'เกิดข้อผิดพลาด');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // 1. Export Products
  const handleExecuteExportProducts = async () => {
    if (!accessToken || !selectedSpreadsheetId) return;
    setIsSyncingProducts(true);
    setShowExportProductsConfirm(false);
    try {
      const res = await syncProductsToGoogleSheet(
        accessToken,
        selectedSpreadsheetId,
        products,
        categories
      );
      onShowToast(
        'success',
        `ส่งออกรายการวัตถุดิบ ${res.rowCount} รายการ ไปยังแท็บ "รายการวัตถุดิบ" สำเร็จแล้ว`,
        'ส่งออกสำเร็จ'
      );
      if (spreadsheetDetails) {
        loadSelectedSheetDetails(accessToken, selectedSpreadsheetId);
      }
    } catch (err: unknown) {
      console.error('Export products failed:', err);
      const msg = err instanceof Error ? err.message : 'ไม่สามารถส่งออกข้อมูลวัตถุดิบได้';
      onShowToast('error', msg, 'เกิดข้อผิดพลาด');
    } finally {
      setIsSyncingProducts(false);
    }
  };

  // 2. Export Orders
  const handleExecuteExportOrders = async () => {
    if (!accessToken || !selectedSpreadsheetId) return;
    setIsSyncingOrders(true);
    setShowExportOrdersConfirm(false);
    try {
      const res = await syncOrdersToGoogleSheet(
        accessToken,
        selectedSpreadsheetId,
        orderHistory
      );
      onShowToast(
        'success',
        `ส่งออกประวัติคำสั่งซื้อ ${res.rowCount} รายการ ไปยังแท็บ "ประวัติการสั่งซื้อ" สำเร็จแล้ว`,
        'ส่งออกสำเร็จ'
      );
      if (spreadsheetDetails) {
        loadSelectedSheetDetails(accessToken, selectedSpreadsheetId);
      }
    } catch (err: unknown) {
      console.error('Export orders failed:', err);
      const msg = err instanceof Error ? err.message : 'ไม่สามารถส่งออกประวัติการสั่งซื้อได้';
      onShowToast('error', msg, 'เกิดข้อผิดพลาด');
    } finally {
      setIsSyncingOrders(false);
    }
  };

  // 3. Read and Prepare Import
  const handleReadSheetForImport = async () => {
    if (!accessToken || !selectedSpreadsheetId) return;
    setIsReadingSheet(true);
    try {
      const result = await importProductsFromGoogleSheet(
        accessToken,
        selectedSpreadsheetId,
        'รายการวัตถุดิบ'
      );
      setPendingImportResult(result);
      setShowImportPreviewModal(true);
    } catch (err: unknown) {
      console.error('Read sheet failed:', err);
      const msg = err instanceof Error ? err.message : 'ไม่สามารถอ่านข้อมูลจาก Google Sheet ได้';
      onShowToast('error', msg, 'เกิดข้อผิดพลาด');
    } finally {
      setIsReadingSheet(false);
    }
  };

  // Apply imported products to IndexedDB / App
  const handleConfirmImport = async () => {
    if (!pendingImportResult || pendingImportResult.products.length === 0) return;
    setIsApplyingImport(true);
    try {
      await onImportProducts(pendingImportResult.products);
      setShowImportPreviewModal(false);
      setPendingImportResult(null);
      onShowToast(
        'success',
        `นำเข้าวัตถุดิบ ${pendingImportResult.validRows} รายการ และสร้าง/ตรวจสอบ ${pendingImportResult.categories.length} หมวดหมู่เรียบร้อยแล้ว`,
        'นำเข้าสำเร็จ'
      );
    } catch (err: unknown) {
      console.error('Apply import failed:', err);
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูลนำเข้า';
      onShowToast('error', msg, 'เกิดข้อผิดพลาด');
    } finally {
      setIsApplyingImport(false);
    }
  };

  const activeSheetUrl = spreadsheetDetails?.spreadsheetUrl || (selectedSpreadsheetId ? `https://docs.google.com/spreadsheets/d/${selectedSpreadsheetId}/edit` : null);

  return (
    <div id="google-sheets-sync-section" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
              <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-[#141414] tracking-tight">
                  Google Sheets Integration
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  Official Google API
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                เชื่อมต่อฐานข้อมูลร้านค้ากับ Google Sheets ใน Google Drive ซิงก์รายการวัตถุดิบและประวัติคำสั่งซื้อแบบ 2 ทาง
              </p>
            </div>
          </div>

          {/* Auth Button / User Profile */}
          <div className="shrink-0">
            {currentUser && accessToken ? (
              <div className="flex items-center gap-3 bg-[#F8F7F4] p-2 sm:p-2.5 rounded-2xl border border-gray-200">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google Account'}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full border border-gray-300"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                    {currentUser.email?.charAt(0).toUpperCase() || 'G'}
                  </div>
                )}
                <div className="min-w-0 pr-1">
                  <p className="text-xs font-bold text-[#141414] truncate max-w-[140px] sm:max-w-[180px]">
                    {currentUser.displayName || currentUser.email}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> เชื่อมต่อแล้ว
                  </p>
                </div>
                <button
                  id="google-signout-btn"
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-white transition-colors cursor-pointer"
                  title="ออกจากระบบ Google"
                  aria-label="ออกจากระบบ Google"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="google-signin-btn"
                type="button"
                disabled={isAuthenticating}
                onClick={handleSignIn}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-300 shadow-2xs font-bold text-xs sm:text-sm text-gray-700 transition-all cursor-pointer disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                )}
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>

        {authError && (
          <div className="mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}
      </div>

      {/* When Not Logged In Notice */}
      {(!currentUser || !accessToken) && (
        <div className="bg-[#FAF9F6] rounded-3xl p-8 border border-gray-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h4 className="text-base sm:text-lg font-bold text-[#141414]">
              เชื่อมต่อ Google Account เพื่อใช้งาน Google Sheets
            </h4>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
              เมื่อเข้าสู่ระบบด้วย Google คุณสามารถสร้างไฟล์ชีทอัตโนมัติ ส่งออกรายการวัตถุดิบ บันทึกประวัติคำสั่งซื้อ และนำเข้าราคาล่าสุดจาก Google Drive ได้อย่างง่ายดาย
            </p>
          </div>
          <div>
            <button
              id="google-signin-btn-large"
              type="button"
              disabled={isAuthenticating}
              onClick={handleSignIn}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-[#141414] hover:bg-black text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isAuthenticating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              )}
              <span>เข้าสู่ระบบด้วย Google และเริ่มใช้งาน</span>
            </button>
          </div>
        </div>
      )}

      {/* Connected Sheet Selector & Controls */}
      {currentUser && accessToken && (
        <div className="space-y-6">
          {/* Target Spreadsheet Box */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm sm:text-base font-black text-[#141414] flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-emerald-600" />
                  <span>Google Spreadsheet ที่เชื่อมต่ออยู่</span>
                </h4>
                <p className="text-xs text-gray-500 font-medium">
                  เลือกไฟล์ Google Sheet จาก Drive ของคุณ หรือกดสร้างไฟล์ใหม่
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="refresh-sheets-list-btn"
                  type="button"
                  disabled={isLoadingSpreadsheets}
                  onClick={() => loadSpreadsheetsList(accessToken)}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors flex items-center gap-1.5"
                  title="รีเฟรชรายการไฟล์"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSpreadsheets ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">รีเฟรช</span>
                </button>

                <button
                  id="create-new-sheet-btn"
                  type="button"
                  disabled={isCreatingSheet}
                  onClick={handleCreateNewSpreadsheet}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {isCreatingSheet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>+ สร้าง Sheet ใหม่</span>
                </button>
              </div>
            </div>

            {/* Dropdown Selector */}
            <div className="space-y-2">
              <label htmlFor="select-google-sheet" className="block text-xs font-bold text-gray-700">
                เลือก Spreadsheet ปลายทาง:
              </label>
              <select
                id="select-google-sheet"
                value={selectedSpreadsheetId}
                onChange={(e) => handleSelectSpreadsheet(e.target.value)}
                className="w-full bg-[#FAF9F6] border border-gray-300 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all cursor-pointer"
              >
                {spreadsheets.length === 0 ? (
                  <option value="">(ไม่พบไฟล์ Google Sheet ใน Drive - กรุณากดสร้าง Sheet ใหม่)</option>
                ) : (
                  spreadsheets.map((s) => (
                    <option key={s.id} value={s.id}>
                      📄 {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Selected Sheet Info Badge & Open Link */}
            {selectedSpreadsheetId && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-900 truncate">
                      {spreadsheetDetails?.title || 'ไฟล์ที่เลือกพร้อมใช้งาน'}
                    </p>
                    {spreadsheetDetails && (
                      <p className="text-[11px] text-emerald-700 font-medium truncate">
                        มี {spreadsheetDetails.sheets.length} แท็บ ({spreadsheetDetails.sheets.map((s) => s.title).join(', ')})
                      </p>
                    )}
                  </div>
                </div>

                {activeSheetUrl && (
                  <a
                    id="open-in-google-sheets-link"
                    href={activeSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-300 text-emerald-800 text-xs font-bold transition-all shadow-2xs"
                  >
                    <span>เปิดใน Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Sync Operations Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Export Products */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-[#141414]">
                    ส่งออกรายการวัตถุดิบ
                  </h4>
                  <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">
                    ส่งออกวัตถุดิบทั้งหมด ({products.length} รายการ) และหมวดหมู่ ({categories.length} หมวด) ไปยังแท็บ "รายการวัตถุดิบ" ใน Sheet
                  </p>
                </div>
              </div>

              <button
                id="export-products-to-sheet-btn"
                type="button"
                disabled={!selectedSpreadsheetId || isSyncingProducts}
                onClick={() => setShowExportProductsConfirm(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-40"
              >
                {isSyncingProducts ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                <span>ส่งออกวัตถุดิบไปยัง Sheet</span>
              </button>
            </div>

            {/* 2. Export Orders History */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-[#141414]">
                    ส่งออกประวัติคำสั่งซื้อ
                  </h4>
                  <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">
                    บันทึกประวัติออเดอร์ทั้งหมด ({orderHistory.length} ออเดอร์) พร้อมรายละเอียดยอดเงินและรายการสินค้าไปยังแท็บ "ประวัติการสั่งซื้อ"
                  </p>
                </div>
              </div>

              <button
                id="export-orders-to-sheet-btn"
                type="button"
                disabled={!selectedSpreadsheetId || isSyncingOrders}
                onClick={() => setShowExportOrdersConfirm(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-40"
              >
                {isSyncingOrders ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                <span>ส่งออกประวัติออเดอร์</span>
              </button>
            </div>

            {/* 3. Import Products from Sheet */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <DownloadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-[#141414]">
                    นำเข้าวัตถุดิบจาก Sheet
                  </h4>
                  <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">
                    อ่านข้อมูลจากตาราง Google Sheet เพื่ออัปเดตราคา ชื่อ และหมวดหมู่วัตถุดิบลงในแอป (มีหน้าต่างตรวจสอบก่อนบันทึก)
                  </p>
                </div>
              </div>

              <button
                id="import-products-from-sheet-btn"
                type="button"
                disabled={!selectedSpreadsheetId || isReadingSheet}
                onClick={handleReadSheetForImport}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-40"
              >
                {isReadingSheet ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <DownloadCloud className="w-4 h-4" />
                )}
                <span>อ่านและนำเข้าจาก Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Export Products */}
      {showExportProductsConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-gray-200 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-blue-600">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#141414]">
                ยืนยันการส่งออกรายการวัตถุดิบ
              </h3>
            </div>

            <div className="text-xs sm:text-sm text-gray-600 space-y-2 leading-relaxed">
              <p>
                คุณต้องการส่งออกข้อมูลวัตถุดิบจำนวน <strong>{products.length} รายการ</strong> ({categories.length} หมวดหมู่) ไปยังแท็บ <strong>"รายการวัตถุดิบ"</strong> ใน Google Sheet หรือไม่?
              </p>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-800 text-xs">
                ℹ️ ข้อมูลในแท็บดังกล่าวของ Google Sheet จะถูกอัปเดตด้วยข้อมูลล่าสุดจากแอปของคุณ
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExportProductsConfirm(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs sm:text-sm font-bold hover:bg-gray-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteExportProducts}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-2xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันการส่งออก</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Export Orders */}
      {showExportOrdersConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-gray-200 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-purple-600">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0">
                <History className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#141414]">
                ยืนยันการส่งออกประวัติคำสั่งซื้อ
              </h3>
            </div>

            <div className="text-xs sm:text-sm text-gray-600 space-y-2 leading-relaxed">
              <p>
                คุณต้องการส่งออกประวัติคำสั่งซื้อทั้งหมดจำนวน <strong>{orderHistory.length} ออเดอร์</strong> ไปยังแท็บ <strong>"ประวัติการสั่งซื้อ"</strong> ใน Google Sheet หรือไม่?
              </p>
              <div className="p-3 bg-purple-50 rounded-xl text-purple-800 text-xs">
                ℹ️ รวมข้อมูล วันที่, รายการสินค้า, ยอดเงินรวม, และสรุปหมวดหมู่ครบถ้วน
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExportOrdersConfirm(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs sm:text-sm font-bold hover:bg-gray-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteExportOrders}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold shadow-2xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันการส่งออก</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW & CONFIRMATION MODAL: Import Products from Sheet */}
      {showImportPreviewModal && pendingImportResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-gray-200 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-3 text-amber-600 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#141414]">
                  ตรวจสอบข้อมูลนำเข้าจาก Google Sheet
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  อ่านพบ {pendingImportResult.validRows} รายการ ({pendingImportResult.categories.length} หมวดหมู่)
                </p>
              </div>
            </div>

            {/* Stats Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
              <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-gray-200 text-center">
                <span className="text-xs text-gray-500 font-medium">รายการที่พบ</span>
                <p className="text-base font-black text-[#141414]">{pendingImportResult.validRows} รายการ</p>
              </div>
              <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-gray-200 text-center">
                <span className="text-xs text-gray-500 font-medium">หมวดหมู่ที่พบ</span>
                <p className="text-base font-black text-[#141414]">{pendingImportResult.categories.length} หมวด</p>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-[#FAF9F6] p-3 rounded-2xl border border-gray-200 text-center">
                <span className="text-xs text-gray-500 font-medium">วัตถุดิบเดิมในแอป</span>
                <p className="text-base font-black text-gray-600">{products.length} รายการ</p>
              </div>
            </div>

            {/* Preview Table */}
            <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 text-gray-600 font-bold">
                  <tr>
                    <th className="p-2.5">ลำดับ</th>
                    <th className="p-2.5">ชื่อวัตถุดิบ</th>
                    <th className="p-2.5">หมวดหมู่</th>
                    <th className="p-2.5 text-right">ราคา/หน่วย</th>
                    <th className="p-2.5 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                  {pendingImportResult.products.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/80">
                      <td className="p-2.5 text-gray-400">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-[#141414]">{item.name}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-semibold">
                          {item.categoryName}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono">
                        {formatCurrency(item.price)} / {item.unit}
                      </td>
                      <td className="p-2.5 text-center">
                        {item.isActive ? (
                          <span className="text-emerald-600 font-bold text-[11px]">เปิด</span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">ปิด</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2 shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>คำเตือน:</strong> การนำเข้าจะอัปเดตแคตตาล็อกวัตถุดิบและหมวดหมู่ในแอปให้ตรงตาม Google Sheet นี้ (รูปภาพเดิมของสินค้าที่มีชื่อตรงกันจะยังคงถูกเก็บรักษาไว้)
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 shrink-0">
              <button
                type="button"
                disabled={isApplyingImport}
                onClick={() => {
                  setShowImportPreviewModal(false);
                  setPendingImportResult(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs sm:text-sm font-bold hover:bg-gray-100 cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                id="confirm-apply-sheet-import-btn"
                type="button"
                disabled={isApplyingImport}
                onClick={handleConfirmImport}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs sm:text-sm font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isApplyingImport ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>ยืนยันและนำเข้าข้อมูล ({pendingImportResult.validRows} รายการ)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
