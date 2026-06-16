export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  type: 'Cá nhân' | 'Doanh nghiệp';
  status: 'Hoạt động' | 'Không hoạt động';
  notes: string;
  createdAt: string;
  mst?: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string; // e.g. Bán lẻ, Dịch vụ, Dự án, Khác
  paymentMethod: 'Tiền mặt' | 'Chuyển khoản' | 'Thẻ';
  status: 'Đã thanh toán' | 'Chưa thanh toán';
  notes: string;
  vatRate?: '0%' | '5%' | '8%' | '10%' | 'KCT';
  totalAmount?: number;
}

export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  sheets: string[];
}

export interface UserAccount {
  username: string;
  fullName: string;
  passwordHash: string;
  role: 'admin' | 'nhan_vien';
  createdAt: string;
}

export interface UserSession {
  username: string;
  fullName: string;
  role: 'admin' | 'nhan_vien';
  loginTime: string;
}

export interface AutoBackupItem {
  id: string;
  timestamp: string;
  label: string;
  customerCount: number;
  transactionCount: number;
  data: {
    customers: Customer[];
    transactions: Transaction[];
  };
}


