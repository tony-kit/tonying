import { CartItem, AppSettings, STORE_DELIVERY_NOTICE } from '../types';
import { formatThaiDateTime } from './orderFormatter';

export interface DrinkOrderImageResult {
  dataUrl: string;
  blob: Blob;
  fileName: string;
}

/**
 * Load an image source into HTMLImageElement safely with CORS handling
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback empty image
      const fallback = new Image();
      resolve(fallback);
    };
    img.src = src;
  });
}

/**
 * Draw rounded rectangle on canvas context
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Generates a clean, high-DPI image of drink orders without prices.
 * Contains only: Store Title, Date, [Product Image] [Product Name] [Quantity & Unit]
 */
export async function generateDrinkOrderImage(
  drinkItems: CartItem[],
  settings: AppSettings
): Promise<DrinkOrderImageResult> {
  const dpr = 2; // Retina scale
  const width = 640;
  const padding = 32;
  const noticeHeight = 48;
  const headerHeight = 190;
  const rowHeight = 110;
  const footerHeight = 70;
  const contentHeight = headerHeight + drinkItems.length * rowHeight + footerHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width * dpr;
  canvas.height = contentHeight * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }

  // Scale for high resolution
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = '#FAFAF9'; // Clean warm off-white
  ctx.fillRect(0, 0, width, contentHeight);

  // Top Accent bar
  ctx.fillStyle = '#EA580C'; // Warm orange
  ctx.fillRect(0, 0, width, 10);

  // Header Box
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, padding, 20, width - padding * 2, 92, 16);
  ctx.fill();
  ctx.strokeStyle = '#F1F5F9';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Store Brand Title
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 22px "Prompt", -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(settings.storeName || "TONY'S KITCHEN", padding + 20, 54);

  // Drink Order Subtitle
  ctx.fillStyle = '#EA580C';
  ctx.font = 'bold 15px "Prompt", sans-serif';
  ctx.fillText('DRINK ORDER • รายการสั่งเครื่องดื่ม', padding + 20, 80);

  // Timestamp
  ctx.fillStyle = '#64748B';
  ctx.font = '13px "Prompt", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(formatThaiDateTime(), width - padding - 20, 54);
  ctx.fillText(`${drinkItems.length} รายการ`, width - padding - 20, 80);

  // Prominent Delivery Notice Box (High Contrast Badge)
  const noticeY = 124;
  ctx.fillStyle = '#FEF3C7'; // Warm amber
  roundRect(ctx, padding, noticeY, width - padding * 2, noticeHeight, 12);
  ctx.fill();
  ctx.strokeStyle = '#F59E0B'; // Amber border
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#92400E'; // High-contrast amber text
  ctx.font = 'bold 14px "Prompt", -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`🚚 ${STORE_DELIVERY_NOTICE}`, width / 2, noticeY + 29);

  // Pre-load all product images
  const loadedImages = await Promise.all(
    drinkItems.map((item) => (item.product.image ? loadImage(item.product.image) : Promise.resolve(null)))
  );

  // Draw Items
  let currentY = headerHeight;

  for (let i = 0; i < drinkItems.length; i++) {
    const item = drinkItems[i];
    const img = loadedImages[i];
    const cardY = currentY;
    const cardHeight = rowHeight - 12;

    // Card background
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, padding, cardY, width - padding * 2, cardHeight, 14);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Product Thumbnail Box
    const thumbX = padding + 14;
    const thumbY = cardY + 12;
    const thumbSize = 74;

    ctx.save();
    roundRect(ctx, thumbX, thumbY, thumbSize, thumbSize, 10);
    ctx.clip();

    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(thumbX, thumbY, thumbSize, thumbSize);

    if (img && img.width > 0 && img.height > 0) {
      // Draw image cover
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, thumbX, thumbY, thumbSize, thumbSize);
    } else {
      // Fallback cup symbol
      ctx.fillStyle = '#FED7AA';
      ctx.fillRect(thumbX, thumbY, thumbSize, thumbSize);
      ctx.fillStyle = '#EA580C';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🥤', thumbX + thumbSize / 2, thumbY + 46);
    }
    ctx.restore();

    // Border around thumbnail
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    roundRect(ctx, thumbX, thumbY, thumbSize, thumbSize, 10);
    ctx.stroke();

    // Product Name (with product code if present)
    const textX = thumbX + thumbSize + 16;
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 18px "Prompt", -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';

    // Wrap product name if too long
    const maxNameWidth = width - textX - padding - 130;
    const codePart = item.product.productCode?.trim() ? ` [${item.product.productCode.trim()}]` : '';
    let displayName = `${item.product.name}${codePart}`;
    if (ctx.measureText(displayName).width > maxNameWidth) {
      while (displayName.length > 3 && ctx.measureText(displayName + '...').width > maxNameWidth) {
        displayName = displayName.slice(0, -1);
      }
      displayName += '...';
    }
    ctx.fillText(displayName, textX, cardY + 42);

    // Quantity Badge (High contrast, clearly legible)
    const badgeW = 120;
    const badgeH = 46;
    const badgeX = width - padding - badgeW - 14;
    const badgeY = cardY + (cardHeight - badgeH) / 2;

    ctx.fillStyle = '#FFF7ED'; // Subtle orange tint
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 10);
    ctx.fill();
    ctx.strokeStyle = '#FDBA74';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#C2410C'; // Dark rich orange
    ctx.font = 'bold 22px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${item.quantity}`, badgeX + badgeW / 2 - 16, badgeY + 30);

    ctx.fillStyle = '#9A3412';
    ctx.font = '600 14px "Prompt", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${item.product.unit}`, badgeX + badgeW / 2 + 6, badgeY + 29);

    currentY += rowHeight;
  }

  // Footer / Watermark
  ctx.fillStyle = '#94A3B8';
  ctx.font = '13px "Prompt", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`⚡ Tony's Kitchen — สั่งเครื่องดื่มสำหรับจัดส่ง`, width / 2, contentHeight - 28);

  // Export DataURL & Blob
  const dataUrl = canvas.toDataURL('image/png', 0.95);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to create image blob'));
    }, 'image/png', 0.95);
  });

  const now = new Date();
  const dateTag = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `drink-order-${dateTag}.png`;

  return { dataUrl, blob, fileName };
}

/**
 * Share image file via Web Share API or download fallback
 */
export async function shareDrinkOrderImage(
  imageResult: DrinkOrderImageResult,
  title = "Tony's Kitchen - Drink Order"
): Promise<{ method: 'share' | 'download'; success: boolean }> {
  try {
    const file = new File([imageResult.blob], imageResult.fileName, { type: 'image/png' });

    if (
      navigator.canShare &&
      navigator.canShare({ files: [file] }) &&
      navigator.share
    ) {
      await navigator.share({
        title,
        text: 'รายการสั่งเครื่องดื่ม Tony\'s Kitchen',
        files: [file],
      });
      return { method: 'share', success: true };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { method: 'share', success: false };
    }
    console.warn('Web share image failed, falling back to download:', err);
  }

  // Fallback: Download file
  downloadImageFallback(imageResult.dataUrl, imageResult.fileName);
  return { method: 'download', success: true };
}

/**
 * Copy image blob to clipboard if supported
 */
export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard image copy not supported or failed:', err);
  }
  return false;
}

/**
 * Open LINE application directly to target group or default scheme
 */
export function openLineApp(groupLink?: string): void {
  const target = groupLink && groupLink.trim() ? groupLink.trim() : 'line://';
  try {
    window.location.href = target;
  } catch (e) {
    window.open(target, '_blank');
  }
}

/**
 * Force browser to download image
 */
export function downloadImageFallback(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
