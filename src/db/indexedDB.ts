import { Category, Product, AppSettings, OrderHistoryRecord, FullAppBackup, BackupMetadata } from '../types';
export type { FullAppBackup, BackupMetadata };
import { generateSvgPlaceholder } from '../utils/imageUtils';

const DB_NAME = 'tonys_kitchen_db';
const DB_VERSION = 2;

const STORE_CATEGORIES = 'categories';
const STORE_PRODUCTS = 'products';
const STORE_SETTINGS = 'settings';
const STORE_ORDER_HISTORY = 'order_history';

// LocalStorage Fallback keys
const LS_PREFIX = 'tonys_kitchen_';
const LS_CATEGORIES = `${LS_PREFIX}categories`;
const LS_PRODUCTS = `${LS_PREFIX}products`;
const LS_SETTINGS = `${LS_PREFIX}settings`;
const LS_HISTORY = `${LS_PREFIX}order_history`;

export const DEFAULT_SETTINGS: AppSettings = {
  storeName: "Tony's Kitchen",
  branchNote: 'ครัวโทนี่ — สั่งวัตถุดิบประจำวัน',
  logoDataUrl: null,
  currencySymbol: '฿',
  lineSupplierNote: 'กรุณาส่งวัตถุดิบตามรายการด้านล่าง ขอบคุณครับ/ค่ะ',
  updatedAt: Date.now(),
};

export const INITIAL_CATEGORIES: Omit<Category, 'createdAt' | 'updatedAt'>[] = [
  { id: 'cat-veg', name: 'ผักสด', sortOrder: 1, isActive: true, isDrink: false },
  { id: 'cat-meat', name: 'เนื้อสัตว์', sortOrder: 2, isActive: true, isDrink: false },
  { id: 'cat-dry', name: 'วัตถุดิบแห้ง', sortOrder: 3, isActive: true, isDrink: false },
  { id: 'cat-season', name: 'เครื่องปรุง', sortOrder: 4, isActive: true, isDrink: false },
  { id: 'cat-drink', name: 'เครื่องดื่ม', sortOrder: 5, isActive: true, isDrink: true },
  { id: 'cat-other', name: 'อื่นๆ', sortOrder: 6, isActive: true, isDrink: false },
];

export const INITIAL_PRODUCTS: Omit<Product, 'createdAt' | 'updatedAt'>[] = [
  // ผักสด
  { id: 'p-veg-1', categoryId: 'cat-veg', name: 'ใบกะเพรา', image: generateSvgPlaceholder('กะเพรา', '#ECFDF5', '#059669'), unit: 'กก.', price: 60, isActive: true, sortOrder: 1 },
  { id: 'p-veg-2', categoryId: 'cat-veg', name: 'พริกขี้หนูสวน', image: generateSvgPlaceholder('พริก', '#FEF2F2', '#DC2626'), unit: 'กก.', price: 120, isActive: true, sortOrder: 2 },
  { id: 'p-veg-3', categoryId: 'cat-veg', name: 'มะนาวแป้น', image: generateSvgPlaceholder('มะนาว', '#F0FDF4', '#16A34A'), unit: 'กก.', price: 85, isActive: true, sortOrder: 3 },
  { id: 'p-veg-4', categoryId: 'cat-veg', name: 'กระเทียมไทยแกะกลีบ', image: generateSvgPlaceholder('กระเทียม', '#FFFBEB', '#D97706'), unit: 'กก.', price: 95, isActive: true, sortOrder: 4 },
  { id: 'p-veg-5', categoryId: 'cat-veg', name: 'หอมแดงปอก', image: generateSvgPlaceholder('หอมแดง', '#FAF5FF', '#9333EA'), unit: 'กก.', price: 80, isActive: true, sortOrder: 5 },
  { id: 'p-veg-6', categoryId: 'cat-veg', name: 'ผักบุ้งจีน', image: generateSvgPlaceholder('ผักบุ้ง', '#ECFDF5', '#059669'), unit: 'กก.', price: 35, isActive: true, sortOrder: 6 },
  { id: 'p-veg-7', categoryId: 'cat-veg', name: 'ต้นหอม+ผักชี', image: generateSvgPlaceholder('ต้นหอม', '#F0FDF4', '#16A34A'), unit: 'กก.', price: 90, isActive: true, sortOrder: 7 },

  // เนื้อสัตว์
  { id: 'p-meat-1', categoryId: 'cat-meat', name: 'หมูสับ (มัน 20%)', image: generateSvgPlaceholder('หมูสับ', '#FFF1F2', '#E11D48'), unit: 'กก.', price: 130, isActive: true, sortOrder: 1 },
  { id: 'p-meat-2', categoryId: 'cat-meat', name: 'สันคอหมูสไลซ์', image: generateSvgPlaceholder('สันคอ', '#FFF1F2', '#E11D48'), unit: 'กก.', price: 165, isActive: true, sortOrder: 2 },
  { id: 'p-meat-3', categoryId: 'cat-meat', name: 'หมูกรอบพร้อมทอด', image: generateSvgPlaceholder('หมูกรอบ', '#FFFBEB', '#D97706'), unit: 'กก.', price: 280, isActive: true, sortOrder: 3 },
  { id: 'p-meat-4', categoryId: 'cat-meat', name: 'อกไก่ลอกหนัง', image: generateSvgPlaceholder('อกไก่', '#FFF7ED', '#EA580C'), unit: 'กก.', price: 85, isActive: true, sortOrder: 4 },
  { id: 'p-meat-5', categoryId: 'cat-meat', name: 'กุ้งขาวแกะเปลือกไว้หาง', image: generateSvgPlaceholder('กุ้งขาว', '#FFF7ED', '#EA580C'), unit: 'กก.', price: 240, isActive: true, sortOrder: 5 },
  { id: 'p-meat-6', categoryId: 'cat-meat', name: 'ปลาหมึกกล้วยหั่นชิ้น', image: generateSvgPlaceholder('หมึก', '#F0F9FF', '#0284C7'), unit: 'กก.', price: 210, isActive: true, sortOrder: 6 },
  { id: 'p-meat-7', categoryId: 'cat-meat', name: 'ไข่ไก่เบอร์ 2', image: generateSvgPlaceholder('ไข่ไก่', '#FEF3C7', '#D97706'), unit: 'แผง (30ฟอง)', price: 125, isActive: true, sortOrder: 7 },

  // วัตถุดิบแห้ง
  { id: 'p-dry-1', categoryId: 'cat-dry', name: 'ข้าวหอมมะลิแท้ 100%', image: generateSvgPlaceholder('ข้าว', '#F8FAFC', '#475569'), unit: 'กระสอบ (50กก.)', price: 1650, isActive: true, sortOrder: 1 },
  { id: 'p-dry-2', categoryId: 'cat-dry', name: 'เส้นใหญ่ก๋วยเตี๋ยว', image: generateSvgPlaceholder('เส้นใหญ่', '#F8FAFC', '#64748B'), unit: 'กก.', price: 28, isActive: true, sortOrder: 2 },
  { id: 'p-dry-3', categoryId: 'cat-dry', name: 'วุ้นเส้นสด ตรามังกร', image: generateSvgPlaceholder('วุ้นเส้น', '#F8FAFC', '#64748B'), unit: 'กก.', price: 45, isActive: true, sortOrder: 3 },
  { id: 'p-dry-4', categoryId: 'cat-dry', name: 'แป้งทอดกรอบ', image: generateSvgPlaceholder('แป้ง', '#FFFBEB', '#D97706'), unit: 'ถุง (1กก.)', price: 42, isActive: true, sortOrder: 4 },

  // เครื่องปรุง
  { id: 'p-season-1', categoryId: 'cat-season', name: 'น้ำมันพืชปาล์ม', image: generateSvgPlaceholder('น้ำมัน', '#FEF3C7', '#CA8A04'), unit: 'ปี๊บ (13.75ลิตร)', price: 620, isActive: true, sortOrder: 1 },
  { id: 'p-season-2', categoryId: 'cat-season', name: 'ซอสหอยนางรมตราแม่ครัว', image: generateSvgPlaceholder('ซอสหอย', '#F1F5F9', '#334155'), unit: 'แกลลอน (4.5กก.)', price: 195, isActive: true, sortOrder: 2 },
  { id: 'p-season-3', categoryId: 'cat-season', name: 'น้ำปลาแท้ทิพรส', image: generateSvgPlaceholder('น้ำปลา', '#FFF7ED', '#C2410C'), unit: 'ขวดใหญ่', price: 34, isActive: true, sortOrder: 3 },
  { id: 'p-season-4', categoryId: 'cat-season', name: 'ซีอิ๊วดำหวานตราง่วนเชียง', image: generateSvgPlaceholder('ซีอิ๊วดำ', '#1E293B', '#F8FAFC'), unit: 'ขวด', price: 45, isActive: true, sortOrder: 4 },
  { id: 'p-season-5', categoryId: 'cat-season', name: 'น้ำตาลทรายขาวมิตรผล', image: generateSvgPlaceholder('น้ำตาล', '#F8FAFC', '#64748B'), unit: 'ถุง (1กก.)', price: 28, isActive: true, sortOrder: 5 },
  { id: 'p-season-6', categoryId: 'cat-season', name: 'ผงปรุงรสหมูรสดี', image: generateSvgPlaceholder('รสดี', '#FEF2F2', '#DC2626'), unit: 'ถุง (850กรัม)', price: 95, isActive: true, sortOrder: 6 },

  // เครื่องดื่ม (Beverages)
  { id: 'p-drink-1', categoryId: 'cat-drink', name: 'โค้ก ออริจินัล (กระป๋อง 325ml)', image: generateSvgPlaceholder('Coke', '#FEF2F2', '#E11D48'), unit: 'ถาด (24กระป๋อง)', price: 340, isActive: true, sortOrder: 1 },
  { id: 'p-drink-2', categoryId: 'cat-drink', name: 'โค้ก ไม่มีน้ำตาล (Zero)', image: generateSvgPlaceholder('Zero', '#18181B', '#FAFAFA'), unit: 'ถาด (24กระป๋อง)', price: 340, isActive: true, sortOrder: 2 },
  { id: 'p-drink-3', categoryId: 'cat-drink', name: 'น้ำดื่มสิงห์ (ขวด 600ml)', image: generateSvgPlaceholder('น้ำดื่ม', '#EFF6FF', '#2563EB'), unit: 'แพ็ค (12ขวด)', price: 65, isActive: true, sortOrder: 3 },
  { id: 'p-drink-4', categoryId: 'cat-drink', name: 'ชาเขียวโออิชิ รสต้นตำรับ', image: generateSvgPlaceholder('ชาเขียว', '#F0FDF4', '#16A34A'), unit: 'ลัง (24ขวด)', price: 360, isActive: true, sortOrder: 4 },
  { id: 'p-drink-5', categoryId: 'cat-drink', name: 'สไปรท์ ไม่มีน้ำตาล', image: generateSvgPlaceholder('Sprite', '#ECFDF5', '#059669'), unit: 'ถาด (24กระป๋อง)', price: 340, isActive: true, sortOrder: 5 },
  { id: 'p-drink-6', categoryId: 'cat-drink', name: 'โซดาสิงห์', image: generateSvgPlaceholder('โซดา', '#F8FAFC', '#0284C7'), unit: 'ถาด (24ขวด)', price: 210, isActive: true, sortOrder: 6 },
  { id: 'p-drink-7', categoryId: 'cat-drink', name: 'น้ำแข็งหลอดยูนิต', image: generateSvgPlaceholder('น้ำแข็ง', '#F0F9FF', '#0284C7'), unit: 'กระสอบ (20กก.)', price: 60, isActive: true, sortOrder: 7 },

  // อื่นๆ
  { id: 'p-other-1', categoryId: 'cat-other', name: 'กล่องอาหารกระดาษคราฟท์ 750ml', image: generateSvgPlaceholder('กล่อง', '#FEF3C7', '#B45309'), unit: 'แพ็ค (50ใบ)', price: 135, isActive: true, sortOrder: 1 },
  { id: 'p-other-2', categoryId: 'cat-other', name: 'ถุงหิ้วพลาสติกใส 6x14', image: generateSvgPlaceholder('ถุงหิ้ว', '#F1F5F9', '#475569'), unit: 'แพ็ค (100ใบ)', price: 38, isActive: true, sortOrder: 2 },
  { id: 'p-other-3', categoryId: 'cat-other', name: 'กระดาษทิชชู่เช็ดโต๊ะ', image: generateSvgPlaceholder('ทิชชู่', '#F8FAFC', '#64748B'), unit: 'แพ็ค (6ม้วน)', price: 75, isActive: true, sortOrder: 3 },
  { id: 'p-other-4', categoryId: 'cat-other', name: 'น้ำยาล้างจาน ซันไลต์', image: generateSvgPlaceholder('ซันไลต์', '#FEF9C3', '#CA8A04'), unit: 'แกลลอน (3.6ลิตร)', price: 145, isActive: true, sortOrder: 4 },
];

