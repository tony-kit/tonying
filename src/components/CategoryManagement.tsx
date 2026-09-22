import React, { useState } from 'react';
import { Category, Product } from '../types';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  AlertCircle,
  Wine,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';

interface Props {
  categories: Category[];
  products: Product[];
  onSaveCategory: (category: Partial<Category> & { name: string }) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onReorderCategories: (categories: Category[]) => Promise<void>;
}

export const CategoryManagement: React.FC<Props> = ({
  categories,
  products,
  onSaveCategory,
  onDeleteCategory,
  onReorderCategories,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [isDrink, setIsDrink] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmCat, setDeleteConfirmCat] = useState<Category | null>(null);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState<{
    name: string;
    isDrink: boolean;
    isActive: boolean;
  } | null>(null);

  const productCountByCat = categories.reduce((acc, cat) => {
    acc[cat.id] = products.filter((p) => p.categoryId === cat.id).length;
    return acc;
  }, {} as Record<string, number>);

  const hasUnsavedChanges = initialFormValues
    ? name.trim() !== initialFormValues.name.trim() ||
      isDrink !== initialFormValues.isDrink ||
      isActive !== initialFormValues.isActive
    : false;

  const handleRequestCloseModal = () => {
    if (isSubmitting) return;
    if (hasUnsavedChanges) {
      setShowUnsavedPrompt(true);
    } else {
      setIsModalOpen(false);
    }
  };

  const handleConfirmDiscard = () => {
    setShowUnsavedPrompt(false);
    setIsModalOpen(false);
  };

  const openAddModal = () => {
    const init = {
      name: '',
      isDrink: false,
      isActive: true,
    };
    setInitialFormValues(init);
    setEditingCategory(null);
    setName(init.name);
    setIsDrink(init.isDrink);
    setIsActive(init.isActive);
    setShowUnsavedPrompt(false);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Category) => {
    const init = {
      name: c.name,
      isDrink: Boolean(c.isDrink),
      isActive: c.isActive,
    };
    setInitialFormValues(init);
    setEditingCategory(c);
    setName(init.name);
    setIsDrink(init.isDrink);
    setIsActive(init.isActive);
    setShowUnsavedPrompt(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSaveCategory({
        id: editingCategory?.id,
        name: name.trim(),
        isDrink,
        isActive,
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Save category failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCategories = [...categories];
    const temp = newCategories[index];
    newCategories[index] = newCategories[targetIndex];
    newCategories[targetIndex] = temp;

    await onReorderCategories(newCategories);
  };

  const toggleActive = async (c: Category) => {
    await onSaveCategory({
      id: c.id,
      name: c.name,
      isActive: !c.isActive,
    });
  };

  return (
    <div id="category-management-view" className="space-y-6 max-w-4xl mx-auto pb-28">
      {/* Top Header Bento Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#F27D26] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#141414] leading-tight">
              จัดการหมวดหมู่วัตถุดิบ ({categories.length} หมวด)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              จัดลำดับการแสดงผล เพิ่ม/แก้ไขหมวด และตั้งค่าหมวดเครื่องดื่ม
            </p>
          </div>
        </div>

        <button
          id="add-category-btn"
          type="button"
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-[#F27D26] hover:bg-[#d96614] active:bg-orange-800 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>เพิ่มหมวดหมู่</span>
        </button>
      </div>

      {/* Category List Bento Container */}
      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-2xs divide-y divide-gray-100">
        {categories.map((category, index) => {
          const prodCount = productCountByCat[category.id] || 0;

          return (
            <div
              key={category.id}
              id={`cat-manage-item-${category.id}`}
              className={`p-4 sm:p-5 flex items-center justify-between gap-3 transition-colors ${
                category.isActive ? 'hover:bg-gray-50/50' : 'bg-gray-50/70 opacity-60'
              }`}
            >
              {/* Left Info & Reorder */}
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Reorder Buttons */}
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    id={`cat-up-btn-${category.id}`}
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMove(index, 'up')}
                    className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-gray-700 transition-colors"
                    title="เลื่อนขึ้น"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    id={`cat-down-btn-${category.id}`}
                    type="button"
                    disabled={index === categories.length - 1}
                    onClick={() => handleMove(index, 'down')}
                    className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-gray-700 transition-colors"
                    title="เลื่อนลง"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#141414] text-sm sm:text-base">
                      {category.name}
                    </span>
                    {category.isDrink && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-200">
                        <Wine className="w-3 h-3 text-[#F27D26]" />
                        <span>สั่งแบบรูปภาพ</span>
                      </span>
                    )}
                    {!category.isActive && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-100 text-red-700">
                        ปิดใช้งาน
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    มีวัตถุดิบ {prodCount} รายการ • ลำดับที่ {index + 1}
                  </p>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  id={`cat-toggle-active-${category.id}`}
                  type="button"
                  onClick={() => toggleActive(category)}
                  className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                    category.isActive
                      ? 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                  title={category.isActive ? 'ซ่อนหมวดหมู่นี้' : 'เปิดใช้งาน'}
                >
                  {category.isActive ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>

                <button
                  id={`cat-edit-btn-${category.id}`}
                  type="button"
                  onClick={() => openEditModal(category)}
                  className="p-2 text-gray-600 hover:text-[#F27D26] hover:bg-orange-50 rounded-xl transition-colors border border-gray-200"
                  title="แก้ไขหมวดหมู่"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  id={`cat-del-btn-${category.id}`}
                  type="button"
                  onClick={() => setDeleteConfirmCat(category)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-gray-200"
                  title="ลบหมวดหมู่"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div
          id="category-edit-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) handleRequestCloseModal();
          }}
        >
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="p-5 sm:p-6 bg-[#141414] text-white flex items-center justify-between">
              <h3 className="font-bold text-base sm:text-lg">
                {editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
              </h3>
              <button
                type="button"
                onClick={handleRequestCloseModal}
                className="p-1.5 text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                aria-label="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  ชื่อหมวดหมู่ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น ผักสด, เนื้อสัตว์, เครื่องปรุง..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white text-[#141414]"
                />
              </div>

              {/* Special Drink Workflow Checkbox */}
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-1.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDrink}
                    onChange={(e) => setIsDrink(e.target.checked)}
                    className="w-4 h-4 text-[#F27D26] rounded focus:ring-[#F27D26]"
                  />
                  <span className="font-bold text-xs sm:text-sm text-[#141414] flex items-center gap-1.5">
                    <Wine className="w-4 h-4 text-[#F27D26]" />
                    <span>เป็นหมวดหมู่เครื่องดื่ม (สั่งแบบภาพกราฟิก)</span>
                  </span>
                </label>
                <p className="text-[11px] text-gray-600 pl-6.5">
                  เมื่อเลือกตัวเลือกนี้ ระบบจะเปิดฟังก์ชันสร้างภาพใบสั่งซื้อกราฟิกพิเศษสำหรับส่งตัวแทนเครื่องดื่ม
                </p>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-xs font-bold text-[#141414]">สถานะเปิดใช้งาน</p>
                  <p className="text-[11px] text-gray-500">แสดงในแถบเลือกหมวดหมู่</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    isActive ? 'bg-[#F27D26]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      isActive ? 'left-6.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-3 border-t border-gray-200 flex gap-2">
                <button
                  type="button"
                  onClick={handleRequestCloseModal}
                  className="flex-1 py-3 rounded-2xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-2xl bg-[#F27D26] hover:bg-[#d96614] text-white font-bold text-sm shadow-md disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกหมวดหมู่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedPrompt && (
        <div
          id="category-unsaved-confirm-modal"
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#141414]">
                ข้อมูลยังไม่ได้บันทึก
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                ต้องการออกโดยไม่บันทึกหรือไม่?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUnsavedPrompt(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                อยู่ต่อ
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-xs transition-colors cursor-pointer"
              >
                ออกโดยไม่บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Safety & Confirmation Modal */}
      {deleteConfirmCat && (
        <div
          id="category-delete-confirm-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-100">
            {(productCountByCat[deleteConfirmCat.id] || 0) > 0 ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#141414]">
                  ต้องการลบหมวดหมู่ "{deleteConfirmCat.name}" ใช่หรือไม่?
                </h3>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 text-left leading-relaxed">
                  <p className="font-bold text-amber-950">
                    หมวดหมู่นี้มีสินค้าอยู่ {productCountByCat[deleteConfirmCat.id]} รายการ
                  </p>
                  <p className="mt-1 text-amber-800">
                    หากยืนยันการลบ สินค้าในหมวดนี้จะถูกลบด้วย
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    id="cancel-delete-category-btn"
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setDeleteConfirmCat(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    id="confirm-delete-category-btn"
                    type="button"
                    disabled={isDeleting}
                    onClick={async () => {
                      if (deleteConfirmCat) {
                        setIsDeleting(true);
                        try {
                          await onDeleteCategory(deleteConfirmCat.id);
                          setDeleteConfirmCat(null);
                        } finally {
                          setIsDeleting(false);
                        }
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบหมวดหมู่'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#141414]">
                  ต้องการลบหมวดหมู่ "{deleteConfirmCat.name}" ใช่หรือไม่?
                </h3>
                <p className="text-xs text-gray-500">
                  หมวดหมู่นี้ไม่มีสินค้า และจะถูกลบออกจากระบบอย่างถาวร
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    id="cancel-delete-category-btn"
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setDeleteConfirmCat(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    id="confirm-delete-category-btn"
                    type="button"
                    disabled={isDeleting}
                    onClick={async () => {
                      if (deleteConfirmCat) {
                        setIsDeleting(true);
                        try {
                          await onDeleteCategory(deleteConfirmCat.id);
                          setDeleteConfirmCat(null);
                        } finally {
                          setIsDeleting(false);
                        }
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบหมวดหมู่'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
