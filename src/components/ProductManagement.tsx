import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Category, Product } from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Camera,
  Check,
  CheckCheck,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Package,
  Layers,
  Sparkles,
  RotateCcw,
  Loader2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { compressAndResizeImage } from '../utils/imageUtils';
import { formatCurrency } from '../utils/orderFormatter';

interface Props {
  categories: Category[];
  products: Product[];
  onSaveProduct: (product: Partial<Product> & { name: string; categoryId: string }) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onToggleActive: (productId: string) => Promise<void>;
  onEnableAllProducts?: () => Promise<void>;
  onReorderProducts?: (orderedProductsInCat: Product[]) => Promise<void>;
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

export const ProductManagement: React.FC<Props> = ({
  categories,
  products,
  onSaveProduct,
  onDeleteProduct,
  onToggleActive,
  onEnableAllProducts,
  onReorderProducts,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [isEnablingAll, setIsEnablingAll] = useState(false);

  // Inactive products counter
  const inactiveProductsCount = useMemo(() => {
    return products.filter((p) => !p.isActive).length;
  }, [products]);

  const handleEnableAll = async () => {
    if (!onEnableAllProducts || isEnablingAll) return;
    setIsEnablingAll(true);
    try {
      await onEnableAllProducts();
    } finally {
      setIsEnablingAll(false);
    }
  };

  // Form State
  const [name, setName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState<string>('0');
  const [unit, setUnit] = useState('กก.');
  const [image, setImage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState<{
    name: string;
    productCode: string;
    categoryId: string;
    price: string;
    unit: string;
    image: string;
    isActive: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fallback to 'all' if the previously selected category was deleted
  useEffect(() => {
    if (selectedCategoryId !== 'all' && !categories.some((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId('all');
    }
  }, [categories, selectedCategoryId]);

  // Check whether form data has been altered
  const hasUnsavedChanges = initialFormValues
    ? name.trim() !== initialFormValues.name.trim() ||
      productCode.trim() !== initialFormValues.productCode.trim() ||
      categoryId !== initialFormValues.categoryId ||
      price !== initialFormValues.price ||
      unit.trim() !== initialFormValues.unit.trim() ||
      (image || '') !== (initialFormValues.image || '') ||
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
      productCode: '',
      categoryId: selectedCategoryId !== 'all' ? selectedCategoryId : (categories[0]?.id || ''),
      price: '0',
      unit: 'กก.',
      image: '',
      isActive: true,
    };
    setInitialFormValues(init);
    setEditingProduct(null);
    setName(init.name);
    setProductCode(init.productCode);
    setCategoryId(init.categoryId);
    setPrice(init.price);
    setUnit(init.unit);
    setImage(init.image);
    setIsActive(init.isActive);
    setShowUnsavedPrompt(false);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    const init = {
      name: p.name,
      productCode: p.productCode || '',
      categoryId: p.categoryId,
      price: String(p.price),
      unit: p.unit,
      image: p.image || '',
      isActive: p.isActive,
    };
    setInitialFormValues(init);
    setEditingProduct(p);
    setName(init.name);
    setProductCode(init.productCode);
    setCategoryId(init.categoryId);
    setPrice(init.price);
    setUnit(init.unit);
    setImage(init.image);
    setIsActive(init.isActive);
    setShowUnsavedPrompt(false);
    setIsModalOpen(true);
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
    if (!name.trim() || !categoryId) return;

    setIsSubmitting(true);
    try {
      await onSaveProduct({
        id: editingProduct?.id,
        categoryId,
        name: name.trim(),
        productCode: productCode.trim() || undefined,
        price: parseFloat(price) || 0,
        unit: unit.trim() || 'กก.',
        image,
        isActive,
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Save product failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Category ID to Name mapping memoized
  const catMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c.name]));
  }, [categories]);

  // Group products by category and sort them by sortOrder (with locale tie-breaker)
  const prodsByCat = useMemo(() => {
    const map: Record<string, Product[]> = {};
    for (const c of categories) {
      map[c.id] = [];
    }
    for (const p of products) {
      if (!map[p.categoryId]) map[p.categoryId] = [];
      map[p.categoryId].push(p);
    }
    for (const catId in map) {
      map[catId].sort((a, b) => {
        const sortA = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const sortB = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        if (sortA !== sortB) return sortA - sortB;
        return a.name.localeCompare(b.name, ['th-TH', 'en'], {
          numeric: true,
          sensitivity: 'base',
        });
      });
    }
    return map;
  }, [products, categories]);

  // Products to display in the list:
  // - If Global Search is active: Filter by search query, sort with localeCompare (Thai ก-ฮ, Eng A-Z, Numeric)
  // - If viewing a specific category: Return products of that category sorted by sortOrder (with locale tie-breaker)
  // - If viewing "ทั้งหมด": Return all products grouped by category sortOrder, and within each category by product sortOrder
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length > 0) {
      // Global search active
      return products
        .filter((p) => {
          const matchCat = selectedCategoryId === 'all' || p.categoryId === selectedCategoryId;
          const matchSearch =
            p.name.toLowerCase().includes(query) ||
            (p.productCode && p.productCode.toLowerCase().includes(query));
          return matchCat && matchSearch;
        })
        .sort((a, b) =>
          a.name.localeCompare(b.name, ['th-TH', 'en'], {
            numeric: true,
            sensitivity: 'base',
          })
        );
    }

    if (selectedCategoryId !== 'all') {
      return prodsByCat[selectedCategoryId] || [];
    }

    // "ทั้งหมด" view: ordered by category sortOrder, then by product sortOrder within each category
    const catOrderMap = new Map<string, number>(categories.map((c, idx) => [c.id, typeof c.sortOrder === 'number' ? c.sortOrder : idx + 1]));
    return [...products].sort((a, b) => {
      const catOrderA: number = catOrderMap.get(a.categoryId) ?? 99999;
      const catOrderB: number = catOrderMap.get(b.categoryId) ?? 99999;
      if (catOrderA !== catOrderB) {
        return catOrderA - catOrderB;
      }
      const sortA = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
      const sortB = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
      if (sortA !== sortB) return sortA - sortB;
      return a.name.localeCompare(b.name, ['th-TH', 'en'], {
        numeric: true,
        sensitivity: 'base',
      });
    });
  }, [products, selectedCategoryId, searchQuery, categories, prodsByCat]);

  const handleMoveProduct = async (product: Product, direction: 'up' | 'down') => {
    if (isReordering || !onReorderProducts) return;
    const sameCatList = prodsByCat[product.categoryId] || [];
    const index = sameCatList.findIndex((p) => p.id === product.id);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sameCatList.length) return;

    const newCatList = [...sameCatList];
    const temp = newCatList[index];
    newCatList[index] = newCatList[targetIndex];
    newCatList[targetIndex] = temp;

    setIsReordering(true);
    try {
      await onReorderProducts(newCatList);
    } catch (err) {
      console.error('Failed to reorder products:', err);
    } finally {
      setIsReordering(false);
    }
  };