let dbInstance: IDBDatabase | null = null;
let isIndexedDBAvailable: boolean | null = null;

// Test if IndexedDB is available and functioning
function checkIndexedDBSupport(): boolean {
  if (isIndexedDBAvailable !== null) return isIndexedDBAvailable;
  try {
    if (typeof window === 'undefined' || !window.indexedDB) {
      isIndexedDBAvailable = false;
      return false;
    }
    isIndexedDBAvailable = true;
    return true;
  } catch {
    isIndexedDBAvailable = false;
    return false;
  }
}

// LocalStorage helpers for resilient fallback
function getLSItem<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setLSItem<T>(key: string, value: T): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Ignore storage quota errors in fallback
  }
}

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (!checkIndexedDBSupport()) {
    return Promise.reject(new Error('IndexedDB is not supported or accessible in this environment'));
  }

  return new Promise((resolve, reject) => {
    let isSettled = false;
    // Timeout fallback: if IndexedDB hangs or is locked by another process/tab, fail fast to LocalStorage
    const timeoutId = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        console.warn('IndexedDB open timed out after 1800ms, falling back to LocalStorage');
        reject(new Error('IndexedDB open timeout'));
      }
    }, 1800);

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          const errMsg = request.error?.message || 'IndexedDB failed to open';
          reject(new Error(errMsg));
        }
      };

      request.onblocked = () => {
        console.warn('IndexedDB database upgrade was blocked');
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          reject(new Error('IndexedDB upgrade blocked by another connection'));
        }
      };

      request.onsuccess = () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          const db = request.result;
          dbInstance = db;

          db.onversionchange = () => {
            db.close();
            dbInstance = null;
          };

          db.onclose = () => {
            dbInstance = null;
          };

          resolve(db);
        }
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
          const catStore = db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
          catStore.createIndex('sortOrder', 'sortOrder', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
          const prodStore = db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
          prodStore.createIndex('categoryId', 'categoryId', { unique: false });
          prodStore.createIndex('sortOrder', 'sortOrder', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains(STORE_ORDER_HISTORY)) {
          const historyStore = db.createObjectStore(STORE_ORDER_HISTORY, { keyPath: 'id' });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    } catch (err: any) {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timeoutId);
        reject(new Error(err?.message || 'Exception opening IndexedDB'));
      }
    }
  });
}

/**
 * Initialize DB with seed categories and products if empty
 */
