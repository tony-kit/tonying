import { Product, Category, CartState, CartItemSnapshot, CartIntegrityIssue } from '../types';

export interface CartIntegrityResult {
  isValid: boolean;
  hasFatalIssues: boolean;
  issues: CartIntegrityIssue[];
}

/**
 * Validates all items in the cart against current catalog data (products and categories).
 * Detects deleted products, inactive products, price modifications, unit modifications,
 * and category shifts before order dispatch.
 */
export function validateCartIntegrity(
  cart: CartState,
  cartSnapshots: Record<string, CartItemSnapshot>,
  products: Product[],
  categories: Category[],
  isDrinkOrder: boolean = false
): CartIntegrityResult {
  const issues: CartIntegrityIssue[] = [];
  const prodMap = new Map<string, Product>(products.map((p) => [p.id, p]));
  const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  for (const prodId of Object.keys(cart)) {
    const qty = cart[prodId];
    if (qty === undefined || qty <= 0) continue;

    const snapshot = cartSnapshots[prodId];
    const currentProd = prodMap.get(prodId);

    // 1. Check if product quantity is valid
    if (typeof qty !== 'number' || isNaN(qty) || qty <= 0) {
      issues.push({
        id: `qty-${prodId}`,
        productId: prodId,
        productName: currentProd?.name || snapshot?.name || 'สินค้า',
        image: currentProd?.image || snapshot?.image,
        type: 'INVALID_QUANTITY',
        title: 'จำนวนสินค้าไม่ถูกต้อง',
        description: 'จำนวนสินค้าในตะกร้าต้องเป็นตัวเลขที่มากกว่า 0',
        oldValue: qty,
        newValue: 0,
        isFatal: true,
      });
      continue;
    }

    // 2. Deleted Product: Product no longer exists in catalog
    if (!currentProd) {
      issues.push({
        id: `deleted-${prodId}`,
        productId: prodId,
        productName: snapshot?.name || `สินค้า (รหัส ${prodId.slice(0, 6)})`,
        image: snapshot?.image,
        type: 'DELETED_PRODUCT',
        title: 'สินค้านี้ไม่มีอยู่ในรายการสินค้าแล้ว',
        description: 'สินค้านี้ถูกลบออกจากฐานข้อมูลร้านค้าแล้ว ไม่สามารถสั่งซื้อได้',
        isFatal: true,
      });
      continue;
    }

    // 3. Inactive Product: Product exists but isActive is false
    if (!currentProd.isActive) {
      issues.push({
        id: `inactive-${prodId}`,
        productId: prodId,
        productName: currentProd.name,
        image: currentProd.image || snapshot?.image,
        type: 'INACTIVE_PRODUCT',
        title: 'สินค้านี้ถูกปิดการใช้งานแล้ว',
        description: 'สินค้านี้ถูกตั้งค่าปิดการใช้งานในระบบชั่วคราว',
        isFatal: true,
      });
      continue;
    }

    // 4. Invalid Price
    if (typeof currentProd.price !== 'number' || isNaN(currentProd.price) || currentProd.price < 0) {
      issues.push({
        id: `inv-price-${prodId}`,
        productId: prodId,
        productName: currentProd.name,
        image: currentProd.image,
        type: 'INVALID_PRICE',
        title: 'ราคาสินค้าในระบบไม่ถูกต้อง',
        description: 'ราคาต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0',
        isFatal: true,
      });
      continue;
    }

    // 5. Price Change Detection
    if (snapshot && typeof snapshot.price === 'number' && snapshot.price !== currentProd.price) {
      issues.push({
        id: `price-change-${prodId}`,
        productId: prodId,
        productName: currentProd.name,
        image: currentProd.image || snapshot.image,
        type: 'PRICE_CHANGED',
        title: 'ราคาสินค้าเปลี่ยนแปลง',
        description: 'ราคาต่อหน่วยมีการอัปเดตหลังจากเพิ่มลงในตะกร้า',
        oldValue: snapshot.price,
        newValue: currentProd.price,
        isFatal: false,
      });
    }

    // 6. Unit Change Detection
    if (snapshot && snapshot.unit && currentProd.unit && snapshot.unit.trim() !== currentProd.unit.trim()) {
      issues.push({
        id: `unit-change-${prodId}`,
        productId: prodId,
        productName: currentProd.name,
        image: currentProd.image || snapshot.image,
        type: 'UNIT_CHANGED',
        title: 'หน่วยสินค้ามีการเปลี่ยนแปลง',
        description: 'หน่วยนับของสินค้ามีการเปลี่ยนแปลงในระบบ',
        oldValue: snapshot.unit,
        newValue: currentProd.unit,
        isFatal: false,
      });
    }

    // 7. Category Change Detection
    if (snapshot && snapshot.categoryId && snapshot.categoryId !== currentProd.categoryId) {
      const oldCatName = catMap.get(snapshot.categoryId)?.name || snapshot.categoryName || 'หมวดเดิม';
      const newCatName = catMap.get(currentProd.categoryId)?.name || 'หมวดใหม่';
      issues.push({
        id: `cat-change-${prodId}`,
        productId: prodId,
        productName: currentProd.name,
        image: currentProd.image || snapshot.image,
        type: 'CATEGORY_CHANGED',
        title: 'หมวดหมู่สินค้ามีการเปลี่ยนแปลง',
        description: 'หมวดหมู่ของสินค้ามีการย้ายตำแหน่งในระบบ',
        oldValue: oldCatName,
        newValue: newCatName,
        isFatal: false,
      });
    }

    // 8. Beverage Order Constraint Check
    if (isDrinkOrder) {
      const cat = catMap.get(currentProd.categoryId);
      const isDrink = Boolean(cat?.isDrink || cat?.name.includes('เครื่องดื่ม'));
      if (!isDrink) {
        issues.push({
          id: `drink-mismatch-${prodId}`,
          productId: prodId,
          productName: currentProd.name,
          image: currentProd.image || snapshot?.image,
          type: 'DRINK_MISMATCH',
          title: 'ไม่ใช่รายการในหมวดเครื่องดื่ม',
          description: 'การสั่ง Order เครื่องดื่มสามารถส่งได้เฉพาะสินค้าในหมวดเครื่องดื่มเท่านั้น',
          isFatal: true,
        });
      }
    }
  }

  const hasFatalIssues = issues.some((i) => i.isFatal);
  return {
    isValid: issues.length === 0,
    hasFatalIssues,
    issues,
  };
}
