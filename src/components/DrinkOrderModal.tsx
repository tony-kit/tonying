import React, { useState, useEffect, useMemo } from 'react';
import { CartItem, AppSettings, STORE_DELIVERY_NOTICE } from '../types';
import { formatCurrency } from '../utils/orderFormatter';
import {
  generateDrinkOrderImage,
  shareDrinkOrderImage,
  DrinkOrderImageResult,
  downloadImageFallback,
  copyImageToClipboard,
  openLineApp,
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
  ExternalLink,
  Copy,
  Link as LinkIcon,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  drinkItems: CartItem[];
  settings: AppSettings;
  onDrinkOrderConfirmed: (imageResult: DrinkOrderImageResult) => void;
  onFinishOrder: () => void;
  onSaveSettings?: (newSettings: Partial<AppSettings>) => Promise<void>;
}

export const DrinkOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  drinkItems,
  settings,
  onDrinkOrderConfirmed,
  onFinishOrder,
  onSaveSettings,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageResult, setImageResult] = useState<DrinkOrderImageResult | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [copiedImageSuccess, setCopiedImageSuccess] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [tempGroupLink, setTempGroupLink] = useState(settings.drinkLineGroupLink || '');
  const [isSavingLink, setIsSavingLink] = useState(false);

  const targetRoomName = settings.drinkLineTargetName || 'สั่งโค้กTony';

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
      setCopiedImageSuccess(false);
      setTempGroupLink(settings.drinkLineGroupLink || '');

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

  const handleManualCopyImage = async () => {
    if (!imageResult) return;
    setIsCopyingImage(true);
    const ok = await copyImageToClipboard(imageResult.blob);
    setIsCopyingImage(false);
    if (ok) {
      setCopiedImageSuccess(true);
      setTimeout(() => setCopiedImageSuccess(false), 3000);
    }
  };

  const handleSaveGroupLinkQuick = async () => {
    if (!onSaveSettings) return;
    setIsSavingLink(true);
    try {
      await onSaveSettings({ drinkLineGroupLink: tempGroupLink.trim() });
      setShowLinkInput(false);
    } catch (err) {
      console.error('Save group link failed:', err);
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleConfirmAndShare = async () => {
    if (!imageResult || isSharing) return;
    setIsSharing(true);

    // 1. Always attempt to copy image to clipboard
    let copied = false;
    try {
      copied = await copyImageToClipboard(imageResult.blob);
      if (copied) setCopiedImageSuccess(true);
    } catch {
      // Continue even if clipboard is restricted
    }

    // 2. If group link is provided, directly open that specific room in LINE
    if (settings.drinkLineGroupLink && settings.drinkLineGroupLink.trim()) {
      onDrinkOrderConfirmed(imageResult);
      openLineApp(settings.drinkLineGroupLink.trim());
      setShareStatus(
        copied
          ? `คัดลอกรูปภาพแล้ว & กำลังเปิดเข้าห้อง "${targetRoomName}" ใน LINE! (กดที่ช่องแชทแล้วแตะ "วาง / Paste" เพื่อส่งภาพได้เลย)`
          : `กำลังเปิดเข้าห้อง "${targetRoomName}" ใน LINE!`
      );
      setIsSharing(false);
      return;
    }

    // 3. Otherwise, use Web Share API with image file
    try {
      const { method, success } = await shareDrinkOrderImage(
        imageResult,
        `สั่งเครื่องดื่ม - ${settings.storeName}`
      );

      if (success) {
        onDrinkOrderConfirmed(imageResult);
        if (method === 'share') {
          setShareStatus(`เปิดหน้าต่างแชร์เรียบร้อย ➔ แตะเลือก LINE แล้วส่งเข้าห้อง "${targetRoomName}" ได้ทันที`);
        } else {
          setShareStatus(`บันทึกรูปภาพลงเครื่องแล้ว ➔ กำลังเปิดแอป LINE เพื่อส่งเข้าห้อง "${targetRoomName}"`);
          openLineApp();
        }
      }
    } catch (err) {
      console.error('Share action failed:', err);
      downloadImageFallback(imageResult.dataUrl, imageResult.fileName);
      onDrinkOrderConfirmed(imageResult);
      setShareStatus(`บันทึกรูปภาพแล้ว ➔ กำลังเปิดแอป LINE เพื่อส่งเข้าห้อง "${targetRoomName}"`);
      openLineApp();
    } finally {
      setTimeout(() => setIsSharing(false), 800);
    }
  };

  const handleOpenDirectLine = () => {
    if (imageResult) {
      copyImageToClipboard(imageResult.blob);
      onDrinkOrderConfirmed(imageResult);
    }
    openLineApp(settings.drinkLineGroupLink);
    setShareStatus(`กำลังเปิดแอป LINE ไปที่ห้อง "${targetRoomName}"`);
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
        <div className="bg-[#06C755] text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Wine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">ใบสั่งเครื่องดื่มพิเศษ</h2>
                <span className="px-2 py-0.5 rounded-full bg-white/25 text-white font-black text-[11px]">
                  LINE: {targetRoomName}
                </span>
              </div>
              <p className="text-xs text-white/90 mt-0.5">
                มีเฉพาะรูปภาพและจำนวน • ส่งตรงเข้าห้องแชท &quot;{targetRoomName}&quot;
              </p>
            </div>
          </div>
          <button
            id="close-drink-modal-btn"
            onClick={handleCloseHeader}
            className="p-1.5 text-white/80 hover:text-white rounded-xl transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Image Preview & Target Guide */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-gray-50/70 flex flex-col items-center justify-center">
          {isGenerating ? (
            <div className="py-16 flex flex-col items-center text-gray-500 gap-3">
              <Loader2 className="w-8 h-8 text-[#06C755] animate-spin" />
              <p className="text-sm font-bold text-[#141414]">กำลังสร้างภาพใบสั่งเครื่องดื่มคุณภาพสูง...</p>
            </div>
          ) : imageResult ? (
            <div className="w-full flex flex-col items-center space-y-4">
              
              {/* LINE Target Room Banner */}
              <div className="w-full bg-[#06C755]/10 border-2 border-[#06C755]/30 rounded-2xl p-3.5 flex flex-col gap-2 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#06C755] text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                      LINE
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-500 font-bold">ห้องแชท LINE ปลายทาง</div>
                      <div className="text-sm sm:text-base font-black text-[#141414] flex items-center gap-1.5">
                        <span>{targetRoomName}</span>
                        <span className="px-2 py-0.5 rounded-md bg-[#06C755] text-white text-[10px] font-bold">
                          ตัวแทนโค้ก
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleManualCopyImage}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-[#141414] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      title="คัดลอกรูปภาพเพื่อนำไปวางใน LINE"
                    >
                      {copiedImageSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                          <span>คัดลอกรูป</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenDirectLine}
                      className="px-3 py-1.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>เปิด LINE</span>
                    </button>
                  </div>
                </div>

                {/* Optional Quick Link input helper */}
                {settings.drinkLineGroupLink ? (
                  <div className="text-[11px] text-emerald-700 flex items-center gap-1 pt-1 border-t border-[#06C755]/15 font-medium">
                    <Check className="w-3.5 h-3.5 text-[#06C755]" />
                    <span>เชื่อมต่อลิงก์ห้อง &quot;{targetRoomName}&quot; เรียบร้อยแล้ว (กดส่งภาพจะเปิดเข้าห้องนี้ทันที)</span>
                  </div>
                ) : (
                  <div className="pt-1 border-t border-[#06C755]/15">
                    {!showLinkInput ? (
                      <button
                        type="button"
                        onClick={() => setShowLinkInput(true)}
                        className="text-[11px] text-[#06C755] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>💡 ใส่ลิงก์กลุ่ม เพื่อให้กดส่งแล้วเด้งเข้าห้อง &quot;{targetRoomName}&quot; ทันที</span>
                      </button>
                    ) : (
                      <div className="mt-1 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={tempGroupLink}
                          onChange={(e) => setTempGroupLink(e.target.value)}
                          placeholder="วางลิงก์เชิญกลุ่ม LINE (https://line.me/ti/g/...)"
                          className="flex-1 px-3 py-1.5 bg-white border border-[#06C755]/40 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#06C755]"
                        />
                        <button
                          type="button"
                          onClick={handleSaveGroupLinkQuick}
                          disabled={isSavingLink}
                          className="px-3 py-1.5 bg-[#06C755] text-white rounded-xl text-xs font-bold hover:bg-[#05b34c] shrink-0"
                        >
                          บันทึก
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowLinkInput(false)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 text-xs"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Graphic Preview */}
              <div className="bg-white p-2.5 rounded-2xl shadow-md border border-gray-200 max-w-sm sm:max-w-md w-full overflow-hidden">
                <img
                  src={imageResult.dataUrl}
                  alt="Drink Order Graphic"
                  className="w-full h-auto rounded-xl object-contain"
                />
              </div>

              {shareStatus && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs px-4 py-3 rounded-2xl flex items-start gap-2 font-bold shadow-xs animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{shareStatus}</span>
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
                  <ReceiptText className="w-4 h-4 text-[#06C755]" />
                  <span>สรุปยอดค่าใช้จ่ายหมวดเครื่องดื่ม (รวม VAT 7%)</span>
                </div>
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>รวมค่าสินค้าเครื่องดื่ม ({drinkItems.length} รายการ):</span>
                  <span className="font-bold text-[#141414]">฿{formatCurrency(drinkSubtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>ภาษีมูลค่าเพิ่ม VAT 7%:</span>
                  <span className="font-bold text-[#06C755]">+฿{formatCurrency(drinkVat)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-100 text-sm">
                  <span className="font-black text-[#141414]">ราคาสุดท้าย (รวมภาษี VAT 7%):</span>
                  <span className="font-black text-[#06C755] text-base">฿{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              <div className="w-full bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-xs text-[#141414] flex items-start gap-2.5 shadow-2xs">
                <Sparkles className="w-4 h-4 text-[#06C755] shrink-0 mt-0.5" />
                <p className="font-medium text-gray-700 leading-relaxed">
                  ภาพกราฟิกนี้ตัดข้อมูลราคาออกทั้งหมด มีเฉพาะรูปขวด/กระป๋อง ชื่อ และจำนวน พร้อมระบุรอบจัดส่งชัดเจน ส่งให้ตัวแทนส่งเครื่องดื่มในห้อง <strong>&quot;{targetRoomName}&quot;</strong> เพื่อจัดของได้ถูกต้องทันที
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
            className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
                className="px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-[#141414] font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                title="บันทึกรูปลงเครื่อง"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">บันทึกรูปอีกครั้ง</span>
              </button>

              <button
                id="drink-modal-finish-btn"
                type="button"
                onClick={handleFinish}
                className="w-full sm:w-auto flex-1 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                className="w-full sm:w-auto flex-1 px-6 py-3 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] active:bg-[#04943f] text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSharing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>กำลังเปิด LINE...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>ส่งภาพไป LINE (ห้อง {targetRoomName})</span>
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