export async function initializeDatabase(): Promise<void> {
  const now = Date.now();

  try {
    const db = await openDB();

    // Check if stores exist before querying
    if (
      !db.objectStoreNames.contains(STORE_CATEGORIES) ||
      !db.objectStoreNames.contains(STORE_PRODUCTS) ||
      !db.objectStoreNames.contains(STORE_SETTINGS)
    ) {
      db.close();
      dbInstance = null;
      throw new Error('Object stores are missing, fallback to localStorage');
    }

    const categories = await getAllFromStore<Category>(db, STORE_CATEGORIES);
    if (categories.length === 0) {
      const tx = db.transaction([STORE_CATEGORIES, STORE_PRODUCTS, STORE_SETTINGS], 'readwrite');
      const catStore = tx.objectStore(STORE_CATEGORIES);
      const prodStore = tx.objectStore(STORE_PRODUCTS);
      const settingsStore = tx.objectStore(STORE_SETTINGS);

      // Add categories
      for (const cat of INITIAL_CATEGORIES) {
        catStore.put({
          ...cat,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Add seed products
      for (const prod of INITIAL_PRODUCTS) {
        prodStore.put({
          ...prod,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Add default settings
      settingsStore.put({
        key: 'app_settings',
        ...DEFAULT_SETTINGS,
      });

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error(tx.error?.message || 'Transaction error on seed'));
        tx.onabort = () => reject(new Error('Transaction aborted on seed'));
      });
    }

    // Mirror to LocalStorage as backup
    const loadedCats = await getAllFromStore<Category>(db, STORE_CATEGORIES);
    const loadedProds = await getAllFromStore<Product>(db, STORE_PRODUCTS);
    setLSItem(LS_CATEGORIES, loadedCats);
    setLSItem(LS_PRODUCTS, loadedProds);
  } catch (err) {
    console.warn('IndexedDB initialization failed, utilizing LocalStorage fallback:', err);
    // Initialize LocalStorage with seed data if empty
    const lsCats = getLSItem<Category[]>(LS_CATEGORIES, []);
    if (lsCats.length === 0) {
      const initialCats: Category[] = INITIAL_CATEGORIES.map((c) => ({
        ...c,
        createdAt: now,
        updatedAt: now,
      }));
      const initialProds: Product[] = INITIAL_PRODUCTS.map((p) => ({
        ...p,
        createdAt: now,
        updatedAt: now,
      }));
      setLSItem(LS_CATEGORIES, initialCats);
      setLSItem(LS_PRODUCTS, initialProds);
      setLSItem(LS_SETTINGS, DEFAULT_SETTINGS);
    }
  }
}

// Generic Store helpers with error isolation
function getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    try {
      if (!db.objectStoreNames.contains(storeName)) {
        return resolve([]);
      }
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(request.error?.message || 'Failed to get records'));
    } catch (err: any) {
      reject(new Error(err?.message || 'Exception during getAll'));
    }
  });
}

// ---------------- CATEGORY CRUD ---------------- //

