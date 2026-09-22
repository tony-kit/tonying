import { Category, Product, OrderHistoryRecord } from '../types';
import { formatCurrency, formatThaiDateTime } from '../utils/orderFormatter';

export interface SpreadsheetFileInfo {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  index: number;
}

export interface SpreadsheetDetails {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: SheetTabInfo[];
}

export interface ImportProductItem {
  name: string;
  categoryName: string;
  price: number;
  unit: string;
  productCode?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ImportResult {
  products: ImportProductItem[];
  categories: string[];
  totalRows: number;
  validRows: number;
  errors: string[];
}

const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_BASE_URL = 'https://www.googleapis.com/drive/v3/files';

/**
 * Lists Google Sheets in user's Google Drive
 */
export async function listSpreadsheets(accessToken: string): Promise<SpreadsheetFileInfo[]> {
  try {
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const url = `${DRIVE_BASE_URL}?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=30`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Google Drive API error (${res.status})`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err: unknown) {
    console.error('Failed to list spreadsheets:', err);
    throw err;
  }
}

/**
 * Get details & tabs of a spreadsheet
 */
export async function getSpreadsheetDetails(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetDetails> {
  const url = `${SHEETS_BASE_URL}/${spreadsheetId}?fields=spreadsheetId,properties.title,spreadsheetUrl,sheets.properties`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Failed to fetch spreadsheet details (${res.status})`);
  }

  const data = await res.json();
  const sheets: SheetTabInfo[] = (data.sheets || []).map((s: { properties: { sheetId: number; title: string; index: number } }) => ({
    sheetId: s.properties.sheetId,
    title: s.properties.title,
    index: s.properties.index,
  }));

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Spreadsheet',
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheets,
  };
}

/**
 * Creates a brand new Tony's Kitchen Google Spreadsheet with pre-formatted sheets
 */