  // Counts per category for badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    for (const p of products) {
      counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
    }
    return counts;
  }, [products]);

  return (
    <div id="product-management-view" className="space-y-4 sm:space-y-5 pb-28">
      {/* Top Header Bento Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#F27D26] flex items-center justify-center text-white shrink-0 shadow-xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#141414] leading-tight">
              จัดการรายการวัตถุดิบ ({products.length} รายการ)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              ค้นหา แก้ไขราคา เปลี่ยนรูปภาพ และเปิด/ปิดการใช้งาน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onEnableAllProducts && (
            <button
              id="enable-all-products-btn"
              type="button"
              disabled={isEnablingAll}
              onClick={handleEnableAll}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm border transition-all active:scale-95 cursor-pointer shadow-2xs ${
                inactiveProductsCount > 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200 animate-pulse'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 active:bg-gray-200'
              }`}
              title="ตั้งค่าสินค้าทุกรายการให้มีสถานะเปิดใช้งาน"
            >
              {isEnablingAll ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <CheckCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              )}
              <span>เปิดใช้งานทั้งหมด</span>
              {inactiveProductsCount > 0 && (
                <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  ปิดอยู่ {inactiveProductsCount}
                </span>
              )}
            </button>
          )}

          <button
            id="add-product-btn"
            type="button"
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F27D26] hover:bg-[#d96614] active:bg-orange-800 text-white rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>เพิ่มวัตถุดิบใหม่</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filter Section */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200 shadow-2xs space-y-3">
        {/* Compact Search Control */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="manage-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อวัตถุดิบ (ไทย / English / ตัวเลข)..."
            className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white text-[#141414] transition-colors"
          />
          {searchQuery && (
            <button
              id="clear-manage-search-btn"
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 cursor-pointer rounded-full hover:bg-gray-200 transition-colors"
              aria-label="ล้างการค้นหา"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
          <button
            id="filter-cat-all"
            type="button"
            onClick={() => setSelectedCategoryId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCategoryId === 'all'
                ? 'bg-[#141414] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>ทั้งหมด</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                selectedCategoryId === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {categoryCounts['all'] || 0}
            </span>
          </button>

          {categories.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const isSelected = selectedCategoryId === cat.id;

            return (
              <button
                key={cat.id}
                id={`filter-cat-${cat.id}`}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#F27D26] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product List (Compact, Mobile-Friendly Rows) */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-2xs text-center space-y-3">
          {searchQuery.trim() ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-[#141414]">ไม่พบสินค้าที่ค้นหา</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  ไม่พบผลการค้นหาสำหรับ "{searchQuery}"
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ล้างการค้นหา</span>
              </button>
            </>
          ) : selectedCategoryId !== 'all' ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-[#F27D26] flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-sm text-[#141414]">ยังไม่มีสินค้าในหมวดนี้</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  เพิ่มสินค้าใหม่ลงในหมวดหมู่นี้
                </p>
              </div>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#F27D26] hover:bg-[#d96614] active:bg-orange-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ เพิ่มสินค้า</span>
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-sm text-[#141414]">ยังไม่มีรายการสินค้า</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  เริ่มเพิ่มรายการสินค้าแรกของคุณ
                </p>
              </div>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#F27D26] hover:bg-[#d96614] active:bg-orange-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ เพิ่มสินค้า</span>
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {filteredProducts.map((product) => {
            const catName = catMap.get(product.categoryId) || 'ไม่ระบุ';
            const sameCatList = prodsByCat[product.categoryId] || [];
            const indexInCat = sameCatList.findIndex((p) => p.id === product.id);
            const isFirstInCat = indexInCat <= 0;
            const isLastInCat = indexInCat === -1 || indexInCat >= sameCatList.length - 1;

            return (
              <div
                key={product.id}
                id={`manage-prod-item-${product.id}`}
                className={`bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border transition-all shadow-2xs flex items-center justify-between gap-3 ${
                  product.isActive
                    ? 'border-gray-200 hover:border-gray-300'
                    : 'border-gray-200 bg-gray-50/80 opacity-75'
                }`}
              >
                {/* Left: Reorder Controls, Thumbnail & Info */}
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                  {/* Reorder Buttons (Hidden during search) */}
                  {!searchQuery.trim() && onReorderProducts && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        id={`prod-up-btn-${product.id}`}
                        type="button"
                        disabled={isFirstInCat || isReordering}
                        onClick={() => handleMoveProduct(product, 'up')}
                        className="p-1 sm:p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-20 text-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                        title={isFirstInCat ? 'อยู่อันดับแรกในหมวดหมู่นี้แล้ว' : 'เลื่อนขึ้น 1 ตำแหน่ง'}
                        aria-label={`เลื่อน ${product.name} ขึ้น`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`prod-down-btn-${product.id}`}
                        type="button"
                        disabled={isLastInCat || isReordering}
                        onClick={() => handleMoveProduct(product, 'down')}
                        className="p-1 sm:p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-20 text-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                        title={isLastInCat ? 'อยู่อันดับสุดท้ายในหมวดหมู่นี้แล้ว' : 'เลื่อนลง 1 ตำแหน่ง'}
                        aria-label={`เลื่อน ${product.name} ลง`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Thumbnail Image */}
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gray-100 border border-gray-200 shrink-0 overflow-hidden flex items-center justify-center relative shadow-2xs">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="font-bold text-gray-400 text-xs">
                        {product.name.slice(0, 2)}
                      </span>
                    )}
                    {!product.isActive && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <EyeOff className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                        {catName}
                      </span>
                      {product.isActive ? (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          เปิดใช้งาน
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                          ปิดใช้งาน
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-[#141414] text-xs sm:text-sm truncate mt-0.5">
                      {product.name}
                    </h3>

                    {product.productCode && (
                      <div className="mt-0.5">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 text-gray-700 border border-gray-200">
                          รหัส: {product.productCode}
                        </span>
                      </div>
                    )}

                    <p className="text-[11px] sm:text-xs font-bold text-[#F27D26] mt-0.5">
                      ฿{formatCurrency(product.price)} <span className="text-gray-400 font-normal">/ {product.unit}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Quick Toggle Active Button */}
                  <button
                    id={`toggle-active-${product.id}`}
                    type="button"
                    onClick={() => onToggleActive(product.id)}
                    className={`p-2 rounded-xl border font-bold transition-colors cursor-pointer ${
                      product.isActive
                        ? 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                    title={product.isActive ? 'แตะเพื่อซ่อนจากหน้าสั่ง' : 'แตะเพื่อเปิดใช้งาน'}
                    aria-label={product.isActive ? 'ซ่อนสินค้า' : 'เปิดใช้งานสินค้า'}
                  >
                    {product.isActive ? (
                      <Eye className="w-4 h-4 text-gray-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-emerald-600" />
                    )}
                  </button>

                  {/* Edit Button */}
                  <button
                    id={`edit-prod-btn-${product.id}`}
                    type="button"
                    onClick={() => openEditModal(product)}
                    className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-bold text-gray-700 hover:text-[#F27D26] bg-gray-50 hover:bg-orange-50 rounded-xl transition-colors border border-gray-200 flex items-center gap-1 cursor-pointer"
                    title="แก้ไขข้อมูล"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">แก้ไข</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    id={`del-prod-btn-${product.id}`}
                    type="button"
                    onClick={() => setDeleteConfirmId(product.id)}
                    className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-gray-200 cursor-pointer"
                    title="ลบวัตถุดิบ"
                    aria-label="ลบวัตถุดิบ"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div
          id="product-edit-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) handleRequestCloseModal();
          }}
        >
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#141414] text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base sm:text-lg">
                {editingProduct ? 'แก้ไขข้อมูลวัตถุดิบ' : 'เพิ่มวัตถุดิบใหม่'}
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

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Product Image Uploader */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  รูปภาพวัตถุดิบ (เก็บในเครื่องแบบออฟไลน์)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-4">
                  <div className="w-18 h-18 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center relative shrink-0 shadow-2xs">
                    {image ? (
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-7 h-7 text-gray-300" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-[#141414] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-gray-200 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{image ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดรูปภาพ'}</span>
                    </button>
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
                  ชื่อวัตถุดิบ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น หมูสับ, ใบกะเพรา, โค้กกระป๋อง..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white text-[#141414]"
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
                  className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white text-[#141414]"
                />
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  หมวดหมู่ <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
                    className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white"
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
                    className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white"
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
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
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

              {/* Status Toggle */}
              <div className="pt-2 flex items-center justify-between">
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

              {/* Modal Actions */}
              <div className="pt-4 border-t border-gray-200 flex gap-2">
                <button
                  type="button"
                  onClick={handleRequestCloseModal}
                  className="flex-1 py-2.5 sm:py-3 rounded-2xl border border-gray-300 text-gray-700 font-bold text-xs sm:text-sm hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 sm:py-3 rounded-2xl bg-[#F27D26] hover:bg-[#d96614] text-white font-bold text-xs sm:text-sm shadow-md disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกวัตถุดิบ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedPrompt && (
        <div
          id="product-unsaved-confirm-modal"
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (() => {
        const targetProduct = products.find((p) => p.id === deleteConfirmId);
        return (
          <div
            id="product-delete-confirm-modal"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-100">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#141414]">
                  ต้องการลบสินค้านี้หรือไม่?
                </h3>
                <p className="text-sm font-bold text-[#F27D26] mt-1">
                  "{targetProduct?.name || 'สินค้านี้'}"
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  สินค้านี้จะถูกลบออกจากฐานข้อมูลเครื่องอย่างถาวร
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  id="cancel-delete-product-btn"
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  id="confirm-delete-product-btn"
                  type="button"
                  onClick={async () => {
                    if (deleteConfirmId) {
                      await onDeleteProduct(deleteConfirmId);
                      setDeleteConfirmId(null);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-xs transition-colors cursor-pointer"
                >
                  ลบสินค้า
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