export async function getCategories(): Promise<Category[]> {
  try {
    const db = await openDB();
    const list = await getAllFromStore<Category>(db, STORE_CATEGORIES);
    if (list.length > 0) {
      const sorted = list.sort((a, b) => a.sortOrder - b.sortOrder);
      setLSItem(LS_CATEGORIES, sorted);
      return sorted;
    }
  } catch {
    // Fallback to LocalStorage
  }

  const fallback = getLSItem<Category[]>(LS_CATEGORIES, []);
  if (fallback.length > 0) {
    return fallback.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const defaultCats: Category[] = INITIAL_CATEGORIES.map((c) => ({
    ...c,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));
  setLSItem(LS_CATEGORIES, defaultCats);
  return defaultCats;
}

export async function saveCategory(category: Partial<Category> & { name: string }): Promise<Category> {
  const existingList = await getCategories();
  const existing = category.id ? existingList.find((c) => c.id === category.id) : null;
  const now = Date.now();

  const toSave: Category = {
    id: category.id || `cat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    name: category.name.trim(),
    sortOrder: category.sortOrder ?? (existing ? existing.sortOrder : existingList.length + 1),
    isActive: category.isActive !== undefined ? category.isActive : true,
    isDrink: category.isDrink !== undefined ? category.isDrink : category.name.trim().includes('เครื่องดื่ม'),
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };

  // 1. Update LocalStorage
  const updatedList = existing
    ? existingList.map((c) => (c.id === toSave.id ? toSave : c))
    : [...existingList, toSave];
  setLSItem(LS_CATEGORIES, updatedList);

  // 2. Try updating IndexedDB
  try {
    const db = await openDB();
    if (db.objectStoreNames.contains(STORE_CATEGORIES)) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
        const store = tx.objectStore(STORE_CATEGORIES);
        const req = store.put(toSave);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(new Error(req.error?.message || 'Failed to save category'));
      });
    }
  } catch (err) {
    console.warn('Saved category to LocalStorage fallback due to IndexedDB error:', err);
  }

  return toSave;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const all = await getCategories();
  return all.find((c) => c.id === id) || null;
}

export async function deleteCategory(id: string): Promise<void> {
  // 1. Atomic IndexedDB readwrite transaction across both STORE_CATEGORIES and STORE_PRODUCTS
  try {
    const db = await openDB();
    if (db.objectStoreNames.contains(STORE_CATEGORIES) && db.objectStoreNames.contains(STORE_PRODUCTS)) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_CATEGORIES, STORE_PRODUCTS], 'readwrite');
        const catStore = tx.objectStore(STORE_CATEGORIES);
        const prodStore = tx.objectStore(STORE_PRODUCTS);

        // Delete category
        catStore.delete(id);

        // Delete all products in this category
        const prodIndex = prodStore.index('categoryId');
        const req = prodIndex.getAll(id);
        req.onsuccess = () => {
          const prods = req.result as Product[];
          for (const p of prods) {
            prodStore.delete(p.id);
          }
        };
        req.onerror = () => {
          tx.abort();
          reject(new Error(req.error?.message || 'Failed to query products for category deletion'));
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error(tx.error?.message || 'Failed to atomically delete category and products'));
        tx.onabort = () => reject(new Error('Transaction aborted'));
      });
    }
  } catch (err) {
    console.warn('Deleted category in LocalStorage fallback due to IndexedDB error:', err);
  }

  // 2. Synchronize LocalStorage cache
  const allCats = getLSItem<Category[]>(LS_CATEGORIES, []);
  setLSItem(LS_CATEGORIES, allCats.filter((c) => c.id !== id));

  const allProds = getLSItem<Product[]>(LS_PRODUCTS, []);
  setLSItem(LS_PRODUCTS, allProds.filter((p) => p.categoryId !== id));
}

export async function reorderCategories(categories: Category[]): Promise<void> {
  const now = Date.now();
  const updated = categories.map((cat, index) => ({
    ...cat,
    sortOrder: index + 1,
    updatedAt: now,
  }));

  setLSItem(LS_CATEGORIES, updated);

  try {
    const db = await openDB();
    if (db.objectStoreNames.contains(STORE_CATEGORIES)) {
      const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
      const store = tx.objectStore(STORE_CATEGORIES);
      updated.forEach((cat) => store.put(cat));
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error(tx.error?.message || 'Failed to reorder categories'));
      });
    }
  } catch (err) {
    console.warn('Reordered categories in LocalStorage fallback:', err);
  }
}

// ---------------- PRODUCT CRUD ---------------- //

export async function getProducts(): Promise<Product[]> {
  try {
    const db = await openDB();
    const list = await getAllFromStore<Product>(db, STORE_PRODUCTS);
    if (list.length > 0) {
      const sorted = list.sort((a, b) => {
        const sortA = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const sortB = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        if (sortA !== sortB) return sortA - sortB;
        return a.name.localeCompare(b.name, ['th-TH', 'en'], {
          numeric: true,
          sensitivity: 'base',
        });
      });
      setLSItem(LS_PRODUCTS, sorted);
      return sorted;
    }
  } catch {
    // Fallback
  }

  const fallback = getLSItem<Product[]>(LS_PRODUCTS, []);
  if (fallback.length > 0) {
    return fallback.sort((a, b) => {
      const sortA = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
      const sortB = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
      if (sortA !== sortB) return sortA - sortB;
      return a.name.localeCompare(b.name, ['th-TH', 'en'], {
        numeric: true,
        sensitivity: 'base',
      });
    });
  }

  const defaultProds: Product[] = INITIAL_PRODUCTS.map((p) => ({
    ...p,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));
  setLSItem(LS_PRODUCTS, defaultProds);
  return defaultProds;
}

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  const all = await getProducts();
  return all.filter((p) => p.categoryId === categoryId);
}

export async function saveProduct(product: Partial<Product> & { name: string; categoryId: string }): Promise<Product> {
  const existingList = await getProducts();
  const existing = product.id ? existingList.find((p) => p.id === product.id) : null;
  const now = Date.now();

  let sortOrder = product.sortOrder;
  if (sortOrder === undefined) {
    if (existing && existing.categoryId === product.categoryId) {
      sortOrder = typeof existing.sortOrder === 'number' ? existing.sortOrder : 1;
    } else {
      // New product or moved category -> append to the end of the category
      const prodsInTargetCat = existingList.filter((p) => p.categoryId === product.categoryId && p.id !== product.id);
      const maxSort = prodsInTargetCat.reduce((max, p) => Math.max(max, typeof p.sortOrder === 'number' ? p.sortOrder : 0), 0);
      sortOrder = maxSort + 1;
    }
  }

  const toSave: Product = {
    id: product.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    categoryId: product.categoryId,
    name: product.name.trim(),
    productCode: product.productCode !== undefined ? (product.productCode.trim() || undefined) : existing?.productCode,
    image: product.image !== undefined ? product.image : (existing?.image || generateSvgPlaceholder(product.name)),
    unit: product.unit?.trim() || 'กก.',
    price: typeof product.price === 'number' ? Math.max(0, product.price) : 0,
    isActive: product.isActive !== undefined ? product.isActive : true,
    sortOrder,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };

  // 1. LocalStorage
  const updatedList = existing
    ? existingList.map((p) => (p.id === toSave.id ? toSave : p))
    : [...existingList, toSave];
  setLSItem(LS_PRODUCTS, updatedList);

  // 2. IndexedDB
  try {
    const db = await openDB();
    if (db.objectStoreNames.contains(STORE_PRODUCTS)) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
        const store = tx.objectStore(STORE_PRODUCTS);
        const req = store.put(toSave);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(new Error(req.error?.message || 'Failed to save product'));
      });
    }
  } catch (err) {
    console.warn('Saved product to LocalStorage fallback:', err);
  }

  return toSave;
}

export async function reorderProducts(orderedProductsInCat: Product[]): Promise<Product[]> {
  const now = Date.now();
  if (!orderedProductsInCat || orderedProductsInCat.length === 0) {
    return await getProducts();
  }

  const allProducts = await getProducts();
  const updatedInCat = orderedProductsInCat.map((p, index) => ({
    ...p,
    sortOrder: index + 1,
    updatedAt: now,
  }));
  const updatedMap = new Map(updatedInCat.map((p) => [p.id, p]));
  const updatedAllList = allProducts.map((p) => updatedMap.get(p.id) || p);

  // 1. LocalStorage
  setLSItem(LS_PRODUCTS, updatedAllList);

  // 2. IndexedDB Transaction
  try {
    const db = await openDB();
    if (db.objectStoreNames.contains(STORE_PRODUCTS)) {
      const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
      const store = tx.objectStore(STORE_PRODUCTS);
      updatedInCat.forEach((prod) => store.put(prod));
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error(tx.error?.message || 'Failed to reorder products'));
        tx.onabort = () => reject(new Error('Transaction aborted'));
      });
    }
  } catch (err) {
    console.warn('Reordered products in LocalStorage fallback:', err);
  }

  return updatedAllList;
}

export async function getProductById(id: string): Promise<Product | null> {
  const all = await getProducts();
  return all.find((p) => p.id === id) || null;
}

export async function deleteProduct(id: string): Promise<void> {
  // 1. LocalStorage
  const all = await getProducts();
  setLSItem(LS_PRODUCTS, all.filter((p) => p.id !== id));

  // 2. IndexedDB
  try {
    const db = await openDB();
    if (db.objectStoreNames.contains(STORE_PRODUCTS)) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
        const store = tx.objectStore(STORE_PRODUCTS);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(new Error(req.error?.message || 'Failed to delete product'));
      });
    }
  } catch (err) {
    console.warn('Deleted product from LocalStorage fallback:', err);
  }
}

export async function updateProductPrice(id: string, price: number): Promise<void> {
  const prod = await getProductById(id);
  if (prod) {
    prod.price = Math.max(0, price);
    prod.updatedAt = Date.now();
    await saveProduct(prod);
  }
}

export async function toggleProductActive(id: string): Promise<boolean> {
  const prod = await getProductById(id);
  if (prod) {
    prod.isActive = !prod.isActive;
    prod.updatedAt = Date.now();
    await saveProduct(prod);
    return prod.isActive;
  }
  return false;
}

export async function enableAllProducts(): Promise<Product[]> {
  const allProducts = await getProducts();
  const now = Date.now();
  const updatedAll = allProducts.map((p) => ({
    ...p,
    isActive: true,
    updatedAt: now,
  }));

  // 1. LocalStorage
  setLSItem(LS_PRODUCTS, updatedAll);

  // 2. IndexedDB
  try {
    const db = await openDB();
    if (db.objectStoreNames.contains(STORE_PRODUCTS)) {
      const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
      const store = tx.objectStore(STORE_PRODUCTS);
      updatedAll.forEach((prod) => store.put(prod));
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error(tx.error?.message || 'Failed to enable all products in IndexedDB'));
        tx.onabort = () => reject(new Error('Transaction aborted'));
      });
    }
  } catch (err) {
    console.warn('Enabled all products in LocalStorage fallback:', err);
  }

  return updatedAll;
}

// ---------------- SETTINGS ---------------- //

export async function getSettings(): Promise<AppSettings> {
  try {
    const db = await openDB();
    if (db.objectStoreNames.contains(STORE_SETTINGS)) {
      const res = await new Promise<AppSettings | null>((resolve) => {
        const tx = db.transaction(STORE_SETTINGS, 'readonly');
        const store = tx.objectStore(STORE_SETTINGS);
        const req = store.get('app_settings');
        req.onsuccess = () => {
          if (req.result) {
            resolve({
              storeName: req.result.storeName || DEFAULT_SETTINGS.storeName,
              branchNote: req.result.branchNote || DEFAULT_SETTINGS.branchNote,
              logoDataUrl: req.result.logoDataUrl || null,
              currencySymbol: req.result.currencySymbol || '฿',
              lineSupplierNote: req.result.lineSupplierNote || DEFAULT_SETTINGS.lineSupplierNote,
              updatedAt: req.result.updatedAt || Date.now(),
            });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });

      if (res) {
        setLSItem(LS_SETTINGS, res);
        return res;
      }
    }
  } catch {
    // Fallback
  }

  const fallback = getLSItem<AppSettings>(LS_SETTINGS, DEFAULT_SETTINGS);
  return fallback;
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated: AppSettings = {
    ...current,
    ...settings,
    updatedAt: Date.now(),
  };

  setLSItem(LS_SETTINGS, updated);

  try {
    const db = await openDB();
    if (db.objectStoreNames.contains(STORE_SETTINGS)) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SETTINGS, 'readwrite');
        const store = tx.objectStore(STORE_SETTINGS);
        const req = store.put({ key: 'app_settings', ...updated });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(new Error(req.error?.message || 'Failed to save settings'));
      });
    }
  } catch (err) {
    console.warn('Saved settings to LocalStorage fallback:', err);
  }

  return updated;
}

// ---------------- ORDER HISTORY ---------------- //

export async function saveOrderRecord(record: Omit<OrderHistoryRecord, 'id' | 'timestamp'>): Promise<OrderHistoryRecord> {
  const fullRecord: OrderHistoryRecord = {
    ...record,
    id: `ord-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: Date.now(),
  };

  // LocalStorage
  const history = getLSItem<OrderHistoryRecord[]>(LS_HISTORY, []);
  const updatedHistory = [fullRecord, ...history].slice(0, 100);
  setLSItem(LS_HISTORY, updatedHistory);

  // IndexedDB
  try {
    const db = await openDB();
    if (db.objectStoreNames.contains(STORE_ORDER_HISTORY)) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_ORDER_HISTORY, 'readwrite');
        const store = tx.objectStore(STORE_ORDER_HISTORY);
        const req = store.put(fullRecord);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(new Error(req.error?.message || 'Failed to save order record'));
      });
    }
  } catch (err) {
    console.warn('Saved order record to LocalStorage fallback:', err);
  }

  return fullRecord;
}