export async function createTonyKitchenSpreadsheet(
  accessToken: string,
  customTitle?: string
): Promise<SpreadsheetDetails> {
  const nowStr = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const title = customTitle || `Tony's Kitchen - บันทึกวัตถุดิบและคำสั่งซื้อ (${nowStr})`;

  const body = {
    properties: {
      title,
      locale: 'th_TH',
      timeZone: 'Asia/Bangkok',
    },
    sheets: [
      {
        properties: {
          title: 'รายการวัตถุดิบ',
          gridProperties: { rowCount: 200, columnCount: 10, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'ประวัติการสั่งซื้อ',
          gridProperties: { rowCount: 300, columnCount: 12, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'คำสั่งซื้อล่าสุด',
          gridProperties: { rowCount: 100, columnCount: 8, frozenRowCount: 1 },
        },
      },
    ],
  };

  const res = await fetch(SHEETS_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Failed to create spreadsheet (${res.status})`);
  }

  const created = await res.json();
  const spreadsheetId = created.spreadsheetId;

  // Initialize Header Rows with stylish headers
  await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'รายการวัตถุดิบ!A1:G1',
          values: [
            ['รหัสสินค้า', 'ชื่อวัตถุดิบ', 'หมวดหมู่', 'ราคาต่อหน่วย (บาท)', 'หน่วยนับ', 'สถานะการใช้งาน', 'ลำดับแสดงผล'],
          ],
        },
        {
          range: 'ประวัติการสั่งซื้อ!A1:H1',
          values: [
            ['รหัสออเดอร์', 'วันที่-เวลา', 'ประเภทออเดอร์', 'จำนวนรายการ', 'ยอดรวมสุทธิ (บาท)', 'รายการสินค้าทั้งหมด', 'สรุปแยกตามหมวดหมู่', 'บันทึกเพิ่มเติม'],
          ],
        },
        {
          range: 'คำสั่งซื้อล่าสุด!A1:F1',
          values: [
            ['ลำดับ', 'ชื่อวัตถุดิบ', 'หมวดหมู่', 'จำนวนสั่ง', 'หน่วย', 'ราคาต่อหน่วย (บาท)'],
          ],
        },
      ],
    }),
  });

  return getSpreadsheetDetails(accessToken, spreadsheetId);
}

/**
 * Ensures a tab with given title exists in the spreadsheet. If not, creates it.
 */
export async function ensureSheetTab(
  accessToken: string,
  spreadsheetId: string,
  tabTitle: string
): Promise<void> {
  const details = await getSpreadsheetDetails(accessToken, spreadsheetId);
  const exists = details.sheets.some((s) => s.title === tabTitle);
  if (!exists) {
    await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: tabTitle,
                gridProperties: { frozenRowCount: 1 },
              },
            },
          },
        ],
      }),
    });
  }
}

/**
 * Export / Sync Products to the "รายการวัตถุดิบ" sheet
 */
export async function syncProductsToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  products: Product[],
  categories: Category[],
  tabTitle = 'รายการวัตถุดิบ'
): Promise<{ rowCount: number }> {
  await ensureSheetTab(accessToken, spreadsheetId, tabTitle);

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const catOrderMap = new Map(categories.map((c, i) => [c.id, typeof c.sortOrder === 'number' ? c.sortOrder : i + 1]));

  // Sort products by category sortOrder, then product sortOrder
  const sortedProducts = [...products].sort((a, b) => {
    const catA = catOrderMap.get(a.categoryId) ?? 99999;
    const catB = catOrderMap.get(b.categoryId) ?? 99999;
    if (catA !== catB) return catA - catB;
    const sortA = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
    const sortB = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
    if (sortA !== sortB) return sortA - sortB;
    return a.name.localeCompare(b.name, ['th-TH', 'en'], { numeric: true });
  });

  const headerRow = [
    'รหัสสินค้า',
    'ชื่อวัตถุดิบ',
    'หมวดหมู่',
    'ราคาต่อหน่วย (บาท)',
    'หน่วยนับ',
    'สถานะการใช้งาน',
    'ลำดับแสดงผล',
  ];

  const dataRows = sortedProducts.map((p) => [
    p.productCode || '',
    p.name,
    catMap.get(p.categoryId) || 'ไม่ระบุ',
    p.price,
    p.unit,
    p.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน',
    p.sortOrder || 1,
  ]);

  const allRows = [headerRow, ...dataRows];

  // 1. Clear existing range to avoid leftovers
  await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}/values/'${encodeURIComponent(tabTitle)}'!A1:Z500:clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // 2. Write new rows
  const writeRes = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/'${encodeURIComponent(tabTitle)}'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: allRows,
      }),
    }
  );

  if (!writeRes.ok) {
    const errJson = await writeRes.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Failed to sync products to Google Sheet (${writeRes.status})`);
  }

  return { rowCount: sortedProducts.length };
}

/**
 * Export Orders History to "ประวัติการสั่งซื้อ" sheet
 */
export async function syncOrdersToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  orders: OrderHistoryRecord[],
  tabTitle = 'ประวัติการสั่งซื้อ'
): Promise<{ rowCount: number }> {
  await ensureSheetTab(accessToken, spreadsheetId, tabTitle);

  const headerRow = [
    'รหัสออเดอร์',
    'วันที่-เวลา',
    'ประเภทออเดอร์',
    'จำนวนรายการ',
    'ยอดรวมสุทธิ (บาท)',
    'รายการสินค้าทั้งหมด',
    'สรุปแยกตามหมวดหมู่',
    'รูปแบบข้อความ LINE',
  ];

  // Sort orders newest first
  const sortedOrders = [...orders].sort((a, b) => b.timestamp - a.timestamp);

  const dataRows = sortedOrders.map((ord) => {
    const dateFormatted = formatThaiDateTime(ord.timestamp);
    const orderTypeText = ord.orderType === 'drink' ? 'เครื่องดื่ม (Order B)' : 'วัตถุดิบครัว (Order A)';
    
    const itemsSummary = (ord.items || [])
      .map((item, idx) => `${idx + 1}. ${item.productName} (${item.quantity} ${item.unit})`)
      .join('\n');

    // Group items by category if available
    const catGroupMap = new Map<string, string[]>();
    (ord.items || []).forEach((item) => {
      const cat = item.categoryName || 'ทั่วไป';
      if (!catGroupMap.has(cat)) catGroupMap.set(cat, []);
      catGroupMap.get(cat)!.push(`${item.productName} ${item.quantity} ${item.unit}`);
    });
    const categorySummary = Array.from(catGroupMap.entries())
      .map(([cat, list]) => `[${cat}]: ${list.join(', ')}`)
      .join('\n');

    const lineText = ord.versionAText || ord.versionBText || '';

    return [
      ord.id,
      dateFormatted,
      orderTypeText,
      ord.itemCount,
      ord.grandTotal,
      itemsSummary,
      categorySummary,
      lineText,
    ];
  });

  const allRows = [headerRow, ...dataRows];

  // Clear & write
  await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}/values/'${encodeURIComponent(tabTitle)}'!A1:Z1000:clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const writeRes = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/'${encodeURIComponent(tabTitle)}'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: allRows,
      }),
    }
  );

  if (!writeRes.ok) {
    const errJson = await writeRes.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Failed to sync orders to Google Sheet (${writeRes.status})`);
  }

  return { rowCount: sortedOrders.length };
}

/**
 * Export Current / Single Order formatted into "คำสั่งซื้อล่าสุด" sheet
 */
export async function exportCurrentOrderToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  orderData: {
    storeName: string;
    branchNote?: string;
    orderType: string;
    timestamp: number;
    items: Array<{
      name: string;
      categoryName?: string;
      quantity: number;
      unit: string;
      price: number;
      lineTotal: number;
    }>;
    grandTotal: number;
  },
  tabTitle = 'คำสั่งซื้อล่าสุด'
): Promise<void> {
  await ensureSheetTab(accessToken, spreadsheetId, tabTitle);

  const dateStr = formatThaiDateTime(orderData.timestamp);

  const headerMeta = [
    ['ร้านค้า:', orderData.storeName, 'สาขา/หมายเหตุ:', orderData.branchNote || '-'],
    ['ประเภทคำสั่งซื้อ:', orderData.orderType, 'วันที่สั่ง:', dateStr],
    ['', '', '', ''],
    ['ลำดับ', 'ชื่อวัตถุดิบ', 'หมวดหมู่', 'จำนวนสั่ง', 'หน่วย', 'ราคา/หน่วย (บาท)', 'รวมเงิน (บาท)'],
  ];

  const itemRows = orderData.items.map((item, idx) => [
    idx + 1,
    item.name,
    item.categoryName || 'ทั่วไป',
    item.quantity,
    item.unit,
    item.price,
    item.lineTotal,
  ]);

  const footerRows = [
    ['', '', '', '', '', 'ยอดรวมทั้งสิ้น:', orderData.grandTotal],
    ['', '', '', '', '', '', ''],
    ['* บันทึกอัตโนมัติจาก Tony\'s Kitchen Web App', '', '', '', '', '', ''],
  ];

  const allRows = [...headerMeta, ...itemRows, ...footerRows];

  await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}/values/'${encodeURIComponent(tabTitle)}'!A1:Z200:clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const writeRes = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/'${encodeURIComponent(tabTitle)}'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: allRows,
      }),
    }
  );

  if (!writeRes.ok) {
    const errJson = await writeRes.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Failed to export current order to Google Sheet (${writeRes.status})`);
  }
}

