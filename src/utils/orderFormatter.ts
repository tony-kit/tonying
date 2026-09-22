import { CategoryGroupSummary, AppSettings, STORE_DELIVERY_NOTICE } from '../types';

/**
 * Format currency in Thai Baht
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format Date/Time in Thai format
 */
export function formatThaiDateTime(date: Date | number = new Date()): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Check if a group is a beverage / drink category
 */
export function isDrinkCategory(group: CategoryGroupSummary): boolean {
  return Boolean(
    group.isDrink ||
    group.category.isDrink ||
    group.category.name.includes('เครื่องดื่ม') ||
    group.category.name.toLowerCase().includes('drink')
  );
}

/**
 * VERSION A — CLIPBOARD / OWNER REVIEW TEXT
 * Includes: Product Name | Quantity | Unit | Unit Price | Line Total
 * Plus Category Subtotals, 7% VAT on Drinks, Grand Total, and Store Delivery Notice.
 */
export function generateVersionAText(
  groupedSummary: CategoryGroupSummary[],
  grandTotal: number,
  settings: AppSettings
): string {
  const dateStr = formatThaiDateTime();
  const lines: string[] = [];

  lines.push(`📋 รายการสั่งวัตถุดิบ (ฉบับตรวจสอบราคาร้าน)`);
  lines.push(`🏪 ${settings.storeName || "Tony's Kitchen"}`);
  if (settings.branchNote) {
    lines.push(`📍 ${settings.branchNote}`);
  }
  lines.push(`📅 วันที่: ${dateStr}`);
  lines.push(`🚚 รอบจัดส่ง: ${STORE_DELIVERY_NOTICE}`);
  lines.push(`──────────────────────────────`);

  let totalItemsCount = 0;
  let regularSubtotal = 0;
  let drinkSubtotal = 0;
  let drinkVat = 0;

  for (const group of groupedSummary) {
    if (group.items.length === 0) continue;

    const isDrink = isDrinkCategory(group);
    lines.push(`\n📁 【 ${group.category.name}${isDrink ? ' (คิด VAT 7%)' : ''} 】`);
    
    for (const item of group.items) {
      totalItemsCount++;
      const codePart = item.product.productCode?.trim() ? ` [${item.product.productCode.trim()}]` : '';
      const priceStr = `${formatCurrency(item.product.price)} บ./${item.product.unit}`;
      const lineTotalStr = `${formatCurrency(item.lineTotal)} บ.`;
      lines.push(`• ${item.product.name}${codePart} | ${item.quantity} ${item.product.unit} | @${priceStr} | รวม ${lineTotalStr}`);
    }

    if (isDrink) {
      drinkSubtotal += group.subtotal;
      const vat = typeof group.vatAmount === 'number'
        ? group.vatAmount
        : Math.round(group.subtotal * 0.07 * 100) / 100;
      drinkVat += vat;
      const totalWithVat = typeof group.totalWithVat === 'number'
        ? group.totalWithVat
        : Math.round((group.subtotal + vat) * 100) / 100;

      lines.push(`   ↳ รวมค่าสินค้าเครื่องดื่ม: ${formatCurrency(group.subtotal)} บาท`);
      lines.push(`   ↳ + ภาษีมูลค่าเพิ่ม VAT 7%: +${formatCurrency(vat)} บาท`);
      lines.push(`   ↳ รวมสุทธิหมวดนี้ (รวม VAT 7%): ${formatCurrency(totalWithVat)} บาท (${group.items.length} รายการ)`);
    } else {
      regularSubtotal += group.subtotal;
      lines.push(`   ↳ รวมหมวดนี้: ${formatCurrency(group.subtotal)} บาท (${group.items.length} รายการ)`);
    }
  }

  lines.push(`\n──────────────────────────────`);
  if (drinkVat > 0) {
    if (regularSubtotal > 0) {
      lines.push(`🔹 รวมราคาสินค้าทั่วไป: ${formatCurrency(regularSubtotal)} บาท`);
    }
    lines.push(`🥤 รวมราคาสินค้าเครื่องดื่ม: ${formatCurrency(drinkSubtotal)} บาท`);
    lines.push(`🧾 ภาษีมูลค่าเพิ่ม VAT 7% (หมวดเครื่องดื่ม): +${formatCurrency(drinkVat)} บาท`);
    lines.push(`💰 ยอดรวมทั้งสิ้น (ราคาสุดท้าย): ${formatCurrency(grandTotal)} บาท`);
  } else {
    lines.push(`💰 ยอดรวมทั้งสิ้น: ${formatCurrency(grandTotal)} บาท`);
  }
  lines.push(`📦 รวมทั้งหมด: ${totalItemsCount} รายการ`);
  lines.push(`──────────────────────────────`);
  lines.push(`⚠️ หมายเหตุ: ${STORE_DELIVERY_NOTICE}`);
  lines.push(`──────────────────────────────`);

  return lines.join('\n');
}

/**
 * VERSION B — LINE SUPPLIER TEXT
 * Contains ONLY: [Product Name] [Product Code (if any)] [Quantity] [Unit]
 * with prominent delivery schedule notice.
 */
export function generateVersionBText(
  groupedSummary: CategoryGroupSummary[],
  includeDeliveryNotice = true
): string {
  const lines: string[] = [];

  if (includeDeliveryNotice) {
    lines.push(`🚚 ${STORE_DELIVERY_NOTICE}`);
    lines.push('──────────────────────────────');
  }

  for (const group of groupedSummary) {
    for (const item of group.items) {
      if (item.quantity > 0) {
        const codePart = item.product.productCode?.trim() ? ` ${item.product.productCode.trim()}` : '';
        lines.push(`${item.product.name}${codePart} ${item.quantity} ${item.product.unit}`);
      }
    }
  }

  if (includeDeliveryNotice) {
    lines.push('──────────────────────────────');
    lines.push(`🙏 ${STORE_DELIVERY_NOTICE}`);
  }

  return lines.join('\n');
}

export type DevicePlatform = 'android' | 'ios' | 'desktop';

/**
 * Detect client operating system / device platform
 */
export function detectDevicePlatform(): DevicePlatform {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'desktop';
  }
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  if (/android/i.test(ua)) {
    return 'android';
  }
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  return 'desktop';
}

/**
 * Generate LINE Share URLs for personal LINE accounts
 * - Official HTTPS share URL: https://line.me/R/share?text={ENCODED_MESSAGE}
 * - Android Intent URL targeting installed LINE app package:
 *   intent://line.me/R/share?text={ENCODED_MESSAGE}#Intent;scheme=https;package=jp.naver.line.android;end
 */
export function getLineShareUrl(lineMessage: string): {
  encodedMessage: string;
  lineShareUrl: string;
  androidIntentUrl: string;
} {
  const encodedMessage = encodeURIComponent(lineMessage);
  const lineShareUrl = `https://line.me/R/share?text=${encodedMessage}`;
  const androidIntentUrl = `intent://line.me/R/share?text=${encodedMessage}#Intent;scheme=https;package=jp.naver.line.android;end`;
  return { encodedMessage, lineShareUrl, androidIntentUrl };
}

/**
 * Copy text to device clipboard safely
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers / iframe contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return false;
  }
}

/**
 * Share text via Web Share API if supported
 */
export async function shareTextViaDevice(title: string, text: string): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
      });
      return true;
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Web Share failed:', error);
      }
      return false;
    }
  }
  return false;
}