export async function getOrderHistory(limit = 100): Promise<OrderHistoryRecord[]> {
  try {
    const db = await openDB();
    if (db.objectStoreNames.contains(STORE_ORDER_HISTORY)) {
      const records = await getAllFromStore<OrderHistoryRecord>(db, STORE_ORDER_HISTORY);
      if (records.length > 0) {
        const sorted = records.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
        setLSItem(LS_HISTORY, sorted);
        return sorted;
      }
    }
  } catch {
    // Fallback
  }

  const fallback = getLSItem<OrderHistoryRecord[]>(LS_HISTORY, []);
  return fallback.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

export async function deleteOrderRecord(id: string): Promise<void> {
  const current = getLSItem<OrderHistoryRecord[]>(LS_HISTORY, []);
  setLSItem(LS_HISTORY, current.filter((r) => r.id !== id));

  try {
    const db = await openDB();
    if (db.objectStoreNames.contains(STORE_ORDER_HISTORY)) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_ORDER_HISTORY, 'readwrite');
        const store = tx.objectStore(STORE_ORDER_HISTORY);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(new Error(req.error?.message || 'Failed to delete order record'));
      });
    }
  } catch (err) {
    console.warn('Deleted order record in LocalStorage fallback:', err);
  }
}

export async function clearOrderHistory(): Promise<void> {
  setLSItem(LS_HISTORY, []);

  try {
    const db = await openDB();
    if (db.objectStoreNames.contains(STORE_ORDER_HISTORY)) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_ORDER_HISTORY, 'readwrite');
        const store = tx.objectStore(STORE_ORDER_HISTORY);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(new Error(req.error?.message || 'Failed to clear order history'));
      });
    }
  } catch (err) {
    console.warn('Cleared order history in LocalStorage fallback:', err);
  }
}

// ---------------- BACKUP & RESTORE ---------------- //

export const CURRENT_BACKUP_FORMAT_VERSION = 1;
export const CURRENT_SCHEMA_VERSION = '1.0.0';
export const APP_IDENTIFIER = "Tony's Kitchen — Ingredient Order";

export interface BackupSummaryStats {
  formatVersion: number;
  application: string;
  backupCreatedAt: string | null;
  deviceLabel?: string;
  categoriesCount: number;
  productsCount: number;
  imageCount: number;
  orderHistoryCount: number;
  hasSettings: boolean;
  isLegacy: boolean;
}

export function generateBackupFileName(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `TONYS-KITCHEN-BACKUP-${year}-${month}-${day}-${hours}${minutes}.json`;
}

export async function exportAllData(deviceLabel?: string): Promise<FullAppBackup> {
  const categories = await getCategories();
  const products = await getProducts();
  const settings = await getSettings();
  const orderHistory = await getOrderHistory(500);
  const nowIso = new Date().toISOString();

  return {
    backupMetadata: {
      formatVersion: CURRENT_BACKUP_FORMAT_VERSION,
      application: APP_IDENTIFIER,
      backupCreatedAt: nowIso,
      deviceLabel: deviceLabel?.trim() || undefined,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    },
    version: CURRENT_SCHEMA_VERSION,
    app: APP_IDENTIFIER,
    exportedAt: nowIso,
    categories,
    products,
    settings,
    orderHistory,
  };
}

export function parseAndValidateBackup(raw: any): { backupData: FullAppBackup; stats: BackupSummaryStats } {
  if (!raw || typeof raw !== 'object') {
    throw new Error('ไฟล์สำรองไม่ถูกต้อง ไม่สามารถกู้คืนข้อมูลได้');
  }

  // 1. Check metadata format version compatibility if present
  let formatVersion = 1;
  let deviceLabel: string | undefined;
  let backupCreatedAt: string | null = null;
  let isLegacy = true;

  if (raw.backupMetadata && typeof raw.backupMetadata === 'object') {
    isLegacy = false;
    const meta = raw.backupMetadata;
    if (typeof meta.formatVersion === 'number') {
      formatVersion = meta.formatVersion;
      if (formatVersion > CURRENT_BACKUP_FORMAT_VERSION) {
        throw new Error('ไฟล์สำรองมาจากเวอร์ชันที่ใหม่กว่า ไม่สามารถกู้คืนด้วย App เวอร์ชันนี้ได้');
      }
    }
    if (typeof meta.deviceLabel === 'string' && meta.deviceLabel.trim()) {
      deviceLabel = meta.deviceLabel.trim();
    }
    if (typeof meta.backupCreatedAt === 'string') {
      backupCreatedAt = meta.backupCreatedAt;
    }
  }

  if (!backupCreatedAt && typeof raw.exportedAt === 'string') {
    backupCreatedAt = raw.exportedAt;
  }

  // 2. Validate categories
  if (!Array.isArray(raw.categories)) {
    throw new Error('ไฟล์สำรองไม่ถูกต้อง ไม่สามารถกู้คืนข้อมูลได้');
  }
  for (const cat of raw.categories) {
    if (!cat || typeof cat !== 'object' || typeof cat.id !== 'string' || typeof cat.name !== 'string') {
      throw new Error('ไฟล์สำรองไม่ถูกต้อง ไม่สามารถกู้คืนข้อมูลได้');
    }
  }

  // 3. Validate products
  if (!Array.isArray(raw.products)) {
    throw new Error('ไฟล์สำรองไม่ถูกต้อง ไม่สามารถกู้คืนข้อมูลได้');
  }
  let imageCount = 0;
  for (const prod of raw.products) {
    if (
      !prod ||
      typeof prod !== 'object' ||
      typeof prod.id !== 'string' ||
      typeof prod.name !== 'string' ||
      typeof prod.categoryId !== 'string'
    ) {
      throw new Error('ไฟล์สำรองไม่ถูกต้อง ไม่สามารถกู้คืนข้อมูลได้');
    }
    if (typeof prod.image === 'string' && prod.image.trim().length > 0) {
      imageCount++;
    }
  }

  // 4. Sanitize / handle settings & order history
  const categories: Category[] = raw.categories.map((c: any, idx: number) => ({
    id: String(c.id),
    name: String(c.name).trim(),
    sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : idx,
    isActive: c.isActive !== false,
    isDrink: Boolean(c.isDrink),
    createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
    updatedAt: typeof c.updatedAt === 'number' ? c.updatedAt : Date.now(),
  }));

  const products: Product[] = raw.products.map((p: any, idx: number) => ({
    id: String(p.id),
    categoryId: String(p.categoryId),
    name: String(p.name).trim(),
    productCode: typeof p.productCode === 'string' && p.productCode.trim() ? p.productCode.trim() : undefined,
    image: typeof p.image === 'string' ? p.image : '',
    unit: typeof p.unit === 'string' ? p.unit : 'หน่วย',
    price: typeof p.price === 'number' && !isNaN(p.price) ? p.price : 0,
    isActive: p.isActive !== false,
    sortOrder: typeof p.sortOrder === 'number' ? p.sortOrder : idx,
    createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
  }));

  let settings: AppSettings | undefined = undefined;
  let hasSettings = false;
  if (raw.settings && typeof raw.settings === 'object') {
    hasSettings = Boolean(raw.settings.storeName || raw.settings.logoDataUrl || raw.settings.branchNote);
    settings = {
      storeName: typeof raw.settings.storeName === 'string' ? raw.settings.storeName : DEFAULT_SETTINGS.storeName,
      branchNote: typeof raw.settings.branchNote === 'string' ? raw.settings.branchNote : DEFAULT_SETTINGS.branchNote,
      logoDataUrl: typeof raw.settings.logoDataUrl === 'string' ? raw.settings.logoDataUrl : null,
      currencySymbol: typeof raw.settings.currencySymbol === 'string' ? raw.settings.currencySymbol : '฿',
      lineSupplierNote: typeof raw.settings.lineSupplierNote === 'string' ? raw.settings.lineSupplierNote : '',
      updatedAt: typeof raw.settings.updatedAt === 'number' ? raw.settings.updatedAt : Date.now(),
    };
  }

  let orderHistory: OrderHistoryRecord[] = [];
  if (Array.isArray(raw.orderHistory)) {
    orderHistory = raw.orderHistory.filter((h: any) => h && typeof h === 'object' && typeof h.id === 'string');
  }

  const cleanBackup: FullAppBackup = {
    backupMetadata: raw.backupMetadata || {
      formatVersion: 1,
      application: APP_IDENTIFIER,
      backupCreatedAt: backupCreatedAt || new Date().toISOString(),
      deviceLabel,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    },
    version: raw.version || CURRENT_SCHEMA_VERSION,
    app: raw.app || APP_IDENTIFIER,
    exportedAt: backupCreatedAt || new Date().toISOString(),
    categories,
    products,
    settings,
    orderHistory,
  };

  const stats: BackupSummaryStats = {
    formatVersion,
    application: APP_IDENTIFIER,
    backupCreatedAt,
    deviceLabel,
    categoriesCount: categories.length,
    productsCount: products.length,
    imageCount,
    orderHistoryCount: orderHistory.length,
    hasSettings,
    isLegacy,
  };

  return { backupData: cleanBackup, stats };
}

