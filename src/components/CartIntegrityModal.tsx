import React from 'react';
import { CartIntegrityIssue } from '../types';
import {
  AlertTriangle,
  X,
  Trash2,
  Check,
  ArrowRight,
  RefreshCw,
  Info,
  Package,
} from 'lucide-react';
import { formatCurrency } from '../utils/orderFormatter';

interface Props {
  isOpen: boolean;
  issues: CartIntegrityIssue[];
  orderType: 'normal' | 'drink';
  onClose: () => void;
  onRemoveItem: (productId: string) => void;
  onAcceptSingleIssue: (issue: CartIntegrityIssue) => void;
  onAcceptAllAndProceed: () => void;
}

export const CartIntegrityModal: React.FC<Props> = ({
  isOpen,
  issues,
  orderType,
  onClose,
  onRemoveItem,
  onAcceptSingleIssue,
  onAcceptAllAndProceed,
}) => {
  if (!isOpen || issues.length === 0) return null;

  const hasFatal = issues.some((i) => i.isFatal);
  const deletedOrInactiveCount = issues.filter(
    (i) => i.type === 'DELETED_PRODUCT' || i.type === 'INACTIVE_PRODUCT' || i.type === 'DRINK_MISMATCH'
  ).length;

  return (
    <div
      id="cart-integrity-modal"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#141414] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white leading-tight">
                ตรวจสอบรายการก่อนส่ง Order
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                พบ {issues.length} รายการที่มีการเปลี่ยนแปลงข้อมูลในระบบ
              </p>
            </div>
          </div>
          <button
            id="close-integrity-modal-btn"
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่างตรวจสอบ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Banner */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 flex items-start gap-2.5 text-xs text-amber-900 shrink-0">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {hasFatal
              ? 'มีรายการที่ถูกลบหรือปิดการใช้งาน ต้องนำออกจากตะกร้าก่อนส่ง หรือกดอัปเดตอัตโนมัติด้านล่าง'
              : 'ข้อมูลราคาสินค้าหรือหน่วยนับมีการอัปเดต โปรดตรวจสอบและยืนยันการใช้ข้อมูลล่าสุด'}
          </p>
        </div>

        {/* Issue List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 divide-y divide-gray-100">
          {issues.map((issue) => {
            return (
              <div
                key={issue.id}
                id={`integrity-issue-${issue.productId}`}
                className="pt-3 first:pt-0 space-y-2"
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 shrink-0 overflow-hidden flex items-center justify-center mt-0.5">
                    {issue.image ? (
                      <img
                        src={issue.image}
                        alt={issue.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-[#141414] truncate">
                        {issue.productName}
                      </span>

                      {/* Issue Badge */}
                      {issue.type === 'DELETED_PRODUCT' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                          สินค้าถูกลบ
                        </span>
                      )}
                      {issue.type === 'INACTIVE_PRODUCT' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          ปิดใช้งาน
                        </span>
                      )}
                      {issue.type === 'PRICE_CHANGED' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          ราคาเปลี่ยนแปลง
                        </span>
                      )}
                      {issue.type === 'UNIT_CHANGED' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          หน่วยนับเปลี่ยน
                        </span>
                      )}
                      {issue.type === 'CATEGORY_CHANGED' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                          หมวดหมู่เปลี่ยน
                        </span>
                      )}
                      {issue.type === 'DRINK_MISMATCH' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                          ไม่ใช่เครื่องดื่ม
                        </span>
                      )}
                    </div>

                    {/* Specific Detail Comparison */}
                    <div className="mt-1 text-xs">
                      {issue.type === 'DELETED_PRODUCT' && (
                        <p className="text-red-600 font-medium">
                          สินค้านี้ไม่มีอยู่ในรายการสินค้าแล้ว
                        </p>
                      )}

                      {issue.type === 'INACTIVE_PRODUCT' && (
                        <p className="text-amber-700 font-medium">
                          สินค้านี้ถูกปิดการใช้งานแล้ว
                        </p>
                      )}

                      {issue.type === 'PRICE_CHANGED' && (
                        <div className="flex items-center gap-2 font-medium">
                          <span className="text-gray-500">
                            ราคาก่อน: <span className="line-through">฿{formatCurrency(Number(issue.oldValue))}</span>
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-blue-700 font-bold">
                            ราคาปัจจุบัน: ฿{formatCurrency(Number(issue.newValue))}
                          </span>
                        </div>
                      )}

                      {issue.type === 'UNIT_CHANGED' && (
                        <div className="flex items-center gap-2 font-medium">
                          <span className="text-gray-500">
                            เดิม: {String(issue.oldValue)}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-purple-700 font-bold">
                            ปัจจุบัน: {String(issue.newValue)}
                          </span>
                        </div>
                      )}

                      {issue.type === 'CATEGORY_CHANGED' && (
                        <div className="flex items-center gap-2 font-medium">
                          <span className="text-gray-500">
                            เดิม: {String(issue.oldValue)}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-stone-800 font-bold">
                            ปัจจุบัน: {String(issue.newValue)}
                          </span>
                        </div>
                      )}

                      {issue.type === 'DRINK_MISMATCH' && (
                        <p className="text-orange-700 font-medium">
                          ไม่ใช่รายการในหมวดเครื่องดื่มสำหรับใบสั่งเครื่องดื่ม
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Single Item Action */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {issue.isFatal ? (
                      <button
                        type="button"
                        onClick={() => onRemoveItem(issue.productId)}
                        className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="ลบออกจากตะกร้า"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบออก</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAcceptSingleIssue(issue)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {issue.type === 'PRICE_CHANGED'
                            ? 'ใช้ราคาปัจจุบัน'
                            : issue.type === 'UNIT_CHANGED'
                            ? 'ใช้หน่วยปัจจุบัน'
                            : 'ยอมรับ'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-2.5 shrink-0">
          <button
            id="back-to-edit-cart-btn"
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl border border-gray-300 text-gray-700 font-bold text-xs sm:text-sm hover:bg-white transition-colors cursor-pointer text-center"
          >
            กลับไปแก้ไขรายการ
          </button>

          <button
            id="accept-all-integrity-btn"
            type="button"
            onClick={onAcceptAllAndProceed}
            className="flex-1 py-3 px-4 rounded-2xl bg-[#F27D26] hover:bg-[#d96614] active:bg-orange-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>
              {deletedOrInactiveCount > 0
                ? 'อัปเดตและดำเนินการต่อ'
                : 'ใช้ข้อมูลล่าสุดและดำเนินการต่อ'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
