import React, { useState, useMemo } from 'react';
import { CategoryGroupSummary, AppSettings, STORE_DELIVERY_NOTICE } from '../types';
import {
  generateVersionAText,
  generateVersionBText,
  getLineShareUrl,
  detectDevicePlatform,
  copyToClipboard,
  shareTextViaDevice,
  formatCurrency,
} from '../utils/orderFormatter';
import {
  X,
  Copy,
  Check,
  Send,
  ArrowLeft,
  Share2,
  Receipt,
  MessageCircle,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  groupedSummary: CategoryGroupSummary[];
  grandTotal: number;
  settings: AppSettings;
  onOrderConfirmed: (versionAText: string, versionBText: string) => void;
  onFinishOrder: () => void;
}

export const NormalOrderReviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  groupedSummary,
  grandTotal,
  settings,
  onOrderConfirmed,
  onFinishOrder,
}) => {
  const [copiedType, setCopiedType] = useState<'none' | 'versionA' | 'versionB' | 'fallback'>('none');
  const [activeTab, setActiveTab] = useState<'table' | 'text'>('table');
  const [showFallback, setShowFallback] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const platform = detectDevicePlatform();
  const versionAText = generateVersionAText(groupedSummary, grandTotal, settings);
  const lineMessage = generateVersionBText(groupedSummary);
  const { encodedMessage, lineShareUrl, androidIntentUrl } = getLineShareUrl(lineMessage);

  const totalItemsCount = groupedSummary.reduce((acc, g) => acc + g.items.length, 0);

  const { regularSubtotal, drinkSubtotal, drinkVat } = useMemo(() => {
    let regularSub = 0;
    let drinkSub = 0;
    for (const g of groupedSummary) {
      const isDrink = Boolean(
        g.isDrink ||
        g.category.isDrink ||
        g.category.name.includes('เครื่องดื่ม') ||
        g.category.name.toLowerCase().includes('drink')
      );
      if (isDrink) {
        drinkSub += g.subtotal;
      } else {
        regularSub += g.subtotal;
      }
    }
    const vat = Math.round(drinkSub * 0.07 * 100) / 100;
    return { regularSubtotal: regularSub, drinkSubtotal: drinkSub, drinkVat: vat };
  }, [groupedSummary]);

  const handleCopy = async (type: 'versionA' | 'versionB' | 'fallback') => {
    const text = type === 'versionA' ? versionAText : lineMessage;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedType(type);
      setTimeout(() => setCopiedType('none'), 2500);
    }
  };

  const handleConfirmAndSendLine = async () => {
    if (isSending) return;
    setIsSending(true);

    // 1. Debug logging
    console.log('[LINE] Platform:', platform);
    console.log('[LINE] Message:', lineMessage);
    console.log('[LINE] Official Share URL:', lineShareUrl);
    if (platform === 'android') {
      console.log('[LINE] Android Intent URL:', androidIntentUrl);
    }

    // 2. Pre-copy LINE Version B text to clipboard for user convenience
    await copyToClipboard(lineMessage);

    // 3. Save order record in database so data is never lost
    onOrderConfirmed(versionAText, lineMessage);

    // 4. Immediately switch modal to fallback view (ready if device stays on page)
    setShowFallback(true);
    setTimeout(() => setIsSending(false), 1000);

    // 5. Open the LINE share URL directly via window.location.href (preferred for mobile)
    try {
      if (platform === 'android') {
        window.location.href = androidIntentUrl;
      } else {
        window.location.href = lineShareUrl;
      }
    } catch (err) {
      console.warn('Navigation to LINE share URL failed:', err);
    }
  };

  const handleOpenLineAgain = () => {
    console.log('[LINE] Opening official share URL again:', lineShareUrl);
    window.location.href = lineShareUrl;
  };

  const handleReturnToEdit = () => {
    setShowFallback(false);
    onClose();
  };

  const handleFinish = () => {
    setShowFallback(false);
    setCopiedType('none');
    onFinishOrder();
  };

  const handleCloseHeader = () => {
    if (showFallback) {
      handleFinish();
    } else {
      onClose();
    }
  };

  const handleShareViaDevice = async () => {
    const success = await shareTextViaDevice(
      `สั่งวัตถุดิบ ${settings.storeName}`,
      lineMessage
    );
    if (success) {
      onOrderConfirmed(versionAText, lineMessage);
    }
  };

  return (
    <div
      id="normal-order-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="normal-order-modal-content"
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-[#141414] text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#F27D26] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {showFallback ? 'การแชร์ข้อความผ่าน LINE' : 'ตรวจสอบและยืนยันออเดอร์'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {showFallback
                  ? 'เลือกผู้รับและส่งข้อความใน LINE'
                  : 'ฉบับตรวจสอบราคาในร้าน (Version A)'}
              </p>
            </div>
          </div>
          <button
            id="close-normal-review-modal"
            onClick={handleCloseHeader}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl transition-colors"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {showFallback ? (
          /* FALLBACK SCREEN VIEW */
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-gray-50/50">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-950 shadow-2xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-amber-900">ไม่สามารถเปิด LINE ได้อัตโนมัติ</p>
                <p className="text-amber-800 leading-relaxed font-medium">
                  หากเบราว์เซอร์ไม่สลับไปยังหน้าจอแชร์ของแอป LINE อัตโนมัติ สามารถกดปุ่มเปิด LINE อีกครั้ง หรือคัดลอกข้อความด้านล่างแล้วเปิด LINE เพื่อเลือกผู้รับและกดส่งด้วยตนเอง
                </p>
              </div>
            </div>

            {/* Version B Clean Preview Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">
                  ข้อความรายการสั่งซื้อ (Version B — เฉพาะสินค้าและจำนวน):
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  บันทึกประวัติออเดอร์แล้ว
                </span>
              </div>
              <div className="bg-white text-[#141414] p-4 rounded-2xl border border-gray-200 font-mono text-xs leading-relaxed whitespace-pre-wrap select-all shadow-2xs">
                {lineMessage}
              </div>
            </div>

            {/* Action Buttons Container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Button 1: เปิด LINE อีกครั้ง (Official https://line.me/R/share?text=...) */}
              <button
                id="fallback-open-line-again-btn"
                type="button"
                onClick={handleOpenLineAgain}
                className="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>เปิด LINE อีกครั้ง</span>
              </button>

              {/* Button 2: คัดลอกข้อความ */}
              <button
                id="fallback-copy-message-btn"
                type="button"
                onClick={() => handleCopy('fallback')}
                className="p-3.5 rounded-2xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-sm flex items-center justify-center gap-2 shadow-2xs transition-colors"
              >
                {copiedType === 'fallback' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">คัดลอกข้อความแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-gray-600" />
                    <span>คัดลอกข้อความ</span>
                  </>
                )}
              </button>
            </div>

            {/* Button 3: กลับไปแก้ไข Order and Finish Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-gray-200 text-xs">
              <button
                id="fallback-return-edit-btn"
                type="button"
                onClick={handleReturnToEdit}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับไปแก้ไข Order</span>
              </button>

              <button
                id="fallback-finish-btn"
                type="button"
                onClick={handleFinish}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl transition-colors text-center text-sm shadow-xs flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>เสร็จสิ้น</span>
              </button>
            </div>
          </div>
        ) : (
          /* NORMAL REVIEW VIEW */
          <>
            {/* View Switcher Bar (Table view vs Raw Text view) */}
            <div className="bg-gray-100/80 px-5 py-2.5 border-b border-gray-200 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-gray-200/70 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setActiveTab('table')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    activeTab === 'table' ? 'bg-white text-[#141414] shadow-xs' : 'text-gray-600'
                  }`}
                >
                  มุมมองตารางสรุป
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    activeTab === 'text' ? 'bg-white text-[#141414] shadow-xs' : 'text-gray-600'
                  }`}
                >
                  ข้อความ Version A
                </button>
              </div>

              <button
                onClick={() => handleCopy('versionA')}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
              >
                {copiedType === 'versionA' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกฉบับตรวจราคา</span>
                  </>
                )}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-gray-50/50">
              {activeTab === 'table' ? (
                <div className="space-y-4">
                  {/* Shop Delivery Schedule Notice Banner */}
                  <div className="bg-red-600 border-2 border-red-700 rounded-2xl p-4 text-white flex items-center gap-3.5 shadow-md">
                    <span className="text-2xl sm:text-3xl shrink-0">🚚</span>
                    <div className="min-w-0 flex-1">
                      <div className="inline-block bg-white text-red-700 text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-md mb-1 shadow-xs uppercase tracking-wide">
                        รอบวันจัดส่งร้านค้า
                      </div>
                      <div className="text-sm sm:text-base font-black text-white leading-snug drop-shadow-xs">
                        {STORE_DELIVERY_NOTICE}
                      </div>
                    </div>
                  </div>

                  {groupedSummary.map((group) => {
                    const isDrink = Boolean(
                      group.isDrink ||
                      group.category.isDrink ||
                      group.category.name.includes('เครื่องดื่ม') ||
                      group.category.name.toLowerCase().includes('drink')
                    );
                    const groupVat = typeof group.vatAmount === 'number'
                      ? group.vatAmount
                      : Math.round(group.subtotal * 0.07 * 100) / 100;
                    const groupTotalWithVat = typeof group.totalWithVat === 'number'
                      ? group.totalWithVat
                      : Math.round((group.subtotal + groupVat) * 100) / 100;

                    return (
                      <div
                        key={group.category.id}
                        className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs"
                      >
                        <div className="bg-gray-100/70 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-[#141414]">
                              📁 {group.category.name}
                            </span>
                            {isDrink && (
                              <span className="bg-orange-100 text-[#F27D26] text-[10px] font-black px-1.5 py-0.2 rounded-md border border-orange-200">
                                +VAT 7%
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-[#F27D26] bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200">
                            {isDrink ? `รวมสุทธิ ฿${formatCurrency(groupTotalWithVat)}` : `รวม ฿${formatCurrency(group.subtotal)}`}
                          </span>
                        </div>

                        <div className="divide-y divide-gray-100">
                          {group.items.map((item) => (
                            <div
                              key={item.productId}
                              className="px-4 py-3 flex items-center justify-between text-xs sm:text-sm gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-[#141414] truncate">
                                  {item.product.name}
                                </p>
                                {item.product.productCode && (
                                  <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                    รหัส: {item.product.productCode}
                                  </span>
                                )}
                                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                                  @฿{formatCurrency(item.product.price)} / {item.product.unit}
                                </p>
                              </div>
                              <div className="text-center font-bold px-2.5 py-1 bg-gray-100 rounded-xl text-[#141414] shrink-0 border border-gray-200">
                                {item.quantity} {item.product.unit}
                              </div>
                              <div className="text-right font-bold text-[#141414] w-24 shrink-0">
                                ฿{formatCurrency(item.lineTotal)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {isDrink && (
                          <div className="bg-orange-50/60 px-4 py-2 border-t border-orange-100 flex flex-wrap items-center justify-between text-xs text-gray-700 font-medium">
                            <span className="text-orange-900 font-semibold">หมวดเครื่องดื่ม คิดภาษีมูลค่าเพิ่ม VAT 7%:</span>
                            <div className="space-x-2 font-bold">
                              <span>ค่าสินค้า ฿{formatCurrency(group.subtotal)}</span>
                              <span className="text-[#F27D26]">+ VAT ฿{formatCurrency(groupVat)}</span>
                              <span className="text-gray-900">= ฿{formatCurrency(groupTotalWithVat)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Grand Total Summary Bento Box */}
                  <div className="bg-orange-50 rounded-2xl p-5 border border-orange-200 shadow-2xs space-y-3">
                    {drinkVat > 0 && (
                      <div className="space-y-1 text-xs border-b border-orange-200/80 pb-3 text-gray-700">
                        {regularSubtotal > 0 && (
                          <div className="flex justify-between">
                            <span>รวมสินค้าทั่วไป:</span>
                            <span className="font-bold text-gray-900">฿{formatCurrency(regularSubtotal)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>รวมหมวดเครื่องดื่ม:</span>
                          <span className="font-bold text-gray-900">฿{formatCurrency(drinkSubtotal)}</span>
                        </div>
                        <div className="flex justify-between text-[#F27D26]">
                          <span>+ ภาษีมูลค่าเพิ่ม VAT 7% (หมวดเครื่องดื่ม):</span>
                          <span className="font-bold">+฿{formatCurrency(drinkVat)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-orange-950 font-bold">
                          รวมทั้งสิ้น (ราคาสุดท้าย {drinkVat > 0 ? 'รวม VAT 7%' : ''})
                        </p>
                        <p className="text-[11px] text-orange-800 mt-0.5 font-medium">
                          * รวม {totalItemsCount} รายการ — เมื่อกดยืนยัน ระบบจะเปิด LINE ส่งข้อความ Version B ให้ทันที
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-[#F27D26]">
                          ฿{formatCurrency(grandTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-[#141414] text-emerald-400 p-5 rounded-2xl font-mono text-xs leading-relaxed whitespace-pre-wrap select-all border border-gray-800 shadow-2xs">
                    {versionAText}
                  </div>
                  <p className="text-xs text-gray-500">
                    💡 ข้อความ Version A มีรายละเอียดราคาครบถ้วน เหมาะสำหรับบันทึกต้นทุนหรือตรวจเช็กบัญชีของร้าน
                  </p>
                </div>
              )}

              {/* Supplier Version B Preview notice */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-[#141414]">
                <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950">ข้อความที่จะส่งให้ซัพพลายเออร์ทาง LINE (Version B):</p>
                  <p className="text-emerald-900 leading-relaxed font-medium">
                    มี <strong className="text-black">เฉพาะชื่อสินค้า + จำนวน + หน่วย</strong> เท่านั้น (ไม่มีราคาและยอดรวมใดๆ)
                  </p>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200/80 font-mono text-[11px] text-gray-800 whitespace-pre-wrap mt-1">
                    {lineMessage}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 bg-white border-t border-gray-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                id="review-modal-back-btn"
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>แก้ไขรายการ</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  id="review-modal-share-device-btn"
                  type="button"
                  onClick={handleShareViaDevice}
                  className="px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-[#141414] font-bold text-sm transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  title="แชร์ข้อความผ่านเครื่อง"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">แชร์</span>
                </button>

                <button
                  id="review-modal-confirm-line-btn"
                  type="button"
                  disabled={isSending}
                  onClick={handleConfirmAndSendLine}
                  className="w-full sm:w-auto flex-1 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>กำลังเปิด LINE...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>ยืนยันส่ง LINE</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

