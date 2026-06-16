import { Customer, Transaction } from '../types';

// Standard sheet names
export const CLIENTS_SHEET_NAME = 'Khách hàng';
export const REVENUE_SHEET_NAME = 'Doanh thu';

/**
 * Handle HTTP response and return JSON or throw error
 */
async function handleResponse(response: Response, contextMessage: string) {
  if (!response.ok) {
    const errText = await response.text();
    let errorDetail = errText;
    try {
      const parsed = JSON.parse(errText);
      errorDetail = parsed.error?.message || errText;
    } catch {}
    throw new Error(`${contextMessage}: ${response.status} ${response.statusText} - ${errorDetail}`);
  }
  return response.json();
}

/**
 * Fetches spreadsheet info including sheet titles
 */
export async function getSpreadsheetDetails(spreadsheetId: string, token: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleResponse(res, 'Không thể tải thông tin Bảng tính');
  const sheets: string[] = data.sheets?.map((s: any) => s.properties?.title as string) || [];
  return {
    spreadsheetId,
    title: data.properties?.title || 'Bảng tính',
    sheets,
  };
}

/**
 * Creates the required sheets ('Khách hàng' and 'Doanh thu') if not present
 */
export async function initializeRequiredSheets(spreadsheetId: string, token: string, existingSheets: string[]) {
  const requests: any[] = [];
  
  if (!existingSheets.includes(CLIENTS_SHEET_NAME)) {
    requests.push({
      addSheet: {
        properties: { title: CLIENTS_SHEET_NAME },
      },
    });
  }
  
  if (!existingSheets.includes(REVENUE_SHEET_NAME)) {
    requests.push({
      addSheet: {
        properties: { title: REVENUE_SHEET_NAME },
      },
    });
  }

  // 1. Add sheets if any are missing
  if (requests.length > 0) {
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const updateRes = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
    await handleResponse(updateRes, 'Không thể tạo các trang tính mới');
  }

  // 2. Write headers for sheets
  const headerRequests = [
    {
      range: `${CLIENTS_SHEET_NAME}!A1:I1`,
      values: [['Mã khách hàng', 'Tên khách hàng', 'Số điện thoại', 'Email', 'Địa chỉ', 'Nhóm khách hàng', 'Trạng thái', 'Ghi chú', 'Ngày tạo']],
    },
    {
      range: `${REVENUE_SHEET_NAME}!A1:I1`,
      values: [['Mã giao dịch', 'Mã khách hàng', 'Tên khách hàng', 'Số tiền', 'Ngày giao dịch', 'Danh mục', 'Phương thức thanh toán', 'Trạng thái thanh toán', 'Ghi chú']],
    }
  ];

  const valueUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const valueRes = await fetch(valueUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: headerRequests,
    }),
  });
  await handleResponse(valueRes, 'Không thể thiết lập các cột tiêu đề');
}

/**
 * Create a brand new Spreadsheet in Google Drive and initialize it with templates
 */
export async function createSpreadsheet(token: string, title: string = 'Quản lý Khách hàng & Doanh thu') {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
    }),
  });
  const data = await handleResponse(res, 'Không thể tạo tệp Bảng tính mới');
  const spreadsheetId = data.spreadsheetId;
  
  // Initialize headers
  await initializeRequiredSheets(spreadsheetId, token, ['Sheet1']); // Sheet1 is created by default
  
  // Try to delete default Sheet1 to make it neat, if it's there
  try {
    const details = await getSpreadsheetDetails(spreadsheetId, token);
    const sheet1 = data.sheets?.find((s: any) => s.properties?.title === 'Sheet1');
    if (sheet1 && details.sheets.length > 1) {
      const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
      await fetch(deleteUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            deleteSheet: { sheetId: sheet1.properties.sheetId }
          }]
        }),
      });
    }
  } catch (e) {
    console.warn('Could not delete default Sheet1 (non-blocking):', e);
  }

  return spreadsheetId;
}

/**
 * Fetch Customer records
 */
