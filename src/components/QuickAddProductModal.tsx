import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Category, Product } from '../types';
import {
  X,
  Plus,
  Pencil,
  Upload,
  Camera,
  AlertCircle,
  Package,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { compressAndResizeImage } from '../utils/imageUtils';

interface Props {
  isOpen: boolean;
  category?: Category | null;
  categories?: Category[];
  productToEdit?: Product | null;
  onClose: () => void;
  onSaveProduct: (product: Partial<Product> & { name: string; categoryId: string }) => Promise<void>;
}

const COMMON_UNITS = [
  'กก.',
  'กรัม',
  'ถุง',
  'ขวด',
  'แพ็ค',
  'ลัง',
  'ถาด',
  'มัด',
  'แผง',
  'ฟอง',
  'กล่อง',
  'แกลลอน',
  'ปี๊บ',
  'กระสอบ',
  'กระป๋อง',
  'ก้อน',
  'หัว',
  'ลูก',
];

export const QuickAddProductModal: React.FC<Props> = ({
  isOpen,
  category,
  categories = [],
  productToEdit,
  onClose,
  onSaveProduct,
}) => {
  const isEditing = !!productToEdit;

  const [name, setName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [price, setPrice] = useState('0');
  const [unit, setUnit] = useState('กก.');
  const [image, setImage] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Baseline values to check for unsaved modifications
  const [initialFormValues, setInitialFormValues] = useState({
    name: '',
    productCode: '',
    price: '0',
    unit: 'กก.',
    image: '',
    categoryId: '',
    isActive: true,
  });

  // Populate/Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        const init = {
          name: productToEdit.name,
          productCode: productToEdit.productCode || '',
          price: String(productToEdit.price ?? 0),
          unit: productToEdit.unit || 'กก.',
          image: productToEdit.image || '',
          categoryId: productToEdit.categoryId || category?.id || (categories[0]?.id || ''),
          isActive: productToEdit.isActive ?? true,
        };
        setInitialFormValues(init);
        setName(init.name);
        setProductCode(init.productCode);
        setPrice(init.price);
        setUnit(init.unit);
        setImage(init.image);
        setSelectedCategoryId(init.categoryId);
        setIsActive(init.isActive);
      } else {
        const init = {
          name: '',
          productCode: '',
          price: '0',
          unit: 'กก.',
          image: '',
          categoryId: category?.id || (categories[0]?.id || ''),
          isActive: true,
        };
        setInitialFormValues(init);
        setName(init.name);
        setProductCode(init.productCode);
        setPrice(init.price);
        setUnit(init.unit);
        setImage(init.image);
        setSelectedCategoryId(init.categoryId);
        setIsActive(init.isActive);
      }

      setValidationError('');
      setIsSubmitting(false);
      setShowUnsavedPrompt(false);

      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, productToEdit, category, categories]);

  // Check if user has entered/changed any data compared to baseline
  const hasUnsavedChanges =
    name.trim() !== initialFormValues.name.trim() ||
    productCode.trim() !== initialFormValues.productCode.trim() ||
    price !== initialFormValues.price ||
    unit.trim() !== initialFormValues.unit.trim() ||
    (image || '') !== (initialFormValues.image || '') ||
    selectedCategoryId !== initialFormValues.categoryId ||
    isActive !== initialFormValues.isActive;

  if (!isOpen) return null;

  const handleRequestClose = () => {
    if (isSubmitting) return;
    if (hasUnsavedChanges) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowUnsavedPrompt(false);
    onClose();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressAndResizeImage(file, 500, 0.85);
      setImage(dataUrl);
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setValidationError('กรุณาระบุชื่อสินค้า');
      nameInputRef.current?.focus();
      return;
    }

    const finalCategoryId = selectedCategoryId || category?.id;
    if (!finalCategoryId) {
      setValidationError('กรุณาเลือกหมวดหมู่สินค้า');
      return;
    }

    setIsSubmitting(true);
    setValidationError('');

    try {
      await onSaveProduct({
        id: productToEdit?.id,
        categoryId: finalCategoryId,
        name: cleanName,
        productCode: productCode.trim() || undefined,
        price: parseFloat(price) || 0,
        unit: unit.trim() || 'กก.',
        image,
        isActive,
      });
      onClose();
    } catch (err) {
      console.error('Save product failed:', err);
      setValidationError('เกิดข้อผิดพลาดในการบันทึกสินค้า');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategoryObj =
    categories.find((c) => c.id === selectedCategoryId) || category;

  return (
    <>
      <div
        id="quick-add-product-modal-backdrop"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) handleRequestClose();
        }}
      >
        <div
          id="quick-add-product-modal"
          className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-gray-100 my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 mb-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F27D26] shrink-0">
                {isEditing ? (
                  <Pencil className="w-5 h-5 stroke-[2.2]" />
                ) : (
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-[#141414] text-base sm:text-lg leading-tight">
                  {isEditing ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าด่วน'}
                </h3>
                <p className="text-xs text-gray-500">
                  {isEditing
                    ? 'แก้ไขชื่อ รหัส ราคา หรือรูปภาพสินค้า'
                    : 'เพิ่มสินค้าใหม่เข้าหมวดหมู่โดยตรง'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={isSubmitting}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              aria-label="ปิด"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Validation Alert */}
          {validationError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Category Selection / Display */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                หมวดหมู่สินค้า <span className="text-red-500">*</span>
              </label>
              {categories.length > 0 ? (
                <select
                  required
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : activeCategoryObj ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-50/70 border border-orange-200 text-sm font-bold text-orange-950">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F27D26]" />
                  <span>{activeCategoryObj.name}</span>
                </div>
              ) : null}
            </div>

            {/* Product Image Section */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                รูปภาพสินค้า (ไม่บังคับ)
              </label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                  {image ? (
                    <img
                      src={image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold border border-gray-200 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{image ? 'เปลี่ยนรูปภาพ' : 'เลือกรูปภาพ'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                  {image && (
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="text-xs text-red-600 font-semibold hover:underline text-left cursor-pointer"
                    >
                      ลบรูปภาพออก
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                ชื่อวัตถุดิบ / สินค้า <span className="text-red-500">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น หมูสับ, ผักกาดขาว, น้ำมันพืช..."
                className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white text-[#141414]"
              />
            </div>

            {/* Product Code */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                รหัสสินค้า <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
              </label>
              <input
                type="text"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder="เช่น V-01, M-101, P001"
                className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white text-[#141414]"
              />
            </div>

            {/* Price & Unit Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Price */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  ราคาต่อหน่วย (บาท) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white"
                />
              </div>

              {/* Unit */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  หน่วยนับ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="เช่น กก., ขวด, ถุง"
                  className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white"
                />
              </div>
            </div>

            {/* Quick Unit Presets */}
            <div>
              <span className="block text-[11px] font-bold text-gray-500 mb-1.5">
                เลือกหน่วยนับด่วน:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_UNITS.slice(0, 10).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      unit === u
                        ? 'bg-[#F27D26] text-white border-[#F27D26]'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Toggle for Editing */}
            {isEditing && (
              <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                <div>
                  <p className="text-xs font-bold text-[#141414]">สถานะเปิดใช้งาน</p>
                  <p className="text-[11px] text-gray-500">แสดงในหน้าสั่งซื้อ</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
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
            )}

            {/* Modal Action Buttons */}
            <div className="flex gap-2.5 pt-3 border-t border-gray-100 shrink-0">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRequestClose}
                className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 font-bold text-sm transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                id="quick-save-product-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="flex-2 py-3 px-4 rounded-2xl bg-[#F27D26] hover:bg-[#d96614] active:bg-orange-800 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : isEditing ? (
                  <>
                    <Pencil className="w-4 h-4" />
                    <span>บันทึกการแก้ไข</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>บันทึกสินค้า</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedPrompt && (
        <div
          id="quick-add-unsaved-confirm-modal"
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
    </>
  );
};
