import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Category, Product, CartState, STORE_DELIVERY_NOTICE } from '../types';
import {
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Send,
  Wine,
  Sparkles,
  CheckCircle,
  X,
  Layers,
  Trash2,
  ReceiptText,
  RotateCcw,
  Package,
  Loader2,
  Pencil,
} from 'lucide-react';
import { formatCurrency } from '../utils/orderFormatter';
import { QuickAddProductModal } from './QuickAddProductModal';

interface Props {
  categories: Category[];
  products: Product[];
  cart: CartState;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart?: () => void;
  onSubmitNormalOrder: () => void;
  onSubmitDrinkOrder: () => void;
  onSaveProduct?: (product: Partial<Product> & { name: string; categoryId: string }) => Promise<void>;
  isSubmittingOrder?: boolean;
}

export const OrderView: React.FC<Props> = ({
  categories,
  products,
  cart,
  onUpdateQuantity,
  onClearCart,
  onSubmitNormalOrder,
  onSubmitDrinkOrder,
  onSaveProduct,
  isSubmittingOrder = false,
}) => {
  // Active categories in sequence
  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive),
    [categories]
  );

  // Initialize selected category to the first active real category, fallback to 'all' if none exist
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
    const firstActive = categories.find((c) => c.isActive);
    return firstActive ? firstActive.id : 'all';
  });

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNumberInputId, setActiveNumberInputId] = useState<string | null>(null);
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const isSubmitting = isSubmittingOrder || internalSubmitting;
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Track if initial category has been assigned
  const initialCategorySetRef = useRef(false);

  // Auto-select first active real category on initial mount/load or if current selection becomes invalid
  useEffect(() => {
    if (activeCategories.length > 0) {
      if (!initialCategorySetRef.current) {
        initialCategorySetRef.current = true;
        setSelectedCategoryId(activeCategories[0].id);
      } else if (
        selectedCategoryId !== 'all' &&
        !activeCategories.some((c) => c.id === selectedCategoryId)
      ) {
        // Fallback if previously selected category was deactivated/deleted
        setSelectedCategoryId(activeCategories[0].id);
      }
    } else if (activeCategories.length === 0 && selectedCategoryId !== 'all') {
      setSelectedCategoryId('all');
    }
  }, [activeCategories, selectedCategoryId]);

  // Active products sorted by Category sortOrder, then Product sortOrder within category (with locale tie-breaker)
  const activeProducts = useMemo(() => {
    const catOrderMap = new Map<string, number>(
      categories.map((c, idx) => [c.id, typeof c.sortOrder === 'number' ? c.sortOrder : idx + 1])
    );

    return products
      .filter((p) => p.isActive)
      .slice()
      .sort((a, b) => {
        const catOrderA: number = catOrderMap.get(a.categoryId) ?? 99999;
        const catOrderB: number = catOrderMap.get(b.categoryId) ?? 99999;
        if (catOrderA !== catOrderB) {
          return catOrderA - catOrderB;
        }
        const sortA = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const sortB = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        if (sortA !== sortB) {
          return sortA - sortB;
        }
        return a.name.localeCompare(b.name, ['th-TH', 'en'], {
          numeric: true,
          sensitivity: 'base',
        });
      });
  }, [products, categories]);

  // Filtered products for Left Panel: Global Search when query exists, Category filter otherwise
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length > 0) {
      // GLOBAL SEARCH MODE: Search across all active products, sorted alphabetically (Thai ก-ฮ, Eng A-Z, 2->10->20)
      return activeProducts
        .filter(
          (product) =>
            product.name.toLowerCase().includes(query) ||
            (product.productCode && product.productCode.toLowerCase().includes(query))
        )
        .sort((a, b) =>
          a.name.localeCompare(b.name, ['th-TH', 'en'], {
            numeric: true,
            sensitivity: 'base',
          })
        );
    }

    // NORMAL MODE: Filter by selected category
    if (selectedCategoryId === 'all') {
      return activeProducts;
    }
    return activeProducts.filter((p) => p.categoryId === selectedCategoryId);
  }, [activeProducts, selectedCategoryId, searchQuery]);

  // Selected Cart Items for Right Panel
  const selectedCartItems = useMemo(() => {
    const prodMap = new Map<string, Product>(products.map((p) => [p.id, p]));
    const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

    const items: Array<{
      productId: string;
      product: Product;
      category?: Category;
      quantity: number;
      lineTotal: number;
    }> = [];

    for (const prodId of Object.keys(cart)) {
      const qty = cart[prodId] || 0;
      if (qty > 0) {
        const prod = prodMap.get(prodId);
        if (prod) {
          const safePrice = Number(prod.price) || 0;
          items.push({
            productId: prodId,
            product: prod,
            category: catMap.get(prod.categoryId),
            quantity: qty,
            lineTotal: Math.round(qty * safePrice * 100) / 100,
          });
        }
      }
    }

    return items;
  }, [cart, products, categories]);

  // Calculations
  const { totalItemsCount, grandTotal, regularSubtotal, drinkSubtotal, drinkVat, isOnlyDrinks } = useMemo(() => {
    let count = 0;
    let drinks = 0;
    let regularSub = 0;
    let drinkSub = 0;

    for (const item of selectedCartItems) {
      count++;
      const isDrink = Boolean(
        item.category?.isDrink ||
        item.category?.name.includes('เครื่องดื่ม') ||
        item.category?.name.toLowerCase().includes('drink')
      );
      if (isDrink) {
        drinks++;
        drinkSub += item.lineTotal;
      } else {
        regularSub += item.lineTotal;
      }
    }

    const vat = Math.round(drinkSub * 0.07 * 100) / 100;
    const safeGrandTotal = Math.round((regularSub + drinkSub + vat) * 100) / 100;
    const allDrinks = count > 0 && drinks === count;
    return {
      totalItemsCount: count,
      grandTotal: safeGrandTotal,
      regularSubtotal: regularSub,
      drinkSubtotal: drinkSub,
      drinkVat: vat,
      isOnlyDrinks: allDrinks,
    };
  }, [selectedCartItems]);

  // Selected count per category badge
  const categoryCartCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of selectedCartItems) {
      counts[item.product.categoryId] = (counts[item.product.categoryId] || 0) + 1;
    }
    return counts;
  }, [selectedCartItems]);

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);
  const isViewingDrinksCategory =
    selectedCategoryObj?.isDrink || selectedCategoryObj?.name.includes('เครื่องดื่ม');

  // Handle Send Order trigger (guarded against empty orders & double-submission)
  const handleTriggerSendOrder = () => {
    if (totalItemsCount === 0 || isSubmitting) return;
    setInternalSubmitting(true);
    setTimeout(() => setInternalSubmitting(false), 800);

    if (isViewingDrinksCategory || isOnlyDrinks) {
      onSubmitDrinkOrder();
    } else {
      onSubmitNormalOrder();
    }
  };

  return (
    <div id="order-view-screen" className="space-y-4 pb-24 md:pb-16 max-w-4xl mx-auto">
      {/* Prominent Shop Delivery Notice Banner */}
      <div
        id="shop-delivery-schedule-banner"
        className="bg-red-600 border-2 border-red-700 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex items-center gap-3.5 shadow-md"
      >
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-inner">
          🚚
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wide text-red-700 bg-white px-2.5 py-0.5 rounded-md shadow-xs">
              รอบวันจัดส่งร้านค้า
            </span>
          </div>
          <p className="text-sm sm:text-base md:text-lg font-black text-white leading-snug drop-shadow-xs">
            {STORE_DELIVERY_NOTICE}
          </p>
        </div>
      </div>

      {/* Sticky Category & Search Navigation Bar */}
      <div
        id="sticky-category-bar"
        className="sticky top-[calc(53px+env(safe-area-inset-top,0px))] sm:top-[calc(57px+env(safe-area-inset-top,0px))] z-20 bg-[#F8F7F4]/95 backdrop-blur-xs -mx-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6 py-2 transition-shadow"
      >
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 border border-gray-200 shadow-2xs space-y-2.5">
          {/* Expandable Search Input when Active */}
          {isSearchExpanded ? (
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="order-search-input"
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อสินค้า (เช่น หมูสับ, ใบกะเพรา, โค้ก)..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl sm:rounded-2xl bg-[#F8F7F4] border border-gray-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:bg-white text-[#141414]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                    aria-label="ล้างคำค้นหา"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSearchExpanded(false);
                  setSearchQuery('');
                }}
                className="px-3 py-2.5 rounded-xl sm:rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
                aria-label="ปิดการค้นหา"
              >
                ปิดค้นหา
              </button>
            </div>
          ) : null}

          {/* Category Navigation Bar with Search Icon at Start */}
          <div
            id="category-pills-container"
            className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1"
          >
            {/* Search Toggle Icon at the beginning of Category Row */}
            {!isSearchExpanded && (
              <button
                id="toggle-search-btn"
                type="button"
                onClick={() => setIsSearchExpanded(true)}
                className={`shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                  searchQuery
                    ? 'bg-[#F27D26] text-white border-[#F27D26] shadow-2xs'
                    : 'bg-[#F8F7F4] text-gray-700 hover:bg-gray-200 border-gray-200'
                }`}
                title="ค้นหาสินค้า"
                aria-label="ค้นหาสินค้า"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Specific Categories in registered order */}
            {activeCategories.map((cat) => {
              const countInCart = categoryCartCounts[cat.id] || 0;
              const isSelected = selectedCategoryId === cat.id;

              return (
                <button
                  key={cat.id}
                  id={`cat-pill-${cat.id}`}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all active:scale-95 whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#F27D26] text-white shadow-2xs'
                      : 'bg-[#F8F7F4] text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  <span>{cat.name}</span>
                  {countInCart > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] sm:text-xs font-black ${
                        isSelected ? 'bg-white text-[#F27D26]' : 'bg-[#F27D26] text-white'
                      }`}
                    >
                      {countInCart}
                    </span>
                  )}
                </button>
              );
            })}

            {/* 'ทั้งหมด' Category is strictly LAST */}
            <button
              id="cat-pill-all"
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all active:scale-95 whitespace-nowrap ${
                selectedCategoryId === 'all'
                  ? 'bg-[#141414] text-white shadow-2xs'
                  : 'bg-[#F8F7F4] text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              <span>ทั้งหมด</span>
              <span className="opacity-70 text-xs">({activeProducts.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Beverage Banner Hint if viewing Drink category */}
      {isViewingDrinksCategory && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl p-3 sm:p-4 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Wine className="w-4 h-4" />
            </div>
            <div className="min-w-0 text-xs sm:text-sm">
              <p className="font-bold truncate">หมวดหมู่เครื่องดื่ม (Drink Order Mode)</p>
              <p className="opacity-90 text-[11px] sm:text-xs truncate">
                ระบบจะสร้างภาพสรุปรายการ (ไม่มีราคา) ส่งไลน์ได้ทันที
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Product List Header */}
      <div className="flex items-center justify-between px-1 min-h-[32px]">
        {searchQuery.trim() ? (
          <>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              ผลการค้นหา ({filteredProducts.length})
            </span>
            <span className="text-xs font-bold text-[#F27D26]">
              ค้นหาทั่วทั้งร้าน: "{searchQuery.trim()}"
            </span>
          </>
        ) : selectedCategoryId === 'all' ? (
          <>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              สินค้าทั้งหมด ({filteredProducts.length})
            </span>
            <span className="text-[11px] text-gray-400 font-medium">
              เรียงลำดับ ก-ฮ
            </span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-[#141414]">
                {selectedCategoryObj?.name}
              </span>
              <span className="text-xs font-medium text-gray-400">
                ({filteredProducts.length})
              </span>
            </div>

            {onSaveProduct && selectedCategoryObj && (
              <button
                id="quick-add-product-btn"
                type="button"
                onClick={() => setIsQuickAddOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 active:bg-orange-200 text-[#F27D26] border border-orange-200 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs cursor-pointer"
                title={`เพิ่มสินค้าใหม่ในหมวดหมู่ ${selectedCategoryObj.name}`}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ เพิ่มสินค้า</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Compact Vertical Product List or Targeted Empty States */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center border border-gray-200 shadow-2xs space-y-3">
          {searchQuery.trim() ? (
            <>
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <p className="text-gray-700 text-sm font-bold">ไม่พบสินค้าที่ค้นหา</p>
                <p className="text-gray-400 text-xs mt-0.5">ลองค้นหาด้วยคำอื่น หรือแตะปุ่มด้านล่างเพื่อล้างการค้นหา</p>
              </div>
              <button
                id="clear-search-empty-btn"
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
              <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F27D26]">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-700 text-sm font-bold">ยังไม่มีสินค้าในหมวดนี้</p>
                <p className="text-gray-400 text-xs mt-0.5">แตะปุ่มด้านล่างเพื่อเพิ่มสินค้าลงในหมวดหมู่นี้</p>
              </div>
              {onSaveProduct && (
                <button
                  id="add-prod-in-empty-cat-btn"
                  type="button"
                  onClick={() => setIsQuickAddOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#F27D26] hover:bg-[#d96614] active:bg-orange-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ เพิ่มสินค้า</span>
                </button>
              )}
            </>
          ) : (
            <div className="py-2">
              <p className="text-gray-700 text-sm font-bold">ยังไม่มีรายการสินค้า</p>
              <p className="text-gray-400 text-xs mt-1">เลือกหมวดหมู่อื่นเพื่อเพิ่มหรือดูรายการสินค้า</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col space-y-2">
          {filteredProducts.map((product) => {
            const quantity = cart[product.id] || 0;
            const lineTotal = quantity * product.price;
            const isSelected = quantity > 0;

            return (
              <div
                key={product.id}
                id={`product-card-${product.id}`}
                className={`bg-white rounded-2xl p-2.5 sm:p-3 border transition-all duration-150 flex items-center justify-between gap-2.5 sm:gap-3.5 shadow-2xs min-h-[76px] sm:min-h-[82px] ${
                  isSelected
                    ? 'border-[#F27D26] ring-1 ring-[#F27D26]/25 bg-orange-50/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Left: Product Thumbnail */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gray-100 border border-gray-200/80 shrink-0 overflow-hidden flex items-center justify-center relative">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-gray-400 text-sm sm:text-base font-bold select-none">
                      {product.name.slice(0, 2)}
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#F27D26] ring-2 ring-white" />
                  )}
                </div>

                {/* Center: Product Name & Price / Unit */}
                <div className="flex-1 min-w-0 pr-1">
                  <h3 className="font-bold text-[#141414] text-sm sm:text-base leading-snug line-clamp-2">
                    {product.name}
                  </h3>
                  {product.productCode && (
                    <div className="mt-0.5">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 text-gray-700 border border-gray-200">
                        รหัส: {product.productCode}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    <span className="font-bold text-[#F27D26] text-xs sm:text-sm">
                      ฿{formatCurrency(product.price)}
                    </span>
                    <span className="text-[11px] sm:text-xs text-gray-500 font-medium">
                      / {product.unit}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] sm:text-xs font-semibold text-orange-700 bg-orange-100/90 px-1.5 py-0.2 rounded-md">
                        รวม ฿{formatCurrency(lineTotal)}
                      </span>
                    )}
                  </div>

                  {/* Under Price/Unit: "แก้ไข" (Edit) Button */}
                  {onSaveProduct && (
                    <div className="mt-1 flex items-center">
                      <button
                        id={`edit-prod-btn-${product.id}`}
                        type="button"
                        onClick={() => setEditingProduct(product)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-gray-200 hover:border-orange-300 bg-white hover:bg-orange-50/70 text-gray-600 hover:text-[#F27D26] text-[11px] font-bold shadow-2xs transition-all active:scale-95 cursor-pointer select-none"
                        title={`แก้ไข ${product.name}`}
                      >
                        <Pencil className="w-3 h-3 stroke-[2.2]" />
                        <span>แก้ไข</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: Compact Stepper Quantity Control */}
                <div className="shrink-0 flex items-center gap-1 bg-[#F8F7F4] p-1 rounded-xl border border-gray-200">
                  {/* Decrease Button */}
                  <button
                    id={`dec-btn-${product.id}`}
                    type="button"
                    disabled={quantity <= 0}
                    onClick={() => onUpdateQuantity(product.id, Math.max(0, quantity - 1))}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white text-gray-700 hover:text-[#141414] hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-white flex items-center justify-center font-bold border border-gray-200 shadow-2xs transition-transform active:scale-90"
                    aria-label={`ลดจำนวน ${product.name}`}
                  >
                    <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {/* Quantity Display / Direct Edit input */}
                  {activeNumberInputId === product.id ? (
                    <input
                      type="number"
                      min="0"
                      autoFocus
                      value={quantity === 0 ? '' : quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        onUpdateQuantity(product.id, isNaN(val) ? 0 : Math.max(0, val));
                      }}
                      onBlur={() => setActiveNumberInputId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setActiveNumberInputId(null);
                      }}
                      className="w-10 sm:w-12 text-center font-bold text-sm sm:text-base bg-white rounded-lg border border-[#F27D26] py-1 text-[#141414] focus:outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveNumberInputId(product.id)}
                      className={`w-7 sm:w-9 py-1 text-center font-bold text-sm sm:text-base rounded-lg transition-colors select-none ${
                        quantity > 0
                          ? 'text-[#F27D26] bg-orange-100/80 font-black'
                          : 'text-gray-400 hover:text-gray-700'
                      }`}
                      title="แตะเพื่อพิมพ์ตัวเลขโดยตรง"
                    >
                      {quantity}
                    </button>
                  )}

                  {/* Increase Button */}
                  <button
                    id={`inc-btn-${product.id}`}
                    type="button"
                    onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#F27D26] hover:bg-[#d96614] active:bg-orange-800 text-white flex items-center justify-center shadow-2xs font-bold transition-transform active:scale-90"
                    aria-label={`เพิ่มจำนวน ${product.name}`}
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* FLOATING COMPACT CART BUTTON                             */}
      {/* Appears when at least 1 product is selected               */}
      {/* ======================================================== */}
      {totalItemsCount > 0 && (
        <button
          id="floating-cart-button"
          type="button"
          onClick={() => setIsCartModalOpen(true)}
          className="fixed right-4 sm:right-6 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 z-40 bg-[#F27D26] hover:bg-[#d96614] active:bg-orange-800 text-white shadow-xl hover:shadow-2xl rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 flex items-center gap-3 border border-white/25 transition-all duration-200 active:scale-95 cursor-pointer animate-in fade-in slide-in-from-bottom-3"
          aria-label="เปิดดูรายการที่เลือก"
        >
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/20">
            <ShoppingBag className="w-5 h-5 text-white" />
            <span className="absolute -top-1.5 -right-1.5 bg-white text-[#F27D26] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
              {totalItemsCount}
            </span>
          </div>
          <div className="text-left leading-tight pr-1">
            <div className="text-[11px] sm:text-xs font-semibold text-orange-100">
              🛒 {totalItemsCount} รายการ
            </div>
            <div className="text-sm sm:text-base font-black tracking-tight">
              ฿{formatCurrency(grandTotal)}
            </div>
          </div>
        </button>
      )}

      {/* ======================================================== */}
      {/* CART MODAL / BOTTOM SHEET                                */}
      {/* Opens when floating cart button is tapped                */}
      {/* ======================================================== */}
      {isCartModalOpen && (
        <div
          id="cart-drawer-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl max-h-[88vh] sm:max-h-[85vh] w-full sm:max-w-lg shadow-2xl flex flex-col border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center">
                  <ReceiptText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-[#141414] text-base sm:text-lg leading-tight">
                    รายการที่เลือก
                  </h2>
                  <p className="text-xs text-gray-400 font-medium">
                    {totalItemsCount > 0
                      ? `${totalItemsCount} รายการในออเดอร์`
                      : 'ยังไม่มีรายการ'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {totalItemsCount > 0 && onClearCart && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearCart();
                      setIsCartModalOpen(false);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
                    title="ล้างรายการทั้งหมด"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>ล้าง</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCartModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                  aria-label="ปิดหน้าต่างตะกร้า"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Selected Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-100/60">
              {selectedCartItems.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#F8F7F4] border border-gray-200 flex items-center justify-center text-gray-400 mb-3">
                    <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <h3 className="font-bold text-[#141414] text-sm">
                    ยังไม่มีรายการที่เลือก
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-[220px]">
                    เลือกวัตถุดิบจากรายการเพื่อเริ่มจัดเตรียมออเดอร์
                  </p>
                </div>
              ) : (
                selectedCartItems.map((item) => (
                  <div
                    key={item.productId}
                    id={`cart-modal-item-${item.productId}`}
                    className="pt-3 first:pt-0 flex items-center justify-between gap-3 text-xs"
                  >
                    {/* Item Thumbnail */}
                    <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 shrink-0 overflow-hidden flex items-center justify-center">
                      {item.product.image ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs font-bold">
                          {item.product.name.slice(0, 2)}
                        </span>
                      )}
                    </div>

                    {/* Item Info */}
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[#141414] text-sm truncate">
                        {item.product.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-gray-500">
                        <span className="font-semibold text-gray-700">
                          {item.quantity} {item.product.unit}
                        </span>
                        <span className="text-[11px] opacity-70">
                          (฿{formatCurrency(item.product.price)}/{item.product.unit})
                        </span>
                      </div>
                    </div>

                    {/* Stepper & Line Total */}
                    <div className="text-right shrink-0 space-y-1">
                      <div className="font-black text-[#F27D26] text-sm">
                        ฿{formatCurrency(item.lineTotal)}
                      </div>
                      <div className="flex items-center gap-1 bg-[#F8F7F4] p-0.5 rounded-lg border border-gray-200">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.productId, Math.max(0, item.quantity - 1))
                          }
                          className="w-6 h-6 rounded-md bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 flex items-center justify-center font-bold"
                          title="ลดจำนวน"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-1.5 font-bold text-gray-800 min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.productId, item.quantity + 1)
                          }
                          className="w-6 h-6 rounded-md bg-[#F27D26] hover:bg-[#d96614] text-white flex items-center justify-center font-bold shadow-2xs"
                          title="เพิ่มจำนวน"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer: Summary & Send Order Button */}
            <div className="p-4 sm:p-5 bg-[#F8F7F4] border-t border-gray-200 space-y-3 shrink-0">
              {/* Summary Stats Box */}
              <div className="bg-white rounded-2xl p-3.5 border border-gray-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600 font-medium">
                  <span>จำนวนรายการ:</span>
                  <span className="font-bold text-[#141414]">{totalItemsCount} รายการ</span>
                </div>

                {drinkVat > 0 && (
                  <div className="space-y-1.5 pt-1.5 border-t border-gray-100 text-xs">
                    {regularSubtotal > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>สินค้าทั่วไป:</span>
                        <span className="font-semibold text-[#141414]">฿{formatCurrency(regularSubtotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>หมวดเครื่องดื่ม:</span>
                      <span className="font-semibold text-[#141414]">฿{formatCurrency(drinkSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-[#F27D26] font-medium">
                      <span>+ ภาษี VAT 7% (เครื่องดื่ม):</span>
                      <span className="font-bold">+฿{formatCurrency(drinkVat)}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-baseline justify-between pt-1.5 border-t border-gray-100">
                  <span className="text-xs font-bold text-gray-800">
                    ยอดรวมสุทธิ {drinkVat > 0 ? '(รวม VAT 7%)' : ''}:
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-[#F27D26]">
                    ฿{formatCurrency(grandTotal)}
                  </span>
                </div>

                <div className="bg-red-600 text-white rounded-xl p-3 text-xs sm:text-sm border border-red-700 flex items-center gap-2.5 shadow-xs">
                  <span className="shrink-0 text-base sm:text-lg">🚚</span>
                  <div className="min-w-0">
                    <span className="font-black bg-white text-red-700 px-1.5 py-0.5 rounded text-[10px] sm:text-xs mr-1.5 uppercase shadow-2xs">รอบจัดส่ง</span>
                    <span className="font-black text-white text-xs sm:text-sm">{STORE_DELIVERY_NOTICE}</span>
                  </div>
                </div>
              </div>

              {/* Send Order Button */}
              <button
                id="cart-modal-send-order-btn"
                type="button"
                disabled={totalItemsCount === 0 || isSubmitting}
                onClick={() => {
                  setIsCartModalOpen(false);
                  handleTriggerSendOrder();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#F27D26] hover:bg-[#d96614] active:bg-orange-800 disabled:opacity-40 disabled:hover:bg-[#F27D26] text-white font-black text-sm sm:text-base transition-all shadow-sm hover:shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>กำลังเตรียมรายการ...</span>
                  </>
                ) : isViewingDrinksCategory || isOnlyDrinks ? (
                  <>
                    <Wine className="w-5 h-5" />
                    <span>สร้างภาพออเดอร์เครื่องดื่ม (LINE)</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>ส่ง ORDER ({totalItemsCount} รายการ)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal (Inherits Selected Category Context) */}
      <QuickAddProductModal
        isOpen={isQuickAddOpen}
        category={selectedCategoryObj || null}
        categories={activeCategories}
        onClose={() => setIsQuickAddOpen(false)}
        onSaveProduct={onSaveProduct || (async () => {})}
      />

      {/* Edit Product Modal */}
      <QuickAddProductModal
        isOpen={!!editingProduct}
        productToEdit={editingProduct}
        categories={activeCategories}
        onClose={() => setEditingProduct(null)}
        onSaveProduct={onSaveProduct || (async () => {})}
      />
    </div>
  );
};