/**
 * Reads and parses products from a Google Sheet tab
 */
export async function importProductsFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  tabTitle = 'รายการวัตถุดิบ'
): Promise<ImportResult> {
  const url = `${SHEETS_BASE_URL}/${spreadsheetId}/values/'${encodeURIComponent(tabTitle)}'!A1:Z500`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Cannot read sheet data (${res.status})`);
  }

  const data = await res.json();
  const rows: (string | number)[][] = data.values || [];

  if (rows.length < 2) {
    throw new Error('ไม่พบข้อมูลในตาราง (ต้องการอย่างน้อยแถวหัวตารางและ 1 แถวข้อมูล)');
  }

  const headerRow = rows[0].map((h) => String(h).trim().toLowerCase());

  // Find column indices
  let codeIdx = -1;
  let nameIdx = -1;
  let catIdx = -1;
  let priceIdx = -1;
  let unitIdx = -1;
  let statusIdx = -1;
  let sortIdx = -1;

  headerRow.forEach((col, idx) => {
    if (col.includes('รหัส') || col.includes('code') || col.includes('sku')) codeIdx = idx;
    else if (col.includes('ชื่อ') || col.includes('name') || col.includes('วัตถุดิบ') || col.includes('product')) nameIdx = idx;
    else if (col.includes('หมวด') || col.includes('category') || col.includes('กลุ่ม')) catIdx = idx;
    else if (col.includes('ราคา') || col.includes('price')) priceIdx = idx;
    else if (col.includes('หน่วย') || col.includes('unit')) unitIdx = idx;
    else if (col.includes('สถานะ') || col.includes('status') || col.includes('active')) statusIdx = idx;
    else if (col.includes('ลำดับ') || col.includes('sort') || col.includes('order')) sortIdx = idx;
  });

  // Fallbacks if headers not detected by name
  if (nameIdx === -1) nameIdx = 1; // standard pos
  if (catIdx === -1) catIdx = 2;
  if (priceIdx === -1) priceIdx = 3;
  if (unitIdx === -1) unitIdx = 4;

  const products: ImportProductItem[] = [];
  const categoriesSet = new Set<string>();
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawName = String(row[nameIdx] ?? '').trim();
    if (!rawName) continue; // Skip empty row

    const rawCat = String(row[catIdx] ?? '').trim() || 'ทั่วไป';
    const rawPriceStr = String(row[priceIdx] ?? '0').replace(/[^0-9.]/g, '');
    const price = parseFloat(rawPriceStr) || 0;
    const unit = String(row[unitIdx] ?? 'กก.').trim() || 'กก.';
    const productCode = codeIdx >= 0 ? String(row[codeIdx] ?? '').trim() : undefined;

    let isActive = true;
    if (statusIdx >= 0 && row[statusIdx] !== undefined) {
      const statStr = String(row[statusIdx]).trim().toLowerCase();
      if (statStr.includes('ปิด') || statStr.includes('false') || statStr.includes('inactive') || statStr === '0') {
        isActive = false;
      }
    }

    let sortOrder = i;
    if (sortIdx >= 0 && row[sortIdx] !== undefined) {
      const parsedSort = parseInt(String(row[sortIdx]), 10);
      if (!isNaN(parsedSort)) sortOrder = parsedSort;
    }

    categoriesSet.add(rawCat);
    products.push({
      name: rawName,
      categoryName: rawCat,
      price: Math.max(0, price),
      unit,
      productCode: productCode || undefined,
      isActive,
      sortOrder,
    });
  }

  return {
    products,
    categories: Array.from(categoriesSet),
    totalRows: rows.length - 1,
    validRows: products.length,
    errors,
  };
}
