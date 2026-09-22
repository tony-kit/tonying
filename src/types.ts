export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  isDrink?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  productCode?: string;
  image: string; // Base64 Data URL or empty string
  unit: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  lineTotal: number;
}

export type CartState = Record<string, number>;

export interface CartItemSnapshot {
  productId: string;
  name: string;
  productCode?: string;
  image?: string;
  price: number;
  unit: string;
  categoryId: string;
  categoryName?: string;
  addedAt: number;
}

export type CartIntegrityIssueType =
  | 'DELETED_PRODUCT'
  | 'INACTIVE_PRODUCT'
  | 'PRICE_CHANGED'
  | 'UNIT_CHANGED'
  | 'CATEGORY_CHANGED'
  | 'INVALID_PRICE'
  | 'INVALID_UNIT'
  | 'INVALID_QUANTITY'
  | 'DRINK_MISMATCH';

export interface CartIntegrityIssue {
  id: string;
  productId: string;
  productName: string;
  image?: string;
  type: CartIntegrityIssueType;
  title: string;
  description: string;
  oldValue?: string | number;
  newValue?: string | number;
  isFatal: boolean; // if true, item must be removed or catalog fixed before submitting
}

export const STORE_DELIVERY_NOTICE = 'ร้านหยุดทุกวันอังคาร กรุณาส่งสินค้าในวัน พุธ - จันทร์ ขอบคุณครับ';

export interface CategoryGroupSummary {
  category: Category;
  items: CartItem[];
  subtotal: number;
  totalQuantity: number;
  isDrink?: boolean;
  vatRate?: number;
  vatAmount?: number;
  totalWithVat?: number;
}

export interface AppSettings {
  storeName: string;
  branchNote: string;
  logoDataUrl: string | null;
  currencySymbol: string;
  lineSupplierNote: string;
  updatedAt: number;
}

export interface OrderHistoryItem {
  productId: string;
  productName: string;
  productCode?: string;
  categoryName?: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  price?: number;
  lineTotal?: number;
  image?: string;
}

export interface OrderHistoryRecord {
  id: string;
  timestamp: number;
  orderType: 'normal' | 'drink';
  itemCount: number;
  grandTotal: number;
  regularSubtotal?: number;
  drinkSubtotal?: number;
  drinkVat?: number;
  items: OrderHistoryItem[];
  versionAText?: string;
  versionBText?: string;
  drinkImageDataUrl?: string;
}

export interface BackupMetadata {
  formatVersion: number;
  application: string;
  backupCreatedAt: string;
  deviceLabel?: string;
  schemaVersion: string;
}

export interface FullAppBackup {
  backupMetadata?: BackupMetadata;
  version?: string;
  app?: string;
  exportedAt?: string;
  categories: Category[];
  products: Product[];
  settings?: AppSettings;
  orderHistory?: OrderHistoryRecord[];
}

export type ActiveTab = 'order' | 'cart' | 'products' | 'categories' | 'settings';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}
