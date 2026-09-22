/**
 * Client-side image compression & resizing utility.
 * Keeps image sizes manageable in IndexedDB while maintaining sharp clarity on mobile/retina screens.
 */
export async function compressAndResizeImage(
  file: File,
  maxDimension = 600,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไฟล์รูปภาพไม่ถูกต้อง'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(img.src);
        }

        // Fill subtle warm white background for transparency support
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP or JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Generate a clean SVG data URL placeholder for food/ingredient icons
 */
export function generateSvgPlaceholder(text: string, bgColor = '#FFF7ED', textColor = '#EA580C'): string {
  const cleanText = text.slice(0, 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" rx="16" fill="${bgColor}"/>
    <circle cx="50" cy="50" r="32" fill="${textColor}" fill-opacity="0.12"/>
    <text x="50" y="57" font-family="-apple-system, BlinkMacSystemFont, 'Prompt', sans-serif" font-size="28" font-weight="700" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${cleanText}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