export async function importAllData(backupData: FullAppBackup): Promise<{
  success: boolean;
  message: string;
  stats: BackupSummaryStats;
}> {
  // 1. Strict Schema Validation before touching any storage
  const { backupData: validatedData, stats } = parseAndValidateBackup(backupData);

  // 2. Perform atomic transactional write to IndexedDB first
  try {
    const db = await openDB();
    const stores = [STORE_CATEGORIES, STORE_PRODUCTS, STORE_SETTINGS, STORE_ORDER_HISTORY].filter((s) =>
      db.objectStoreNames.contains(s)
    );

    if (stores.length > 0) {
      const tx = db.transaction(stores, 'readwrite');
      if (stores.includes(STORE_CATEGORIES)) {
        const catStore = tx.objectStore(STORE_CATEGORIES);
        catStore.clear();
        validatedData.categories.forEach((c) => catStore.put(c));
      }
      if (stores.includes(STORE_PRODUCTS)) {
        const prodStore = tx.objectStore(STORE_PRODUCTS);
        prodStore.clear();
        validatedData.products.forEach((p) => prodStore.put(p));
      }
      if (stores.includes(STORE_SETTINGS) && validatedData.settings) {
        const settingsStore = tx.objectStore(STORE_SETTINGS);
        settingsStore.clear();
        settingsStore.put({ key: 'app_settings', ...validatedData.settings });
      }
      if (stores.includes(STORE_ORDER_HISTORY)) {
        const historyStore = tx.objectStore(STORE_ORDER_HISTORY);
        historyStore.clear();
        (validatedData.orderHistory || []).forEach((h) => historyStore.put(h));
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error(tx.error?.message || 'Import transaction failed'));
      });
    }
  } catch (err: any) {
    console.error('IndexedDB restore transaction failed:', err);
    throw new Error('เกิดข้อผิดพลาดในการกู้คืนข้อมูล (ข้อมูลเดิมในเครื่องยังปลอดภัย)');
  }

  // 3. Update LocalStorage cache ONLY after IndexedDB transaction successfully commits
  setLSItem(LS_CATEGORIES, validatedData.categories);
  setLSItem(LS_PRODUCTS, validatedData.products);
  if (validatedData.settings && typeof validatedData.settings === 'object') {
    setLSItem(LS_SETTINGS, validatedData.settings);
  }
  setLSItem(LS_HISTORY, validatedData.orderHistory || []);

  return {
    success: true,
    message: `กู้คืนข้อมูลสำเร็จ: ${stats.categoriesCount} หมวดหมู่, ${stats.productsCount} รายการสินค้า`,
    stats,
  };
}

export async function resetToFactoryDefaults(): Promise<void> {
  const now = Date.now();
  const defaultCats: Category[] = INITIAL_CATEGORIES.map((c) => ({ ...c, createdAt: now, updatedAt: now }));
  const defaultProds: Product[] = INITIAL_PRODUCTS.map((p) => ({ ...p, createdAt: now, updatedAt: now }));

  // LocalStorage
  setLSItem(LS_CATEGORIES, defaultCats);
  setLSItem(LS_PRODUCTS, defaultProds);
  setLSItem(LS_SETTINGS, DEFAULT_SETTINGS);
  setLSItem(LS_HISTORY, []);

  // IndexedDB
  try {
    const db = await openDB();
    const stores = [STORE_CATEGORIES, STORE_PRODUCTS, STORE_SETTINGS, STORE_ORDER_HISTORY].filter((s) =>
      db.objectStoreNames.contains(s)
    );

    if (stores.length > 0) {
      const tx = db.transaction(stores, 'readwrite');
      if (stores.includes(STORE_CATEGORIES)) {
        const catStore = tx.objectStore(STORE_CATEGORIES);
        catStore.clear();
        defaultCats.forEach((c) => catStore.add(c));
      }
      if (stores.includes(STORE_PRODUCTS)) {
        const prodStore = tx.objectStore(STORE_PRODUCTS);
        prodStore.clear();
        defaultProds.forEach((p) => prodStore.add(p));
      }
      if (stores.includes(STORE_SETTINGS)) {
        const settingsStore = tx.objectStore(STORE_SETTINGS);
        settingsStore.clear();
        settingsStore.add({ key: 'app_settings', ...DEFAULT_SETTINGS });
      }
      if (stores.includes(STORE_ORDER_HISTORY)) {
        tx.objectStore(STORE_ORDER_HISTORY).clear();
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error(tx.error?.message || 'Reset transaction failed'));
      });
    }
  } catch (err) {
    console.warn('Reset in LocalStorage fallback:', err);
  }
}

export interface GoogleSheetFetchOptions {
  spreadsheetId: string;
  sheetNameOrRange?: string;
  accessToken?: string | null;
  apiKey?: string;
}

export interface SheetProductRowJSON {
  productCode?: string;
  name: string;
  categoryName: string;
  price: number;
  unit: string;
  isActive: boolean;
  sortOrder: number;
}

