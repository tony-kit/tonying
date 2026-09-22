import React, { useState } from 'react';
import { Category, Product, CartState, CategoryGroupSummary, STORE_DELIVERY_NOTICE } from '../types';
import {
  ShoppingBag,
  Trash2,
  Send,
  Wine,
  Plus,
  Minus,
  ArrowRight,
  AlertTriangle,
  Receipt,
  RotateCcw,
  Loader2,
  ReceiptText,
} from 'lucide-react';
import { formatCurrency } from '../utils/orderFormatter';

interface Props {
  categories: Category[];
  products: Product[];
  cart: CartState;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  onBackToOrder: () => void;
  onSubmitNormalOrder: () => void;
  onSubmitDrinkOrder: () => void;
  groupedSummary: CategoryGroupSummary[];
  grandTotal: number;
  isSubmittingOrder?: boolean;
}

export const CartView: React.FC<Props> = ({
  categories,
  products,
  cart,
  onUpdateQuantity,
  onClearCart,
  onBackToOrder,
  onSubmitNormalOrder,
  onSubmitDrinkOrder,
  groupedSummary,
  grandTotal,
  isSubmittingOrder = false,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const totalItemsCount = groupedSummary.reduce(
    (acc, g) => acc + g.items.length,
    0
  );

  const drinkGroup = groupedSummary.find(
    (g) => g.category.isDrink || g.category.name.includes('เครื่องดื่ม')
  );
  const hasDrinkItems = Boolean(drinkGroup && drinkGroup.items.length > 0);

  let regularSubtotal = 0;
  let drinkSubtotal = 0;
  let drinkVat = 0;

  for (const g of groupedSummary) {
    const isDrink = Boolean(
      g.isDrink ||
      g.category.isDrink ||
      g.category.name.includes('เครื่องดื่ม') ||
      g.category.name.toLowerCase().includes('drink')
    );
    if (isDrink) {
      drinkSubtotal += g.subtotal;
      const vat = typeof g.vatAmount === 'number' ? g.vatAmount : Math.round(g.subtotal * 0.07 * 100) / 100;
      drinkVat += vat;
    } else {
      regularSubtotal += g.subtotal;
    }
  }

  if (totalItemsCount === 0) {
    return (
      <div id="cart-empty-view" className="max-w-md mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-2xs space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F27D26] shadow-2xs">
            <ShoppingBag className="w-7 h-7 stroke-[1.75]" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#141414] tracking-tight">
              ยังไม่มีสินค้าที่เลือก
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              เลือกวัตถุดิบที่ต้องการสั่งจากหน้าเมนูเพื่อรวมเป็นออเดอร์
            </p>
          </div>
          <button
            id="cart-go-to-order-btn"
            type="button"
            onClick={onBackToOrder}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#F27D26] hover:bg-[#d96614] active:bg-orange-800 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <span>ไปเลือกวัตถุดิบ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="cart-screen-view" className="space-y-6 max-w-4xl mx-auto pb-32">
      {/* Top Header Bento Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#F27D26] flex items-center justify-center text-white shrink-0 shadow-sm">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#141414] leading-tight">
              รายการที่เลือกสั่ง ({totalItemsCount} รายการ)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              แยกสรุปตามหมวดหมู่ คำนวณยอดเงินแบบเรียลไทม์
            </p>
          </div>
        </div>

        <button
          id="clear-cart-trigger-btn"
          type="button"
          onClick={() => setShowClearConfirm(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors"
          title="ล้างรายการทั้งหมดในตะกร้า"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ล้างทั้งหมด</span>
        </button>
      </div>

      {/* Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div
          id="clear-cart-confirm-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#141414]">
              ยืนยันการล้างรายการในตะกร้า?
            </h3>
            <p className="text-xs text-gray-500">
              รายการวัตถุดิบและจำนวนที่เลือกไว้ทั้งหมดจะถูกรีเซ็ตเป็น 0
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearCart();
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-xs"
              >
                ล้างรายการ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Groups Bento Cards */}
      <div className="space-y-4">
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
              id={`cart-group-${group.category.id}`}
              className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-2xs"
            >
              {/* Category Subheader */}
              <div className="bg-gray-50/90 px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#141414] text-sm sm:text-base">
                    📁 {group.category.name}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    ({group.items.length} รายการ)
                  </span>
                  {isDrink && (
                    <span className="bg-orange-100 text-[#F27D26] text-[11px] font-black px-2 py-0.5 rounded-full border border-orange-200">
                      +VAT 7%
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 mr-1.5 font-medium">
                    {isDrink ? 'รวมสุทธิ (+VAT 7%):' : 'รวมหมวด:'}
                  </span>
                  <span className="text-sm font-bold text-[#F27D26] bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200">
                    ฿{formatCurrency(isDrink ? groupTotalWithVat : group.subtotal)}
                  </span>
                </div>
              </div>

              {/* Item Rows */}
              <div className="divide-y divide-gray-100">
                {group.items.map((item) => (
                  <div
                    key={item.productId}
                    id={`cart-item-${item.productId}`}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 shrink-0 overflow-hidden flex items-center justify-center">
                        {item.product.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-gray-400 text-xs">
                            {item.product.name.slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#141414] text-sm sm:text-base truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          ฿{formatCurrency(item.product.price)} / {item.product.unit}
                        </p>
                      </div>
                    </div>

                    {/* Quantity Stepper & Line Total */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-17 sm:pl-0">
                      {/* Stepper */}
                      <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-2xl border border-gray-200">
                        <button
                          id={`cart-dec-${item.productId}`}
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.productId, Math.max(0, item.quantity - 1))
                          }
                          className="w-8 h-8 rounded-xl bg-white text-gray-700 hover:text-black flex items-center justify-center font-bold border border-gray-200 shadow-2xs transition-transform active:scale-90"
                          aria-label="ลดจำนวน"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <span className="min-w-10 px-2 text-center font-bold text-sm text-[#141414]">
                          {item.quantity}
                        </span>

                        <button
                          id={`cart-inc-${item.productId}`}
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.productId, item.quantity + 1)
                          }
                          className="w-8 h-8 rounded-xl bg-[#F27D26] text-white hover:bg-[#d96614] flex items-center justify-center font-bold shadow-xs transition-transform active:scale-90"
                          aria-label="เพิ่มจำนวน"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      </div>

                      {/* Line Total */}
                      <div className="text-right w-24">
                        <p className="font-bold text-[#141414] text-sm sm:text-base">
                          ฿{formatCurrency(item.lineTotal)}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          ({item.quantity} {item.product.unit})
                        </p>
                      </div>

                      {/* Delete Item button */}
                      <button
                        id={`cart-remove-${item.productId}`}
                        type="button"
                        onClick={() => onUpdateQuantity(item.productId, 0)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                        title="ลบรายการนี้"
                        aria-label={`ลบ ${item.product.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Category VAT Breakdown for Drinks */}
              {isDrink && (
                <div className="bg-orange-50/70 px-5 py-3 border-t border-orange-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 text-orange-900 font-semibold">
                    <ReceiptText className="w-4 h-4 text-[#F27D26]" />
                    <span>คำนวณภาษีมูลค่าเพิ่ม VAT 7% สำหรับหมวดเครื่องดื่ม</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-gray-700">
                    <span>ค่าสินค้า: <b>฿{formatCurrency(group.subtotal)}</b></span>
                    <span className="text-[#F27D26]">+ ภาษี VAT 7%: <b>+฿{formatCurrency(groupVat)}</b></span>
                    <span className="text-gray-900 border-l border-gray-300 pl-2 sm:pl-3 font-black">
                      รวมสุทธิ: ฿{formatCurrency(groupTotalWithVat)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Prominent Shop Delivery Notice Card */}
      <div
        id="cart-delivery-schedule-banner"
        className="bg-amber-50 border-2 border-amber-400 rounded-3xl p-4 sm:p-5 flex items-center gap-3.5 shadow-sm text-amber-950"
      >
        <div className="w-12 h-12 rounded-2xl bg-amber-200/80 flex items-center justify-center text-2xl shrink-0">
          🚚
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-black tracking-wider text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-md">
              ข้อความสำคัญถึงร้านค้า / ซัพพลายเออร์
            </span>
          </div>
          <p className="text-sm sm:text-base font-black text-amber-950 mt-1">
            {STORE_DELIVERY_NOTICE}
          </p>
        </div>
      </div>

      {/* Grand Total Summary Bento Card */}
      <div className="bg-[#141414] text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-800 space-y-6">
        {/* Itemized breakdown if drink VAT exists */}
        {drinkVat > 0 && (
          <div className="space-y-2 pb-4 border-b border-stone-800 text-xs sm:text-sm text-gray-300">
            {regularSubtotal > 0 && (
              <div className="flex justify-between">
                <span>รวมราคาสินค้าทั่วไป:</span>
                <span className="font-semibold text-white">฿{formatCurrency(regularSubtotal)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>รวมราคาสินค้าหมวดเครื่องดื่ม:</span>
              <span className="font-semibold text-white">฿{formatCurrency(drinkSubtotal)}</span>
            </div>
            <div className="flex justify-between text-orange-400">
              <span className="font-medium">+ ภาษีมูลค่าเพิ่ม VAT 7% (หมวดเครื่องดื่ม):</span>
              <span className="font-bold">+฿{formatCurrency(drinkVat)}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 font-bold">
              ยอดรวมสุทธิทั้งสิ้น (ราคาสุดท้าย)
            </p>
            <p className="text-xs text-[#F27D26] mt-1 font-semibold">
              รวมทั้งหมด {totalItemsCount} รายการ {drinkVat > 0 ? '(รวมภาษี VAT 7% หมวดเครื่องดื่มแล้ว)' : ''}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl sm:text-4xl font-black text-[#F27D26] tracking-tight">
              ฿{formatCurrency(grandTotal)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {hasDrinkItems && (
            <button
              id="cart-submit-drink-btn"
              type="button"
              disabled={isSubmittingOrder}
              onClick={onSubmitDrinkOrder}
              className="flex-1 px-5 py-3.5 bg-stone-800 hover:bg-stone-700 active:bg-stone-900 disabled:opacity-50 border border-stone-700 text-orange-300 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmittingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                  <span>กำลังเตรียมรายการ...</span>
                </>
              ) : (
                <>
                  <Wine className="w-4 h-4" />
                  <span>ส่ง Order เครื่องดื่ม (รูปภาพกราฟิก)</span>
                </>
              )}
            </button>
          )}

          <button
            id="cart-submit-normal-btn"
            type="button"
            disabled={isSubmittingOrder}
            onClick={onSubmitNormalOrder}
            className="flex-1 px-6 py-4 bg-[#F27D26] hover:bg-[#d96614] active:bg-orange-800 disabled:opacity-50 text-white font-bold rounded-2xl text-base flex items-center justify-center gap-2 shadow-xl shadow-orange-950/40 transition-transform active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmittingOrder ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>กำลังเตรียมรายการ...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>ส่ง Order (ตรวจสอบ & LINE)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