export async function fetchCustomers(spreadsheetId: string, token: string): Promise<Customer[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${CLIENTS_SHEET_NAME}!A2:I1000`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (res.status === 404) {
    // Maybe sheet doesn't exist yet, initialize it
    await initializeRequiredSheets(spreadsheetId, token, []);
    return [];
  }
  
  const data = await handleResponse(res, 'Không thể lấy thông tin danh sách khách hàng');
  const rows = data.values || [];
  
  return rows.map((row: any[]): Customer => ({
    id: row[0] || '',
    name: row[1] || '',
    phone: row[2] || '',
    email: row[3] || '',
    address: row[4] || '',
    type: (row[5] === 'Doanh nghiệp' ? 'Doanh nghiệp' : 'Cá nhân'),
    status: (row[6] === 'Không hoạt động' ? 'Không hoạt động' : 'Hoạt động'),
    notes: row[7] || '',
    createdAt: row[8] || '',
  }));
}

/**
 * Fetch Transaction records
 */
export async function fetchTransactions(spreadsheetId: string, token: string): Promise<Transaction[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${REVENUE_SHEET_NAME}!A2:I1000`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (res.status === 404) {
    await initializeRequiredSheets(spreadsheetId, token, []);
    return [];
  }
  
  const data = await handleResponse(res, 'Không thể lấy thông tin doanh số giao dịch');
  const rows = data.values || [];
  
  return rows.map((row: any[]): Transaction => ({
    id: row[0] || '',
    customerId: row[1] || '',
    customerName: row[2] || '',
    amount: Number(row[3]) || 0,
    date: row[4] || '',
    category: row[5] || 'Khác',
    paymentMethod: (row[6] === 'Chuyển khoản' ? 'Chuyển khoản' : row[6] === 'Thẻ' ? 'Thẻ' : 'Tiền mặt'),
    status: (row[7] === 'Chưa thanh toán' ? 'Chưa thanh toán' : 'Đã thanh toán'),
    notes: row[8] || '',
  }));
}

/**
 * Complete overwrite of all Customer records (safest, atomic CRUD)
 */
export async function saveAllCustomers(spreadsheetId: string, token: string, customers: Customer[]): Promise<void> {
  // First clear old contents
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${CLIENTS_SHEET_NAME}!A2:I1000:clear`;
  const clearRes = await fetch(clearUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  await handleResponse(clearRes, 'Không thể dọn sạch dữ liệu khách hàng cũ');

  if (customers.length === 0) return;

  // Then upload newly synced contents
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${CLIENTS_SHEET_NAME}!A2?valueInputOption=USER_ENTERED`;
  const writeRes = await fetch(writeUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: `${CLIENTS_SHEET_NAME}!A2`,
      majorDimension: 'ROWS',
      values: customers.map(c => [
        c.id,
        c.name,
        c.phone,
        c.email,
        c.address,
        c.type,
        c.status,
        c.notes,
        c.createdAt
      ]),
    }),
  });
  await handleResponse(writeRes, 'Không thể lưu danh nhân dữ liệu khách hàng mới');
}

/**
 * Complete overwrite of all Transaction records (safest, atomic CRUD)
 */
export async function saveAllTransactions(spreadsheetId: string, token: string, transactions: Transaction[]): Promise<void> {
  // First clear old contents
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${REVENUE_SHEET_NAME}!A2:I1000:clear`;
  const clearRes = await fetch(clearUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  await handleResponse(clearRes, 'Không thể dọn sạch doanh thu giao dịch cũ');

  if (transactions.length === 0) return;

  // Then upload newly synced contents
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${REVENUE_SHEET_NAME}!A2?valueInputOption=USER_ENTERED`;
  const writeRes = await fetch(writeUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: `${REVENUE_SHEET_NAME}!A2`,
      majorDimension: 'ROWS',
      values: transactions.map(t => [
        t.id,
        t.customerId,
        t.customerName,
        t.amount.toString(),
        t.date,
        t.category,
        t.paymentMethod,
        t.status,
        t.notes
      ]),
    }),
  });
  await handleResponse(writeRes, 'Không thể lưu doanh thu giao dịch mới');
}
