/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Tony's Kitchen — Ingredient Order
 * Local-First / Offline-First Restaurant Ingredient Ordering App
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Category,
  Product,
  CartState,
  CartItemSnapshot,
  CartIntegrityIssue,
  AppSettings,
  ActiveTab,
  CategoryGroupSummary,
  ToastMessage,
  OrderHistoryRecord,
} from './types';
import {
  initializeDatabase,
  getCategories,
  getProducts,
  getSettings,
  saveCategory,
  deleteCategory,
  reorderCategories,
  saveProduct,
  deleteProduct,
  toggleProductActive,
  enableAllProducts,
  reorderProducts,
  saveSettings,
  getOrderHistory,
  saveOrderRecord,
  deleteOrderRecord,
  clearOrderHistory,
  importProductsFromGoogleSheetsData,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  DEFAULT_SETTINGS,
} from './db/indexedDB';
import { Header } from './components/Header';
import { OrderView } from './components/OrderView';
import { SettingsHub, ManagementSubTab } from './components/SettingsHub';
import { NormalOrderReviewModal } from './components/NormalOrderReviewModal';
import { DrinkOrderModal } from './components/DrinkOrderModal';
import { CartIntegrityModal } from './components/CartIntegrityModal';
import { ToastContainer } from './components/ToastContainer';
import { DrinkOrderImageResult } from './utils/drinkImageGenerator';
import { copyToClipboard } from './utils/orderFormatter';
import { generateVersionAText } from './utils/orderFormatter';
import { validateCartIntegrity } from './utils/cartIntegrity';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('order');
  const [settingsSubTab, setSettingsSubTab] = useState<ManagementSubTab>('products');

  // DB Data State with instant synchronous initial data for immediate render
  const [categories, setCategories] = useState<Category[]>(() =>
    INITIAL_CATEGORIES.map((c) => ({
      ...c,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }))
  );
  const [products, setProducts] = useState<Product[]>(() =>
    INITIAL_PRODUCTS.map((p) => ({
      ...p,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }))
  );
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryRecord[]>([]);

  // Cart State (Key: productId -> Value: quantity)
  const [cart, setCart] = useState<CartState>({});
  // Cart Snapshots: Snapshot of product properties when placed in cart for integrity comparison
  const [cartSnapshots, setCartSnapshots] = useState<Record<string, CartItemSnapshot>>({});

  // Modals & Submission State
  const [isNormalReviewOpen, setIsNormalReviewOpen] = useState(false);
  const [isDrinkModalOpen, setIsDrinkModalOpen] = useState(false);
  const [isPreparingOrder, setIsPreparingOrder] = useState(false);

  // Pre-Order Integrity Verification State
  const [integrityIssues, setIntegrityIssues] = useState<CartIntegrityIssue[]>([]);
  const [isIntegrityModalOpen, setIsIntegrityModalOpen] = useState(false);
  const [pendingOrderType, setPendingOrderType] = useState<'normal' | 'drink'>('normal');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (type: 'success' | 'error' | 'info', message: string, title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      setToasts((prev) => [...prev, { id, type, message, title }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Background Load from IndexedDB / Local Storage
  const loadAllData = useCallback(async () => {
    try {
      await initializeDatabase();
      const prods = await enableAllProducts();
      const [cats, sets, history] = await Promise.all([
        getCategories(),
        getSettings(),
        getOrderHistory(30),
      ]);
      if (cats && cats.length > 0) {
        setCategories(cats);
      }
      if (prods && prods.length > 0) {
        setProducts(prods);
      }
      if (sets) {
        setSettings(sets);
      }
      if (history && history.length > 0) {
        setOrderHistory(history);
      }
    } catch (err) {
      console.warn('Background database sync encountered error, keeping initial state:', err);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Update Cart Quantity
  const handleUpdateQuantity = useCallback(
    (productId: string, quantity: number) => {
      setCart((prev) => {
        const next = { ...prev };
        if (quantity <= 0) {
          delete next[productId];
        } else {
          next[productId] = quantity;
        }
        return next;
      });

      if (quantity <= 0) {
        setCartSnapshots((prev) => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
      } else {
        setCartSnapshots((prev) => {
          if (prev[productId]) return prev;
          const prod = products.find((p) => p.id === productId);
          if (!prod) return prev;
          const cat = categories.find((c) => c.id === prod.categoryId);
          return {
            ...prev,
            [productId]: {
              productId: prod.id,
              name: prod.name,
              productCode: prod.productCode,
              image: prod.image,
              price: prod.price,
              unit: prod.unit,
              categoryId: prod.categoryId,
              categoryName: cat?.name || 'อื่นๆ',
              addedAt: Date.now(),
            },
          };
        });
      }
    },
    [products, categories]
  );

  const handleClearCart = useCallback(() => {
    setCart({});
    setCartSnapshots({});
    showToast('info', 'ล้างรายการในตะกร้าเรียบร้อยแล้ว');
  }, [showToast]);

  /**
   * Centralized Order Reset Workflow
   * Completely resets the transient current order / cart state upon order completion.
   * Preserves product master data, prices, images, categories, settings, and order history.
   */
  const clearCurrentOrder = useCallback(() => {
    // 1. Reset current cart & item quantities back to 0
    setCart({});
    setCartSnapshots({});
    setIntegrityIssues([]);
    setIsIntegrityModalOpen(false);

    // 2. Close all order review modals and reset modal state
    setIsNormalReviewOpen(false);
    setIsDrinkModalOpen(false);

    // 3. Return to the main ORDER screen
    setActiveTab('order');

    // 4. Clean up any transient order storage keys if present
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('tonys_kitchen_current_order');
        window.localStorage.removeItem('tonys_kitchen_cart');
      }
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem('tonys_kitchen_current_order');
        window.sessionStorage.removeItem('tonys_kitchen_cart');
      }
    } catch (err) {
      console.warn('Storage cleanup error:', err);
    }
  }, []);

  // Compute Cart Summaries grouped by Category
  const {
    groupedSummary,
    grandTotal,
    regularSubtotal,
    drinkSubtotal,
    drinkVat,
    totalItemsCount,
    drinkItemsOnly,
  } = useMemo(() => {
    const prodMap = new Map<string, Product>(products.map((p) => [p.id, p]));
    const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

    // Group items by categoryId
    const groupsByCatId = new Map<string, CategoryGroupSummary>();

    for (const cat of categories) {
      groupsByCatId.set(cat.id, {
        category: cat,
        items: [],
        subtotal: 0,
        totalQuantity: 0,
      });
    }

    let overallTotal = 0;
    let overallCount = 0;
    const drinksList: any[] = [];

    for (const prodId of Object.keys(cart)) {
      const qty = cart[prodId] || 0;
      if (qty > 0) {
        let product = prodMap.get(prodId);
        // If product was deleted, keep a fallback representation using snapshot to avoid silent disappearance
        if (!product && cartSnapshots[prodId]) {
          const snap = cartSnapshots[prodId];
          product = {
            id: snap.productId,
            categoryId: snap.categoryId || 'other',
            name: snap.name,
            image: snap.image || '',
            unit: snap.unit || 'ชิ้น',
            price: snap.price || 0,
            isActive: false,
            sortOrder: 999,
            createdAt: snap.addedAt,
            updatedAt: snap.addedAt,
          };
        }

        if (product) {
          const lineTotal = qty * product.price;
          overallTotal += lineTotal;
          overallCount += 1;

          const cartItem = {
            productId: product.id,
            product,
            quantity: qty,
            lineTotal,
          };

          let group = groupsByCatId.get(product.categoryId);
          if (!group) {
            const fallbackCat: Category = {
              id: product.categoryId,
              name: 'อื่นๆ',
              sortOrder: 99,
              isActive: true,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            group = {
              category: fallbackCat,
              items: [],
              subtotal: 0,
              totalQuantity: 0,
            };
            groupsByCatId.set(product.categoryId, group);
          }

          group.items.push(cartItem);
          group.subtotal += lineTotal;
          group.totalQuantity += qty;

          const cat = catMap.get(product.categoryId);
          if (cat?.isDrink || cat?.name.includes('เครื่องดื่ม')) {
            drinksList.push(cartItem);
          }
        }
      }
    }

    // Filter only groups with items and sort according to category order and product order
    const populatedGroups: CategoryGroupSummary[] = [];
    let regularSubtotal = 0;
    let drinkSubtotal = 0;

    for (const cat of categories) {
      const g = groupsByCatId.get(cat.id);
      if (g && g.items.length > 0) {
        g.items.sort((a, b) => {
          const sortA = typeof a.product.sortOrder === 'number' ? a.product.sortOrder : 0;
          const sortB = typeof b.product.sortOrder === 'number' ? b.product.sortOrder : 0;
          if (sortA !== sortB) return sortA - sortB;
          return a.product.name.localeCompare(b.product.name, ['th-TH', 'en'], {
            numeric: true,
            sensitivity: 'base',
          });
        });

        const isDrink = Boolean(cat.isDrink || cat.name.includes('เครื่องดื่ม') || cat.name.toLowerCase().includes('drink'));
        g.isDrink = isDrink;
        if (isDrink) {
          const vat = Math.round(g.subtotal * 0.07 * 100) / 100;
          g.vatRate = 0.07;
          g.vatAmount = vat;
          g.totalWithVat = Math.round((g.subtotal + vat) * 100) / 100;
          drinkSubtotal += g.subtotal;
        } else {
          regularSubtotal += g.subtotal;
        }

        populatedGroups.push(g);
      }
    }

    const drinkVat = Math.round(drinkSubtotal * 0.07 * 100) / 100;
    const computedGrandTotal = Math.round((regularSubtotal + drinkSubtotal + drinkVat) * 100) / 100;

    return {
      groupedSummary: populatedGroups,
      grandTotal: computedGrandTotal,
      regularSubtotal,
      drinkSubtotal,
      drinkVat,
      totalItemsCount: overallCount,
      drinkItemsOnly: drinksList,
    };
  }, [cart, cartSnapshots, products, categories]);

  // Execute Order Workflows
  const executeNormalOrder = useCallback(() => {
    // 1. Generate Version A text & copy to clipboard immediately as required
    const textA = generateVersionAText(groupedSummary, grandTotal, settings);
    copyToClipboard(textA).then(() => {
      showToast('success', 'คัดลอกข้อความตรวจราคา (Version A) ลงคลิปบอร์ดแล้ว');
    });

    // 2. Open Normal Order Review Modal
    setIsNormalReviewOpen(true);
  }, [groupedSummary, grandTotal, settings, showToast]);

  const executeDrinkOrder = useCallback(() => {
    setIsDrinkModalOpen(true);
  }, []);

  // Submit Triggers with Pre-Order Data Integrity Check & Double-Submission Guard
  const handleSubmitNormalOrder = useCallback(() => {
    if (isPreparingOrder) return;
    if (totalItemsCount === 0) {
      showToast('error', 'กรุณาเลือกวัตถุดิบอย่างน้อย 1 รายการก่อนส่ง Order', 'ยังไม่มีรายการ');
      return;
    }

    setIsPreparingOrder(true);

    try {
      const result = validateCartIntegrity(cart, cartSnapshots, products, categories, false);
      if (!result.isValid) {
        setIntegrityIssues(result.issues);
        setPendingOrderType('normal');
        setIsIntegrityModalOpen(true);
        return;
      }

      // Normal case: instant workflow with zero warning friction
      executeNormalOrder();
    } finally {
      setTimeout(() => setIsPreparingOrder(false), 300);
    }
  }, [isPreparingOrder, totalItemsCount, cart, cartSnapshots, products, categories, executeNormalOrder, showToast]);

  const handleSubmitDrinkOrder = useCallback(() => {
    if (isPreparingOrder) return;
    if (drinkItemsOnly.length === 0) {
      showToast(
        'info',
        'กรุณาเลือกเครื่องดื่มอย่างน้อย 1 รายการเพื่อสร้างภาพใบสั่งเครื่องดื่ม',
        'ยังไม่ได้เลือกเครื่องดื่ม'
      );
      return;
    }

    setIsPreparingOrder(true);

    try {
      const result = validateCartIntegrity(cart, cartSnapshots, products, categories, true);
      if (!result.isValid) {
        setIntegrityIssues(result.issues);
        setPendingOrderType('drink');
        setIsIntegrityModalOpen(true);
        return;
      }

      // Normal case: instant workflow with zero warning friction
      executeDrinkOrder();
    } finally {
      setTimeout(() => setIsPreparingOrder(false), 300);
    }
  }, [isPreparingOrder, drinkItemsOnly.length, cart, cartSnapshots, products, categories, executeDrinkOrder, showToast]);

  // Integrity Modal Action Handlers
  const handleIntegrityRemoveItem = useCallback(
    (productId: string) => {
      handleUpdateQuantity(productId, 0);
      setIntegrityIssues((prev) => {
        const next = prev.filter((i) => i.productId !== productId);
        if (next.length === 0) {
          setIsIntegrityModalOpen(false);
        }
        return next;
      });
      showToast('info', 'นำรายการออกจากตะกร้าแล้ว');
    },
    [handleUpdateQuantity, showToast]
  );

  const handleAcceptSingleIntegrityIssue = useCallback(
    (issue: CartIntegrityIssue) => {
      const prod = products.find((p) => p.id === issue.productId);
      if (!prod) {
        handleIntegrityRemoveItem(issue.productId);
        return;
      }
      const cat = categories.find((c) => c.id === prod.categoryId);
      setCartSnapshots((prev) => ({
        ...prev,
        [issue.productId]: {
          productId: prod.id,
          name: prod.name,
          productCode: prod.productCode,
          image: prod.image,
          price: prod.price,
          unit: prod.unit,
          categoryId: prod.categoryId,
          categoryName: cat?.name || 'อื่นๆ',
          addedAt: Date.now(),
        },
      }));
      setIntegrityIssues((prev) => {
        const next = prev.filter((i) => i.id !== issue.id);
        if (next.length === 0) {
          setIsIntegrityModalOpen(false);
        }
        return next;
      });
      showToast('success', `อัปเดตข้อมูล ${issue.productName} เรียบร้อยแล้ว`);
    },
    [products, categories, handleIntegrityRemoveItem, showToast]
  );

  const handleAcceptAllIntegrityAndProceed = useCallback(() => {
    const prodMap = new Map<string, Product>(products.map((p) => [p.id, p]));
    const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

    const nextCart = { ...cart };
    const nextSnapshots = { ...cartSnapshots };
    let removedCount = 0;

    for (const issue of integrityIssues) {
      const prod = prodMap.get(issue.productId);
      const isDrinkIssue = pendingOrderType === 'drink' && issue.type === 'DRINK_MISMATCH';

      if (!prod || !prod.isActive || isDrinkIssue) {
        delete nextCart[issue.productId];
        delete nextSnapshots[issue.productId];
        removedCount++;
      } else {
        const cat = catMap.get(prod.categoryId);
        nextSnapshots[prod.id] = {
          productId: prod.id,
          name: prod.name,
          productCode: prod.productCode,
          image: prod.image,
          price: prod.price,
          unit: prod.unit,
          categoryId: prod.categoryId,
          categoryName: cat?.name || 'อื่นๆ',
          addedAt: Date.now(),
        };
      }
    }

    setCart(nextCart);
    setCartSnapshots(nextSnapshots);
    setIntegrityIssues([]);
    setIsIntegrityModalOpen(false);

    if (removedCount > 0) {
      showToast('info', `นำ ${removedCount} รายการที่ไม่พร้อมใช้งานออกจากตะกร้าแล้ว`);
    }

    const remainingItems = Object.keys(nextCart).filter((k) => (nextCart[k] || 0) > 0);
    if (remainingItems.length === 0) {
      showToast('error', 'ไม่มีรายการที่สั่งซื้อได้ในตะกร้า', 'ตะกร้าว่าง');
      return;
    }

    if (pendingOrderType === 'drink') {
      setIsDrinkModalOpen(true);
    } else {
      setIsNormalReviewOpen(true);
    }
  }, [cart, cartSnapshots, integrityIssues, products, categories, pendingOrderType, showToast]);

  // Order Confirmed Callbacks
  const handleNormalOrderConfirmed = async (versionAText: string, versionBText: string) => {
    try {
      const itemsList = groupedSummary.flatMap((g) =>
        g.items.map((i) => ({
          productId: i.productId,
          productName: i.product.name,
          productCode: i.product.productCode,
          categoryName: g.category.name,
          quantity: i.quantity,
          unit: i.product.unit,
          unitPrice: i.product.price,
          price: i.product.price,
          lineTotal: i.lineTotal,
        }))
      );

      await saveOrderRecord({
        orderType: 'normal',
        itemCount: totalItemsCount,
        grandTotal,
        regularSubtotal,
        drinkSubtotal,
        drinkVat,
        items: itemsList,
        versionAText,
        versionBText,
      });

      const updatedHistory = await getOrderHistory(100);
      setOrderHistory(updatedHistory);
      showToast('success', 'บันทึกประวัติการสั่งซื้อเรียบร้อยแล้ว', 'ส่งออเดอร์สำเร็จ');
    } catch (err) {
      console.error('Failed to save order record:', err);
    }
  };

  const handleDrinkOrderConfirmed = async (imageResult: DrinkOrderImageResult) => {
    try {
      const subtotal = drinkItemsOnly.reduce((acc, i) => acc + i.lineTotal, 0);
      const vat = Math.round(subtotal * 0.07 * 100) / 100;
      const drinkGrandTotal = Math.round((subtotal + vat) * 100) / 100;

      const itemsList = drinkItemsOnly.map((i) => ({
        productId: i.productId,
        productName: i.product.name,
        productCode: i.product.productCode,
        categoryName: 'เครื่องดื่ม',
        quantity: i.quantity,
        unit: i.product.unit,
        unitPrice: i.product.price,
        price: i.product.price,
        lineTotal: i.lineTotal,
      }));

      await saveOrderRecord({
        orderType: 'drink',
        itemCount: drinkItemsOnly.length,
        grandTotal: drinkGrandTotal,
        drinkSubtotal: subtotal,
        drinkVat: vat,
        items: itemsList,
      });

      const updatedHistory = await getOrderHistory(100);
      setOrderHistory(updatedHistory);
      showToast('success', 'บันทึกประวัติการสั่งเครื่องดื่มแล้ว', 'ส่งออเดอร์สำเร็จ');
    } catch (err) {
      console.error('Failed to save drink order record:', err);
    }
  };

  // Quick Reorder: Add products to current cart using current product prices
  const handleQuickReorder = useCallback(
    (order: OrderHistoryRecord, mode: 'merge' | 'replace') => {
      const prodMap = new Map<string, Product>(products.map((p) => [p.id, p]));
      const unavailableItems: string[] = [];
      let addedCount = 0;

      setCart((prev) => {
        const nextCart = mode === 'replace' ? {} : { ...prev };

        for (const item of order.items) {
          const prod = prodMap.get(item.productId);
          if (!prod || !prod.isActive) {
            unavailableItems.push(item.productName);
            continue;
          }

          const currentQty = nextCart[prod.id] || 0;
          if (mode === 'replace') {
            nextCart[prod.id] = item.quantity;
          } else {
            // Merge / append to existing quantity
            nextCart[prod.id] = currentQty + item.quantity;
          }
          addedCount += 1;
        }

        return nextCart;
      });

      return { addedCount, unavailableItems };
    },
    [products]
  );

  // Delete Individual Order Record
  const handleDeleteOrderRecord = useCallback(async (orderId: string) => {
    await deleteOrderRecord(orderId);
    const updatedHistory = await getOrderHistory(100);
    setOrderHistory(updatedHistory);
  }, []);

  // Clear All Order History
  const handleClearAllOrderHistory = useCallback(async () => {
    await clearOrderHistory();
    setOrderHistory([]);
  }, []);

  // Category Operations
  const handleSaveCategory = async (catData: Partial<Category> & { name: string }) => {
    await saveCategory(catData);
    const updated = await getCategories();
    setCategories(updated);
    showToast('success', `บันทึกหมวดหมู่ "${catData.name}" สำเร็จ`);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const deletedProductIds = products.filter((p) => p.categoryId === categoryId).map((p) => p.id);

    await deleteCategory(categoryId);
    const [updatedCats, updatedProds] = await Promise.all([
      getCategories(),
      getProducts(),
    ]);

    if (deletedProductIds.length > 0) {
      setCart((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const pid of deletedProductIds) {
          if (next[pid]) {
            delete next[pid];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
      setCartSnapshots((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const pid of deletedProductIds) {
          if (next[pid]) {
            delete next[pid];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }

    setCategories(updatedCats);
    setProducts(updatedProds);
    showToast('info', 'ลบหมวดหมู่และสินค้าในหมวดนี้เรียบร้อยแล้ว');
  };

  const handleReorderCategories = async (newOrder: Category[]) => {
    setCategories(newOrder);
    await reorderCategories(newOrder);
    showToast('success', 'บันทึกลำดับหมวดหมู่ใหม่แล้ว');
  };

  // Product Operations
  const handleSaveProduct = async (prodData: Partial<Product> & { name: string; categoryId: string }) => {
    await saveProduct(prodData);
    const updated = await getProducts();
    setProducts(updated);
    showToast('success', `บันทึกวัตถุดิบ "${prodData.name}" เรียบร้อยแล้ว`);
  };

  const handleDeleteProduct = async (productId: string) => {
    await deleteProduct(productId);
    handleUpdateQuantity(productId, 0);
    const updated = await getProducts();
    setProducts(updated);
    showToast('info', 'ลบรายการวัตถุดิบแล้ว');
  };

  const handleToggleProductActive = async (productId: string) => {
    const isActive = await toggleProductActive(productId);
    const updated = await getProducts();
    setProducts(updated);
    showToast('info', isActive ? 'เปิดใช้งานวัตถุดิบแล้ว' : 'ปิดการแสดงผลวัตถุดิบแล้ว');
  };

  const handleEnableAllProducts = async () => {
    const updated = await enableAllProducts();
    setProducts(updated);
    showToast('success', `เปิดใช้งานวัตถุดิบทุกรายการ (${updated.length} รายการ) แล้ว`, 'เปิดใช้งานสำเร็จ');
  };

  const handleReorderProducts = async (orderedProductsInCat: Product[]) => {
    const updated = await reorderProducts(orderedProductsInCat);
    setProducts(updated);
  };

  const handleImportProductsFromSheets = async (
    importedProducts: {
      name: string;
      categoryName: string;
      price: number;
      unit: string;
      productCode?: string;
      isActive: boolean;
      sortOrder: number;
    }[]
  ) => {
    const res = await importProductsFromGoogleSheetsData(importedProducts);
    setCategories(res.categories);
    setProducts(res.products);
  };

  // Settings Operations
  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = await saveSettings(newSettings);
    setSettings(updated);
  };

  const handleUpdateLogo = async (logoDataUrl: string) => {
    await handleSaveSettings({ logoDataUrl });
    showToast('success', 'อัปเดตโลโก้ร้านค้าเรียบร้อยแล้ว');
  };

  return (
    <div id="app-root" className="min-h-screen bg-[#F8F7F4] text-[#141414] flex flex-col">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top Fixed Header */}
      <Header
        settings={settings}
        activeTab={activeTab}
        activeSubTab={activeTab === 'settings' ? settingsSubTab : undefined}
        onOpenSettings={() => {
          if (activeTab === 'settings' && settingsSubTab !== 'backup') {
            setActiveTab('order');
          } else {
            setActiveTab('settings');
            setSettingsSubTab('products');
          }
        }}
        onOpenBackup={() => {
          setActiveTab('settings');
          setSettingsSubTab('backup');
        }}
        onUpdateLogo={handleUpdateLogo}
      />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6">
        {activeTab === 'order' && (
          <OrderView
            categories={categories}
            products={products}
            cart={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onClearCart={handleClearCart}
            onSubmitNormalOrder={handleSubmitNormalOrder}
            onSubmitDrinkOrder={handleSubmitDrinkOrder}
            onSaveProduct={handleSaveProduct}
            isSubmittingOrder={isPreparingOrder}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsHub
            categories={categories}
            products={products}
            settings={settings}
            orderHistory={orderHistory}
            currentCart={cart}
            initialSubTab={settingsSubTab}
            onSubTabChange={setSettingsSubTab}
            onBackToOrder={() => setActiveTab('order')}
            onQuickReorder={handleQuickReorder}
            onDeleteOrder={handleDeleteOrderRecord}
            onClearAllHistory={handleClearAllOrderHistory}
            onSaveCategory={handleSaveCategory}
            onDeleteCategory={handleDeleteCategory}
            onReorderCategories={handleReorderCategories}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onToggleProductActive={handleToggleProductActive}
            onEnableAllProducts={handleEnableAllProducts}
            onReorderProducts={handleReorderProducts}
            onImportProductsFromSheets={handleImportProductsFromSheets}
            onSaveSettings={handleSaveSettings}
            onDataReloadNeeded={loadAllData}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Pre-Order Integrity Validation Modal */}
      <CartIntegrityModal
        isOpen={isIntegrityModalOpen}
        issues={integrityIssues}
        orderType={pendingOrderType}
        onClose={() => setIsIntegrityModalOpen(false)}
        onRemoveItem={handleIntegrityRemoveItem}
        onAcceptSingleIssue={handleAcceptSingleIntegrityIssue}
        onAcceptAllAndProceed={handleAcceptAllIntegrityAndProceed}
      />

      {/* Normal Order Review Modal (Version A review & Version B LINE send) */}
      <NormalOrderReviewModal
        isOpen={isNormalReviewOpen}
        onClose={() => setIsNormalReviewOpen(false)}
        groupedSummary={groupedSummary}
        grandTotal={grandTotal}
        settings={settings}
        onOrderConfirmed={handleNormalOrderConfirmed}
        onFinishOrder={clearCurrentOrder}
      />

      {/* Special Drink Order Graphic Modal (NO prices, image generator) */}
      <DrinkOrderModal
        isOpen={isDrinkModalOpen}
        onClose={() => setIsDrinkModalOpen(false)}
        drinkItems={drinkItemsOnly}
        settings={settings}
        onDrinkOrderConfirmed={handleDrinkOrderConfirmed}
        onFinishOrder={clearCurrentOrder}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
}