export interface SheetValidationIssue {
  rowNumber: number;
  columnName?: string;
  value: unknown;
  message: string;
  severity: 'warning' | 'error';
}

export interface GoogleSheetParsedResult<T = SheetProductRowJSON> {
  success: boolean;
  spreadsheetId: string;
  sheetName: string;
  totalRows: number;
  validRows: number;
  data: T[];
  categories: string[];
  issues: SheetValidationIssue[];
  rawHeaders: string[];
  fetchedAt: number;
}

/**
 * Fetch raw 2D array data from Google Sheets via Fetch API
 * Supports Google Sheets API v4 (with OAuth token or API key) as well as public GViz JSON endpoint
 */
export async function fetchGoogleSheetRawValues(
  options: GoogleSheetFetchOptions
): Promise<{ headers: string[]; rows: (string | number | boolean)[][] }> {
  const { spreadsheetId, sheetNameOrRange = 'รายการวัตถุดิบ', accessToken, apiKey } = options;

  if (!spreadsheetId || !spreadsheetId.trim()) {
    throw new Error('Spreadsheet ID จำเป็นต้องระบุ');
  }

  const cleanSheetId = spreadsheetId.trim();
  const cleanRange = sheetNameOrRange.trim() || 'รายการวัตถุดิบ';

  // 1. If Access Token or API Key is available, use Google Sheets API v4
  if (accessToken || apiKey) {
    let url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanSheetId}/values/${encodeURIComponent(cleanRange)}?valueRenderOption=UNFORMATTED_VALUE`;
    if (apiKey) {
      url += `&key=${encodeURIComponent(apiKey)}`;
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Google Sheets API Error: HTTP ${response.status} (${response.statusText})`);
    }

    const data = await response.json();
    const allRows: (string | number | boolean)[][] = data.values || [];

    if (allRows.length === 0) {
      return { headers: [], rows: [] };
    }

    const headerStrings = allRows[0].map((h) => String(h ?? '').trim());
    const dataRows = allRows.slice(1);
    return { headers: headerStrings, rows: dataRows };
  }

  // 2. Fallback to Google Visualization API (GViz) for public / shared sheets
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${cleanSheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(cleanRange)}`;
  const gvizResponse = await fetch(gvizUrl);
  if (!gvizResponse.ok) {
    throw new Error(`ไม่สามารถเข้าถึง Google Sheet (${cleanSheetId}): HTTP ${gvizResponse.status}`);
  }

  const gvizText = await gvizResponse.text();
  // Extract JSON payload from google.visualization.Query.setResponse(...)
  const match = gvizText.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
  if (!match || !match[1]) {
    throw new Error('รูปแบบข้อมูลตอบกลับจาก Google Sheet GViz ไม่ถูกต้อง');
  }

  const gvizJson = JSON.parse(match[1]);
  if (gvizJson.status === 'error') {
    const errorDetails = gvizJson.errors?.map((e: { message?: string; detailed_message?: string }) => e.detailed_message || e.message).join(', ') || 'Unknown GViz error';
    throw new Error(`Google Sheets GViz Error: ${errorDetails}`);
  }

  const table = gvizJson.table;
  if (!table || !table.cols || !table.rows) {
    return { headers: [], rows: [] };
  }

  const headerStrings: string[] = table.cols.map((c: { label?: string; id?: string }, idx: number) => {
    return c.label && c.label.trim() ? c.label.trim() : `Column_${idx + 1}`;
  });

  const dataRows: (string | number | boolean)[][] = table.rows.map((r: { c?: Array<{ v?: string | number | boolean; f?: string } | null> }) => {
    if (!r.c) return [];
    return r.c.map((cell) => (cell && cell.v !== undefined && cell.v !== null ? cell.v : ''));
  });

  return { headers: headerStrings, rows: dataRows };
}

/**
 * Validates and converts 2D sheet rows into strongly typed JSON (SheetProductRowJSON)
 */
export function validateAndConvertSheetProductRows(
  rows: (string | number | boolean)[][],
  headerRow: string[] = []
): GoogleSheetParsedResult<SheetProductRowJSON> {
  const issues: SheetValidationIssue[] = [];
  const validData: SheetProductRowJSON[] = [];
  const categoriesSet = new Set<string>();

  const lowerHeaders = headerRow.map((h) => h.toLowerCase().trim());

  // Identify column indexes dynamically by common Thai/English names
  let codeIdx = -1;
  let nameIdx = -1;
  let catIdx = -1;
  let priceIdx = -1;
  let unitIdx = -1;
  let statusIdx = -1;
  let sortIdx = -1;

  lowerHeaders.forEach((col, idx) => {
    if (col.includes('รหัส') || col.includes('code') || col.includes('sku') || col.includes('barcode')) {
      codeIdx = idx;
    } else if (col.includes('ชื่อ') || col.includes('name') || col.includes('วัตถุดิบ') || col.includes('สินค้า') || col.includes('product')) {
      nameIdx = idx;
    } else if (col.includes('หมวด') || col.includes('category') || col.includes('กลุ่ม')) {
      catIdx = idx;
    } else if (col.includes('ราคา') || col.includes('price') || col.includes('cost')) {
      priceIdx = idx;
    } else if (col.includes('หน่วย') || col.includes('unit')) {
      unitIdx = idx;
    } else if (col.includes('สถานะ') || col.includes('status') || col.includes('active') || col.includes('เปิด')) {
      statusIdx = idx;
    } else if (col.includes('ลำดับ') || col.includes('sort') || col.includes('order') || col.includes('seq')) {
      sortIdx = idx;
    }
  });

  // Default fallback positions if no matched header names
  if (nameIdx === -1) nameIdx = headerRow.length > 1 ? 1 : 0;
  if (catIdx === -1) catIdx = headerRow.length > 2 ? 2 : -1;
  if (priceIdx === -1) priceIdx = headerRow.length > 3 ? 3 : -1;
  if (unitIdx === -1) unitIdx = headerRow.length > 4 ? 4 : -1;

  rows.forEach((row, rowIdx) => {
    const rowNum = rowIdx + 2; // +2 considering 1-based index and header row
    if (!row || row.length === 0) return;

    // 1. Validate Name (Mandatory)
    const rawName = String(row[nameIdx] ?? '').trim();
    if (!rawName) {
      issues.push({
        rowNumber: rowNum,
        columnName: 'ชื่อวัตถุดิบ',
        value: row[nameIdx],
        message: 'ข้ามแถวเนื่องจากไม่พบชื่อวัตถุดิบ',
        severity: 'warning',
      });
      return;
    }

    // 2. Validate Category Name
    let rawCategory = catIdx >= 0 && row[catIdx] !== undefined ? String(row[catIdx]).trim() : '';
    if (!rawCategory) {
      rawCategory = 'ทั่วไป';
      issues.push({
        rowNumber: rowNum,
        columnName: 'หมวดหมู่',
        value: row[catIdx],
        message: 'ไม่ระบุหมวดหมู่ ระบบกำหนดเป็น "ทั่วไป"',
        severity: 'warning',
      });
    }
    categoriesSet.add(rawCategory);

    // 3. Validate Price (Must be non-negative number)
    let price = 0;
    if (priceIdx >= 0 && row[priceIdx] !== undefined && row[priceIdx] !== '') {
      const rawPriceVal = row[priceIdx];
      if (typeof rawPriceVal === 'number') {
        price = rawPriceVal;
      } else {
        const cleanedStr = String(rawPriceVal).replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleanedStr);
        if (isNaN(parsed)) {
          issues.push({
            rowNumber: rowNum,
            columnName: 'ราคาต่อหน่วย',
            value: rawPriceVal,
            message: `ราคา "${rawPriceVal}" ไม่ถูกต้อง กำหนดเป็น 0 บาท`,
            severity: 'warning',
          });
          price = 0;
        } else {
          price = parsed;
        }
      }
    }
    if (price < 0) {
      issues.push({
        rowNumber: rowNum,
        columnName: 'ราคาต่อหน่วย',
        value: price,
        message: 'ราคาติดลบ ระบบปรับเป็น 0 บาท',
        severity: 'warning',
      });
      price = 0;
    }

    // 4. Validate Unit
    let unit = 'กก.';
    if (unitIdx >= 0 && row[unitIdx] !== undefined) {
      const rawUnit = String(row[unitIdx]).trim();
      if (rawUnit) unit = rawUnit;
    }

    // 5. Validate Product Code
    let productCode: string | undefined = undefined;
    if (codeIdx >= 0 && row[codeIdx] !== undefined) {
      const rawCode = String(row[codeIdx]).trim();
      if (rawCode) productCode = rawCode;
    }

    // 6. Validate Active Status
    let isActive = true;
    if (statusIdx >= 0 && row[statusIdx] !== undefined && row[statusIdx] !== '') {
      const val = String(row[statusIdx]).trim().toLowerCase();
      if (
        val === 'false' ||
        val === '0' ||
        val === 'ปิด' ||
        val === 'ปิดใช้งาน' ||
        val === 'inactive' ||
        val === 'no' ||
        val === 'off'
      ) {
        isActive = false;
      }
    }

    // 7. Validate Sort Order
    let sortOrder = validData.length + 1;
    if (sortIdx >= 0 && row[sortIdx] !== undefined && row[sortIdx] !== '') {
      const parsedSort = parseInt(String(row[sortIdx]), 10);
      if (!isNaN(parsedSort) && parsedSort >= 1) {
        sortOrder = parsedSort;
      }
    }

    validData.push({
      name: rawName,
      categoryName: rawCategory,
      price,
      unit,
      productCode,
      isActive,
      sortOrder,
    });
  });

  return {
    success: true,
    spreadsheetId: '',
    sheetName: '',
    totalRows: rows.length,
    validRows: validData.length,
    data: validData,
    categories: Array.from(categoriesSet),
    issues,
    rawHeaders: headerRow,
    fetchedAt: Date.now(),
  };
}

/**
 * High-level function: Fetches Google Sheets data, validates columns, and formats as JSON
 */
export async function fetchGoogleSheetProducts(
  options: GoogleSheetFetchOptions
): Promise<GoogleSheetParsedResult<SheetProductRowJSON>> {
  const { headers, rows } = await fetchGoogleSheetRawValues(options);
  const parsed = validateAndConvertSheetProductRows(rows, headers);
  parsed.spreadsheetId = options.spreadsheetId;
  parsed.sheetName = options.sheetNameOrRange || 'รายการวัตถุดิบ';
  return parsed;
}

/**
 * Import and merge product items into IndexedDB and LocalStorage
 */
export async function importProductsFromGoogleSheetsData(
  importedItems: Array<{
    name: string;
    categoryName: string;
    price: number;
    unit: string;
    productCode?: string;
    isActive: boolean;
    sortOrder: number;
  }>
): Promise<{ categories: Category[]; products: Product[] }> {
  const currentCategories = await getCategories();
  const currentProducts = await getProducts();
  const now = Date.now();

  const categoryMap = new Map<string, Category>();
  currentCategories.forEach((c) => {
    categoryMap.set(c.name.trim().toLowerCase(), c);
  });

  const updatedCategories = [...currentCategories];

  // 1. Create missing categories
  for (const item of importedItems) {
    const catNameClean = item.categoryName.trim();
    if (!catNameClean) continue;
    const catKey = catNameClean.toLowerCase();
    if (!categoryMap.has(catKey)) {
      const newCat: Category = {
        id: 'cat_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
        name: catNameClean,
        sortOrder: updatedCategories.length + 1,
        isActive: true,
        isDrink: catNameClean.includes('เครื่องดื่ม') || catNameClean.toLowerCase().includes('drink'),
        createdAt: now,
        updatedAt: now,
      };
      updatedCategories.push(newCat);
      categoryMap.set(catKey, newCat);
    }
  }

  // 2. Map existing products for fast lookup (by normalized name or code)
  const existingByName = new Map<string, Product>();
  const existingByCode = new Map<string, Product>();
  currentProducts.forEach((p) => {
    existingByName.set(p.name.trim().toLowerCase(), p);
    if (p.productCode) existingByCode.set(p.productCode.trim().toLowerCase(), p);
  });

  const updatedProductsMap = new Map<string, Product>();
  // Keep existing items by default
  currentProducts.forEach((p) => updatedProductsMap.set(p.id, { ...p }));

  for (const item of importedItems) {
    const nameClean = item.name.trim();
    if (!nameClean) continue;
    const nameKey = nameClean.toLowerCase();
    const codeKey = item.productCode ? item.productCode.trim().toLowerCase() : '';

    const matchedCat = categoryMap.get(item.categoryName.trim().toLowerCase()) || updatedCategories[0];
    const categoryId = matchedCat.id;

    // Check if matched by code first, then by name
    const existing = (codeKey && existingByCode.get(codeKey)) || existingByName.get(nameKey);

    if (existing) {
      const updated: Product = {
        ...existing,
        name: nameClean,
        categoryId,
        price: item.price,
        unit: item.unit || existing.unit || 'กก.',
        productCode: item.productCode || existing.productCode || undefined,
        isActive: item.isActive,
        sortOrder: item.sortOrder || existing.sortOrder || 1,
        updatedAt: now,
        // Image and createdAt are preserved!
      };
      updatedProductsMap.set(existing.id, updated);
    } else {
      const newId = 'prod_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      const newProduct: Product = {
        id: newId,
        name: nameClean,
        categoryId,
        price: item.price,
        unit: item.unit || 'กก.',
        productCode: item.productCode || undefined,
        image: '',
        isActive: item.isActive,
        sortOrder: item.sortOrder || 1,
        createdAt: now,
        updatedAt: now,
      };
      updatedProductsMap.set(newId, newProduct);
    }
  }

  const finalCategories = updatedCategories;
  const finalProducts = Array.from(updatedProductsMap.values());

  // Save to LocalStorage
  setLSItem(LS_CATEGORIES, finalCategories);
  setLSItem(LS_PRODUCTS, finalProducts);

  // Save to IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_CATEGORIES, STORE_PRODUCTS], 'readwrite');
    const catStore = tx.objectStore(STORE_CATEGORIES);
    const prodStore = tx.objectStore(STORE_PRODUCTS);

    catStore.clear();
    prodStore.clear();

    finalCategories.forEach((c) => catStore.add(c));
    finalProducts.forEach((p) => prodStore.add(p));

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error(tx.error?.message || 'Import transaction failed'));
    });
  } catch (err) {
    console.warn('Import to IndexedDB fallback to LS:', err);
  }

  return { categories: finalCategories, products: finalProducts };
}

/**
 * Fetches Google Sheets data, validates JSON, and updates IndexedDB and LocalStorage
 */
export async function syncGoogleSheetToIndexedDB(
  options: GoogleSheetFetchOptions
): Promise<{
  result: GoogleSheetParsedResult<SheetProductRowJSON>;
  categories: Category[];
  products: Product[];
}> {
  const parsedResult = await fetchGoogleSheetProducts(options);

  if (parsedResult.data.length === 0) {
    throw new Error('ไม่พบข้อมูลรายการวัตถุดิบที่ถูกต้องใน Google Sheet ที่ระบุ');
  }

  const { categories, products } = await importProductsFromGoogleSheetsData(parsedResult.data);

  return {
    result: parsedResult,
    categories,
    products,
  };
}



