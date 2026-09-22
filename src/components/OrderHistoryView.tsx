import React, { useState, useMemo } from 'react';
import { OrderHistoryRecord, Product, CartState } from '../types';
import {
  History,
  Wine,
  Receipt,
  Clock,
  RotateCcw,
  Eye,
  Trash2,
  AlertTriangle,
  Search,
  Check,
  Copy,
  X,
  Plus,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Info,
} from 'lucide-react';
import { formatCurrency, formatThaiDateTime, copyToClipboard } from '../utils/orderFormatter';

interface Props {
  orderHistory: OrderHistoryRecord[];
  products: Product[];
  currentCart: CartState;
  onQuickReorder: (order: OrderHistoryRecord, mode: 'merge' | 'replace') => { addedCount: number; unavailableItems: string[] };
  onDeleteOrder: (orderId: string) => Promise<void>;
  onClearAllHistory: () => Promise<void>;
  onNavigateToOrder: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const OrderHistoryView: React.FC<Props> = ({
  orderHistory,
  products,
  currentCart,
  onQuickReorder,
  onDeleteOrder,
  onClearAllHistory,
  onNavigateToOrder,
  onShowToast,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'normal' | 'drink'>('all');

  // Selected Order for Details Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderHistoryRecord | null>(null);

  // Quick Reorder Confirmation Modal (When cart has existing items)
  const [reorderTargetOrder, setReorderTargetOrder] = useState<OrderHistoryRecord | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);

  // Delete Confirmation Modals
  const [orderToDelete, setOrderToDelete] = useState<OrderHistoryRecord | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  // Copy Feedback
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Current Cart Items Count
  const currentCartCount = useMemo(() => {
    return Object.values(currentCart).reduce((acc: number, qty: number) => (qty > 0 ? acc + 1 : acc), 0);
  }, [currentCart]);

  // Filtered & Sorted Orders (Newest First)
  const filteredOrders = useMemo(() => {
    return orderHistory
      .filter((order) => {
        // Type filter
        if (filterType !== 'all' && order.orderType !== filterType) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchDate = formatThaiDateTime(new Date(order.timestamp)).toLowerCase().includes(q);
          const matchItems = order.items.some(
            (it) =>
              it.productName.toLowerCase().includes(q) ||
              (it.productCode && it.productCode.toLowerCase().includes(q))
          );
          const matchId = order.id.toLowerCase().includes(q);
          return matchDate || matchItems || matchId;
        }

        return true;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [orderHistory, filterType, searchQuery]);

  // Trigger Quick Reorder flow
  const handleInitiateReorder = (order: OrderHistoryRecord) => {
    // Check if cart already has items
    if (currentCartCount > 0) {
      setReorderTargetOrder(order);
      setShowReorderModal(true);
    } else {
      // Execute directly in merge/add mode
      executeReorder(order, 'merge');
    }
  };

  // Perform the actual Quick Reorder
  const executeReorder = (order: OrderHistoryRecord, mode: 'merge' | 'replace') => {
    const { addedCount, unavailableItems } = onQuickReorder(order, mode);

    if (addedCount === 0 && unavailableItems.length > 0) {
      onShowToast(
        'error',
        `ไม่สามารถเพิ่มสินค้าได้ เนื่องจากสินค้าทุกรายการถูกลบหรือปิดการใช้งานแล้ว (${unavailableItems.join(', ')})`,
        'ไม่สามารถสั่งซ้ำได้'
      );
      setShowReorderModal(false);
      setReorderTargetOrder(null);
      return;
    }

    let msg = `เพิ่มสินค้า ${addedCount} รายการเข้าสู่ตะกร้าเรียบร้อยแล้ว`;
    if (unavailableItems.length > 0) {
      msg += ` (ข้าม ${unavailableItems.length} รายการที่ปิดใช้งานหรือถูกลบ: ${unavailableItems.join(', ')})`;
    }

    onShowToast('success', msg, 'สั่งรายการนี้อีกครั้งสำเร็จ');
    setShowReorderModal(false);
    setReorderTargetOrder(null);
    setSelectedOrder(null);

    // Switch to order screen to see the updated floating cart
    onNavigateToOrder();
  };

  // Copy LINE text for a specific order
  const handleCopyLineText = async (orderId: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedOrderId(orderId);
      setTimeout(() => setCopiedOrderId(null), 2000);
      onShowToast('success', 'คัดลอกข้อความ LINE แล้ว');
    }
  };

  // Delete Single Order
  const handleConfirmDeleteSingle = async () => {
    if (!orderToDelete) return;
    try {
      await onDeleteOrder(orderToDelete.id);
      if (selectedOrder?.id === orderToDelete.id) {
        setSelectedOrder(null);
      }
      setOrderToDelete(null);
      onShowToast('info', 'ลบประวัติการสั่งซื้อนี้เรียบร้อยแล้ว');
    } catch (err) {
      console.error('Delete order failed:', err);
      onShowToast('error', 'ไม่สามารถลบประวัติได้');
    }
  };

  // Clear All History
  const handleConfirmClearAll = async () => {
    try {
      await onClearAllHistory();
      setSelectedOrder(null);
      setShowClearAllConfirm(false);
      onShowToast('info', 'ล้างประวัติการสั่งซื้อทั้งหมดเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Clear history failed:', err);
      onShowToast('error', 'ไม่สามารถล้างประวัติได้');
    }
  };

  return (
    <div id="order-history-view" className="space-y-5 max-w-4xl mx-auto pb-28">
      {/* Top Header Bento Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#F27D26] flex items-center justify-center text-white shrink-0 shadow-sm">
            <History className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-[#141414] tracking-tight">
                ประวัติการสั่งซื้อ
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200">
                {orderHistory.length} ออเดอร์
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              ดูรายการย้อนหลัง ราคา ณ วันที่สั่ง และสั่งซ้ำเข้าตะกร้าได้ทันที
            </p>
          </div>
        </div>

        {orderHistory.length > 0 && (
          <button
            id="clear-all-history-top-btn"
            type="button"
            onClick={() => setShowClearAllConfirm(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 transition-colors flex items-center gap-1.5 self-end sm:self-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ล้างประวัติทั้งหมด</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[#F8F7F4] p-1 rounded-xl border border-gray-200 shrink-0">
          <button
            id="filter-all-btn"
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-[#141414] text-white shadow-2xs'
                : 'text-gray-600 hover:text-[#141414]'
            }`}
          >
            ทั้งหมด ({orderHistory.length})
          </button>
          <button
            id="filter-normal-btn"
            type="button"
            onClick={() => setFilterType('normal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === 'normal'
                ? 'bg-[#141414] text-white shadow-2xs'
                : 'text-gray-600 hover:text-[#141414]'
            }`}
          >
            <Receipt className="w-3 h-3" />
            <span>วัตถุดิบทั่วไป</span>
          </button>
          <button
            id="filter-drink-btn"
            type="button"
            onClick={() => setFilterType('drink')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === 'drink'
                ? 'bg-[#141414] text-white shadow-2xs'
                : 'text-gray-600 hover:text-[#141414]'
            }`}
          >
            <Wine className="w-3 h-3 text-[#F27D26]" />
            <span>เครื่องดื่ม</span>
          </button>
        </div>

        {/* Compact Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="history-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อวัตถุดิบ หรือ วันที่..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white text-[#141414]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-200 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#F27D26] flex items-center justify-center mx-auto shadow-2xs">
            <History className="w-7 h-7 stroke-[2]" />
          </div>
          <h3 className="text-base font-bold text-[#141414]">
            {searchQuery || filterType !== 'all' ? 'ไม่พบรายการที่ตรงกับเงื่อนไข' : 'ยังไม่มีประวัติการสั่งซื้อ'}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {searchQuery || filterType !== 'all'
              ? 'ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่น'
              : 'เมื่อทำการส่ง Order ทางระบบจะบันทึกรายการและราคา ณ ขณะนั้นไว้ที่นี่โดยอัตโนมัติ'}
          </p>
          {orderHistory.length === 0 && (
            <button
              type="button"
              onClick={onNavigateToOrder}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#d96614] text-white text-xs font-bold shadow-xs transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>เริ่มสั่งวัตถุดิบ</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredOrders.map((order) => {
            const isDrink = order.orderType === 'drink';
            const orderDate = new Date(order.timestamp);
            const formattedDate = formatThaiDateTime(orderDate);

            // Compute snapshot item count
            const distinctItems = order.items.length;
            const totalUnits = order.items.reduce((acc, it) => acc + (it.quantity || 0), 0);

            return (
              <div
                key={order.id}
                id={`order-card-${order.id}`}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200 shadow-2xs hover:border-gray-300 transition-all space-y-3.5"
              >
                {/* Header Row: Date/Time + Order Type Badge + Grand Total */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isDrink ? (
                        <span className="px-2.5 py-1 rounded-xl font-bold bg-orange-50 text-orange-900 border border-orange-200 flex items-center gap-1.5 text-xs shadow-2xs">
                          <Wine className="w-3.5 h-3.5 text-[#F27D26]" />
                          <span>เครื่องดื่ม</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl font-bold bg-gray-100 text-gray-800 border border-gray-200 flex items-center gap-1.5 text-xs shadow-2xs">
                          <Receipt className="w-3.5 h-3.5 text-gray-600" />
                          <span>วัตถุดิบทั่วไป</span>
                        </span>
                      )}

                      <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formattedDate}</span>
                      </span>
                    </div>
                  </div>

                  {/* Grand Total Snapshot */}
                  <div className="text-right">
                    {order.grandTotal > 0 ? (
                      <div>
                        <span className="text-xs text-gray-400 font-medium block">ยอดรวม</span>
                        <span className="text-base sm:text-lg font-black text-[#141414] tracking-tight">
                          ฿{formatCurrency(order.grandTotal)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                        {distinctItems} รายการ
                      </span>
                    )}
                  </div>
                </div>

                {/* Items Preview Chips / Line */}
                <div className="bg-[#F8F7F4] rounded-2xl p-3 border border-gray-150">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-1.5">
                    <span>รายการวัตถุดิบ ({distinctItems} รายการ • รวม {totalUnits} หน่วย)</span>
                  </div>
                  <p className="text-xs text-gray-700 font-medium line-clamp-2 leading-relaxed">
                    {order.items
                      .map(
                        (it) =>
                          `${it.productName}${it.productCode ? ` [${it.productCode}]` : ''} (${it.quantity} ${it.unit})`
                      )
                      .join(' • ')}
                  </p>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setOrderToDelete(order)}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="ลบรายการนี้"
                    aria-label="ลบรายการนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2 ml-auto">
                    {/* View Details Button */}
                    <button
                      id={`view-details-btn-${order.id}`}
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>ดูรายละเอียด</span>
                    </button>

                    {/* Quick Reorder Button */}
                    <button
                      id={`quick-reorder-btn-${order.id}`}
                      type="button"
                      onClick={() => handleInitiateReorder(order)}
                      className="px-4 py-2 rounded-xl bg-[#F27D26] hover:bg-[#d96614] active:bg-[#c0590d] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>สั่งอีกครั้ง</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL 1: ORDER DETAILS MODAL (READ-ONLY) ================= */}
      {selectedOrder && (
        <div
          id="order-details-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-[#F8F7F4]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#141414] text-white flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-[#141414]">
                    รายละเอียดคำสั่งซื้อย้อนหลัง
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {formatThaiDateTime(new Date(selectedOrder.timestamp))}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-2xl text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                aria-label="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Type Badge & ID */}
              <div className="flex items-center justify-between text-xs bg-gray-50 p-2.5 rounded-2xl border border-gray-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-500">ประเภท:</span>
                  {selectedOrder.orderType === 'drink' ? (
                    <span className="font-bold text-[#F27D26] flex items-center gap-1">
                      <Wine className="w-3.5 h-3.5" /> เครื่องดื่ม
                    </span>
                  ) : (
                    <span className="font-bold text-gray-800 flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5" /> วัตถุดิบทั่วไป
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                  ID: {selectedOrder.id}
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 font-bold text-gray-700">
                      <th className="py-2.5 px-3">สินค้า</th>
                      <th className="py-2.5 px-2 text-center">จำนวน</th>
                      <th className="py-2.5 px-2 text-right">ราคา/หน่วย</th>
                      <th className="py-2.5 px-3 text-right">รวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {selectedOrder.items.map((item, idx) => {
                      const itemPrice = item.unitPrice ?? item.price ?? 0;
                      const lineTotal = item.lineTotal ?? (item.quantity * itemPrice);

                      return (
                        <tr key={`${item.productId}-${idx}`} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-semibold text-[#141414]">
                            <div>{item.productName}</div>
                            {item.productCode && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                รหัส: {item.productCode}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center text-gray-600 font-medium">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2.5 px-2 text-right text-gray-500">
                            {itemPrice > 0 ? `฿${formatCurrency(itemPrice)}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#141414]">
                            {lineTotal > 0 ? `฿${formatCurrency(lineTotal)}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Grand Total Card with VAT Breakdown if available */}
              {selectedOrder.grandTotal > 0 && (
                <div className="bg-orange-50/70 border border-orange-200 rounded-2xl p-3.5 space-y-2">
                  {selectedOrder.drinkVat && selectedOrder.drinkVat > 0 ? (
                    <div className="space-y-1 text-xs border-b border-orange-200 pb-2 text-gray-700">
                      {selectedOrder.regularSubtotal !== undefined && selectedOrder.regularSubtotal > 0 && (
                        <div className="flex justify-between">
                          <span>สินค้าทั่วไป:</span>
                          <span className="font-semibold text-gray-900">฿{formatCurrency(selectedOrder.regularSubtotal)}</span>
                        </div>
                      )}
                      {selectedOrder.drinkSubtotal !== undefined && (
                        <div className="flex justify-between">
                          <span>หมวดเครื่องดื่ม:</span>
                          <span className="font-semibold text-gray-900">฿{formatCurrency(selectedOrder.drinkSubtotal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[#F27D26] font-medium">
                        <span>+ ภาษี VAT 7% (เครื่องดื่ม):</span>
                        <span className="font-bold">+฿{formatCurrency(selectedOrder.drinkVat)}</span>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-orange-950">
                      ยอดรวมทั้งสิ้น {selectedOrder.drinkVat && selectedOrder.drinkVat > 0 ? '(รวม VAT 7%)' : ''}
                    </span>
                    <span className="text-lg font-black text-[#F27D26]">
                      ฿{formatCurrency(selectedOrder.grandTotal)}
                    </span>
                  </div>
                </div>
              )}

              {/* Copy LINE Text Option */}
              {selectedOrder.versionBText && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopyLineText(selectedOrder.id, selectedOrder.versionBText!)}
                    className="w-full py-2.5 px-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    {copiedOrderId === selectedOrder.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">คัดลอกข้อความ LINE แล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอกข้อความ LINE ของออเดอร์นี้</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <p className="text-[11px] text-gray-400 text-center italic">
                * ข้อมูลประวัตินี้ถูกบันทึกแบบอ่านอย่างเดียว (Read-Only) เพื่อรักษาความถูกต้องของข้อมูลย้อนหลัง
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-200 bg-[#F8F7F4] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-100 transition-colors"
              >
                ปิด
              </button>

              <button
                id="modal-quick-reorder-btn"
                type="button"
                onClick={() => handleInitiateReorder(selectedOrder)}
                className="px-5 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#d96614] active:bg-[#c0590d] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                <span>สั่งรายการนี้อีกครั้ง</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: QUICK REORDER WITH EXISTING CART MODAL ================= */}
      {showReorderModal && reorderTargetOrder && (
        <div
          id="reorder-conflict-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#141414]">
                  ขณะนี้มีรายการสินค้าอยู่ในตะกร้า
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  ในตะกร้าปัจจุบันมีสินค้าอยู่ {currentCartCount} รายการ
                </p>
              </div>
            </div>

            <div className="bg-[#F8F7F4] rounded-2xl p-3.5 border border-gray-200 text-xs text-gray-700 space-y-2">
              <p className="font-semibold text-[#141414]">
                ต้องการดำเนินการอย่างไรกับคำสั่งซื้อนี้ ({reorderTargetOrder.items.length} รายการ)?
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 text-[11px]">
                <li>
                  <strong className="text-gray-800">เพิ่มเข้ารายการเดิม:</strong> รวมจำนวนสินค้าเข้ากับตะกร้าปัจจุบัน (หากมีสินค้าเดิมจะบวกจำนวนเพิ่ม)
                </li>
                <li>
                  <strong className="text-gray-800">แทนที่รายการเดิม:</strong> ล้างตะกร้าปัจจุบันแล้วใส่วัตถุดิบจากออเดอร์นี้แทน
                </li>
              </ul>
            </div>

            <div className="space-y-2 pt-1">
              {/* Option 1: Merge / Append (Highlighted Primary) */}
              <button
                id="reorder-merge-btn"
                type="button"
                onClick={() => executeReorder(reorderTargetOrder, 'merge')}
                className="w-full py-3 px-4 rounded-2xl bg-[#F27D26] hover:bg-[#d96614] active:bg-[#c0590d] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>เพิ่มเข้ารายการเดิม (แนะนำ)</span>
              </button>

              {/* Option 2: Replace */}
              <button
                id="reorder-replace-btn"
                type="button"
                onClick={() => executeReorder(reorderTargetOrder, 'replace')}
                className="w-full py-2.5 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>แทนที่รายการเดิมทั้งหมด</span>
              </button>

              {/* Option 3: Cancel */}
              <button
                id="reorder-cancel-btn"
                type="button"
                onClick={() => {
                  setShowReorderModal(false);
                  setReorderTargetOrder(null);
                }}
                className="w-full py-2 px-4 rounded-xl text-gray-500 hover:text-gray-800 text-xs font-bold transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: DELETE SINGLE ORDER CONFIRMATION ================= */}
      {orderToDelete && (
        <div
          id="delete-single-order-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#141414]">
              ต้องการลบประวัติการสั่งซื้อนี้หรือไม่?
            </h3>
            <p className="text-xs text-gray-500">
              ออเดอร์วันที่ {formatThaiDateTime(new Date(orderToDelete.timestamp))} จะถูกลบออกจากประวัติ (ไม่มีผลต่อรายการวัตถุดิบหรือตะกร้าปัจจุบัน)
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                id="confirm-delete-single-btn"
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                ลบรายการนี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: CLEAR ALL HISTORY CONFIRMATION ================= */}
      {showClearAllConfirm && (
        <div
          id="clear-all-history-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#141414]">
              ต้องการลบประวัติการสั่งซื้อทั้งหมดหรือไม่?
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลประวัติการสั่งซื้อทั้งหมดจะถูกลบออกจากเครื่อง แต่จะไม่กระทบรายการสินค้า หมวดหมู่ หรือการตั้งค่า
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                id="confirm-clear-all-history-btn"
                type="button"
                onClick={handleConfirmClearAll}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                ยืนยันลบทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
