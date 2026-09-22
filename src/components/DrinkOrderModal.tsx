import React, { useState, useEffect, useMemo } from 'react';
import { CartItem, AppSettings, STORE_DELIVERY_NOTICE } from '../types';
import { formatCurrency } from '../utils/orderFormatter';
import {
  generateDrinkOrderImage,
  shareDrinkOrderImage,
  DrinkOrderImageResult,
  downloadImageFallback,
} from '../utils/drinkImageGenerator';
import {
  X,
  Share2,
  Download,
  ArrowLeft,
  Check,
  Wine,
  Loader2,
  AlertCircle,
  Sparkles,
  ReceiptText,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  drinkItems: CartItem[];
  settings: AppSettings;
  onDrinkOrderConfirmed: (imageResult: DrinkOrderImageResult) => void;
  onFinishOrder: () => void;
}

export const DrinkOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  drinkItems,
  settings,
  onDrinkOrderConfirmed,
  onFinishOrder,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageResult, setImageResult] = useState<DrinkOrderImageResult | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const drinkSubtotal = useMemo(() => {
    return drinkItems.reduce((acc, item) => acc + (item.lineTotal || item.quantity * item.product.price), 0);
  }, [drinkItems]);

  const drinkVat = useMemo(() => {
    return Math.round(drinkSubtotal * 0.07 * 100) / 100;
  }, [drinkSubtotal]);

  const grandTotal = useMemo(() => {
    return Math.round((drinkSubtotal + drinkVat) * 100) / 100;
  }, [drinkSubtotal, drinkVat]);

  useEffect(() => {
    if (isOpen && drinkItems.length > 0) {
      let isMounted = true;
      setIsGenerating(true);
      setImageResult(null);
      setShareStatus(null);

      generateDrinkOrderImage(drinkItems, settings)
        .then((res) => {
          if (isMounted) {
            setImageResult(res);
            setIsGenerating(false);
          }
        })
        .catch((err) => {
          console.error('Error rendering drink order image:', err);
          if (isMounted) {
            setIsGenerating(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, drinkItems, settings]);

  if (!isOpen) return null;

  const handleConfirmAndShare = async () => {
    if (!imageResult || isSharing) return;
    setIsSharing(true);

    try {
      const { method, success } = await shareDrinkOrderImage(
        imageResult,
        `สั่งเครื่องดื่ม - ${settings.storeName}`
      );

      if (success) {
        onDrinkOrderConfirmed(imageResult);
        if (method === 'share') {
          setShareStatus('เปิดหน้าต่างแชร์เรียบร้อย (เลือก LINE หรือแอปที่ต้องการ)');
        } else {
          setShareStatus('บันทึกรูปภาพลงเครื่องเรียบร้อยแล้ว กรุณาส่งภาพเข้า LINE ด้วยตนเอง');
        }
      }
    } catch (err) {
      console.error('Share action failed:', err);
      // Direct download fallback
      downloadImageFallback(imageResult.dataUrl, imageResult.fileName);
      onDrinkOrderConfirmed(imageResult);
      setShareStatus('ดาวน์โหลดรูปภาพลงเครื่องแล้ว');
    } finally {
      setTimeout(() => setIsSharing(false), 800);
    }
  };

  const handleDownloadOnly = () => {
    if (!imageResult) return;
    downloadImageFallback(imageResult.dataUrl, imageResult.fileName);
    onDrinkOrderConfirmed(imageResult);
    setShareStatus('ดาวน์โหลดรูปภาพลงในเครื่องแล้ว');
  };

  const handleFinish = () => {
    setShareStatus(null);
    setImageResult(null);
    onFinishOrder();
  };

  const handleCloseHeader = () => {
    if (shareStatus) {
      handleFinish();
    } else {
      onClose();
    }
  };

  return (
    <div
      id="drink-order-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="drink-order-modal-content"
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-[#F27D26] text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Wine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">ใบสั่งเครื่องดื่มพิเศษ (ภาพกราฟิก)</h2>
              <p className="text-xs text-orange-100 mt-0.5">
                ไม่มีราคา • มีเฉพาะรูปภาพ ชื่อ และจำนวน สำหรับส่งให้ตัวแทนเครื่องดื่ม
              </p>
            </div>
          </div>
          <button
            id="close-drink-modal-btn"
            onClick={handleCloseHeader}
            className="p-1.5 text-orange-100 hover:text-white rounded-xl transition-colors"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Image Preview */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-gray-50/70 flex flex-col items-center justify-center">
          {isGenerating ? (
            <div className="py-16 flex flex-col items-center text-gray-500 gap-3">
              <Loader2 className="w-8 h-8 text-[#F27D26] animate-spin" />
              <p className="text-sm font-bold text-[#141414]">กำลังสร้างภาพใบสั่งเครื่องดื่มคุณภาพสูง...</p>
            </div>
          ) : imageResult ? (
            <div className="w-full flex flex-col items-center space-y-4">
              <div className="bg-white p-2.5 rounded-2xl shadow-md border border-gray-200 max-w-sm sm:max-w-md w-full overflow-hidden">
                <img
                  src={imageResult.dataUrl}
                  alt="Drink Order Graphic"
                  className="w-full h-auto rounded-xl object-contain"
                />
              </div>

              {shareStatus && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 font-bold shadow-2xs">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{shareStatus}</span>
                </div>
              )}

              {/* Prominent Delivery Days Notice */}
              <div className="w-full bg-red-600 border-2 border-red-700 rounded-2xl p-4 text-white flex items-center gap-3.5 shadow-md">
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

              {/* Store Owner Price Breakdown Reference (with VAT 7%) */}
              <div className="w-full bg-white border border-gray-200/90 rounded-2xl p-4 space-y-2.5 text-xs shadow-xs">
                <div className="flex items-center gap-2 font-bold text-[#141414] pb-1 border-b border-gray-100">
                  <ReceiptText className="w-4 h-4 text-[#F27D26]" />
                  <span>สรุปยอดค่าใช้จ่ายหมวดเครื่องดื่ม (รวม VAT 7%)</span>
                </div>
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>รวมค่าสินค้าเครื่องดื่ม ({drinkItems.length} รายการ):</span>
                  <span className="font-bold text-[#141414]">฿{formatCurrency(drinkSubtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>ภาษีมูลค่าเพิ่ม VAT 7%:</span>
                  <span className="font-bold text-[#F27D26]">+฿{formatCurrency(drinkVat)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-100 text-sm">
                  <span className="font-black text-[#141414]">ราคาสุดท้าย (รวมภาษี VAT 7%):</span>
                  <span className="font-black text-[#F27D26] text-base">฿{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              <div className="w-full bg-orange-50 border border-orange-200/80 rounded-2xl p-4 text-xs text-[#141414] flex items-start gap-2.5 shadow-2xs">
                <Sparkles className="w-4 h-4 text-[#F27D26] shrink-0 mt-0.5" />
                <p className="font-medium text-gray-700 leading-relaxed">
                  ภาพกราฟิกนี้ตัดข้อมูลราคาออกทั้งหมด พร้อมระบุรอบวันจัดส่งชัดเจน ตัวแทนส่งเครื่องดื่มสามารถตรวจสอบขนาดขวด/กระป๋องจากภาพสินค้าและจัดส่งได้ถูกต้องทันที
                </p>
              </div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center text-gray-500 gap-2">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <p className="text-sm font-bold">ไม่สามารถสร้างภาพได้ กรุณาลองใหม่อีกครั้ง</p>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 bg-white border-t border-gray-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            id="drink-modal-back-btn"
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>แก้ไขรายการ</span>
          </button>

          {shareStatus ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="drink-modal-download-btn"
                type="button"
                onClick={handleDownloadOnly}
                disabled={!imageResult || isGenerating}
                className="px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-[#141414] font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-2xs"
                title="บันทึกรูปลงเครื่อง"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">บันทึกรูปอีกครั้ง</span>
              </button>

              <button
                id="drink-modal-finish-btn"
                type="button"
                onClick={handleFinish}
                className="w-full sm:w-auto flex-1 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>เสร็จสิ้น</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="drink-modal-download-btn"
                type="button"
                onClick={handleDownloadOnly}
                disabled={!imageResult || isGenerating || isSharing}
                className="px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-[#141414] font-bold text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:cursor-not-allowed"
                title="บันทึกรูปลงเครื่อง"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">บันทึกรูป</span>
              </button>

              <button
                id="drink-modal-confirm-share-btn"
                type="button"
                onClick={handleConfirmAndShare}
                disabled={!imageResult || isGenerating || isSharing}
                className="w-full sm:w-auto flex-1 px-6 py-3 rounded-2xl bg-[#F27D26] hover:bg-[#d96614] active:bg-orange-800 text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSharing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>กำลังเปิดหน้าแชร์...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>ยืนยันและแชร์ภาพ (LINE)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
