import { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { Customer, Transaction, UserSession, AutoBackupItem } from './types';
import DashboardCharts from './components/DashboardCharts';
import CustomerSection from './components/CustomerSection';
import TransactionSection from './components/TransactionSection';
import AuthScreen from './components/AuthScreen';
import AutoBackupModal from './components/AutoBackupModal';
import MemberSection from './components/MemberSection';
import {
  Users,
  LineChart,
  BookOpen,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Wallet,
  Activity,
  UserCheck,
  CheckCircle,
  Database,
  Download,
  Upload,
  RotateCcw,
  LogOut,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Sun,
  Moon,
} from 'lucide-react';

const SAMPLE_CUSTOMERS: Customer[] = [
  {
    id: 'KH001',
    name: 'Nguyễn Văn Anh',
    phone: '0901234567',
    email: 'nguyenvananh@gmail.com',
    address: 'Quận 1, TP. Hồ Chí Minh',
    type: 'Cá nhân',
    status: 'Hoạt động',
    notes: 'Khách hàng thân thiết từ năm 2024',
    createdAt: '2026-06-01',
    mst: '0102030405',
  },
  {
    id: 'KH002',
    name: 'Bùi Thị Bình',
    phone: '0912345678',
    email: 'buithibinh@gmail.com',
    address: 'Quận 3, TP. Hồ Chí Minh',
    type: 'Cá nhân',
    status: 'Hoạt động',
    notes: 'Ưu tiên chăm sóc dịch vụ bảo trì',
    createdAt: '2026-06-05',
    mst: '',
  },
  {
    id: 'KH003',
    name: 'Công ty Cổ phần Giải pháp Phong Vũ',
    phone: '02873007600',
    email: 'contact@phongvu.vn',
    address: 'Phú Nhuận, TP. Hồ Chí Minh',
    type: 'Doanh nghiệp',
    status: 'Hoạt động',
    notes: 'Khách hàng đối tác doanh nghiệp lớn',
    createdAt: '2026-06-10',
    mst: '0312548965',
  },
];

const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 'GD001',
    customerId: 'KH001',
    customerName: 'Nguyễn Văn Anh',
    amount: 1500000,
    date: '2026-06-10',
    category: 'Bán lẻ',
    paymentMethod: 'Chuyển khoản',
    status: 'Đã thanh toán',
    notes: 'Mua thiết bị điều hòa văn phòng',
    vatRate: '10%',
    totalAmount: 1650000,
  },
  {
    id: 'GD002',
    customerId: 'KH002',
    customerName: 'Bùi Thị Bình',
    amount: 850000,
    date: '2026-06-12',
    category: 'Dịch vụ',
    paymentMethod: 'Thẻ',
    status: 'Đã thanh toán',
    notes: 'Dịch vụ bảo dưỡng máy móc định kỳ',
    vatRate: '8%',
    totalAmount: 918000,
  },
  {
    id: 'GD003',
    customerId: 'KH003',
    customerName: 'Công ty Cổ phần Giải pháp Phong Vũ',
    amount: 12500000,
    date: '2026-06-14',
    category: 'Dự án',
    paymentMethod: 'Chuyển khoản',
    status: 'Đã thanh toán',
    notes: 'Nghiệm thu phần mềm giai đoạn 1',
    vatRate: '0%',
    totalAmount: 12500000,
  },
  {
    id: 'GD004',
    customerId: 'KH001',
    customerName: 'Nguyễn Văn Anh',
    amount: 950000,
    date: '2026-06-15',
    category: 'Bán lẻ',
    paymentMethod: 'Tiền mặt',
    status: 'Chưa thanh toán',
    notes: 'Linh kiện thay thế bổ sung',
    vatRate: 'KCT',
    totalAmount: 950000,
  },
];

export default function App() {
  // App states
  const [session, setSession] = useState<UserSession | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('crm_theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('crm_theme', theme);
  }, [theme]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab ] = useState<'dashboard' | 'customers' | 'transactions' | 'members'>('dashboard');
  const [dashboardTimeframe, setDashboardTimeframe] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  
  // Auto backup states
  const [autoBackups, setAutoBackups] = useState<AutoBackupItem[]>([]);
  const [lastBackupTime, setLastBackupTime] = useState<Date | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // References to keep up to date for background interval loops
  const customersRef = useRef<Customer[]>([]);
  const transactionsRef = useRef<Transaction[]>([]);

  useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  // Central function to create an automated state snapshot
  const createAutoBackup = (reason: string, customCustomers?: Customer[], customTransactions?: Transaction[]) => {
    try {
      const targetCustomers = customCustomers || customersRef.current;
      const targetTransactions = customTransactions || transactionsRef.current;
      
      // Don't back up if we have no actual data yet
      if (targetCustomers.length === 0 && targetTransactions.length === 0) return;

      const stored = localStorage.getItem('crm_auto_backup_history');
      let backups: AutoBackupItem[] = [];
      if (stored) {
        try {
          backups = JSON.parse(stored);
        } catch {
          backups = [];
        }
      }

      // Avoid spamming redundant/identical sequential snapshots to preserve space
      if (backups.length > 0) {
        const latest = backups[0];
        const latestCust = JSON.stringify(latest.data.customers);
        const latestTran = JSON.stringify(latest.data.transactions);
        const currCust = JSON.stringify(targetCustomers);
        const currTran = JSON.stringify(targetTransactions);
        
        if (latestCust === currCust && latestTran === currTran) {
          return;
        }
      }

      const newBackup: AutoBackupItem = {
        id: 'backup_' + Date.now().toString(36),
        timestamp: new Date().toISOString(),
        label: reason,
        customerCount: targetCustomers.length,
        transactionCount: targetTransactions.length,
        data: {
          customers: [...targetCustomers],
          transactions: [...targetTransactions]
        }
      };

      // Keep only current 10 limit
      const updatedBackups = [newBackup, ...backups].slice(0, 10);
      localStorage.setItem('crm_auto_backup_history', JSON.stringify(updatedBackups));
      setAutoBackups(updatedBackups);
      setLastBackupTime(new Date());
    } catch (err) {
      console.warn('Lỗi khi cấu hình sao lưu tự động:', err);
    }
  };

  const handleRestoreFromAutoBackup = (backup: AutoBackupItem) => {
    const isConfirmed = window.confirm(
      `Xác nhận khôi phục toàn bộ cơ sở dữ liệu về checkpoint "${backup.label}" lúc ${new Date(backup.timestamp).toLocaleString('vi-VN')}? \n\nHành động này sẽ ghi đè dữ liệu trang quản lý hiện tại.`
    );
    if (!isConfirmed) return;

    setIsLoading(true);
    setStatusMessage('Đang khôi phục dữ liệu từ bộ nhớ đệm...');
    try {
      // Create first a rescue backup of current state in case user changed mind
      createAutoBackup('Trước khi khôi phục lịch sử');

      localStorage.setItem('crm_customers', JSON.stringify(backup.data.customers));
      localStorage.setItem('crm_transactions', JSON.stringify(backup.data.transactions));
      
      setCustomers(backup.data.customers);
      setTransactions(backup.data.transactions);

      setStatusMessage('Khôi phục dữ liệu thành công!');
      setTimeout(() => setStatusMessage(''), 2000);
      setIsBackupModalOpen(false);
    } catch (err) {
      console.error(err);
      setErrorMessage('Không thể khôi phục dữ liệu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAllAutoBackups = () => {
    const isConfirmed = window.confirm(
      'Xác nhận xóa hoàn toàn toàn bộ lịch sử sao lưu tự động? Hành động này không thể hoàn tác.'
    );
    if (!isConfirmed) return;
    try {
      localStorage.removeItem('crm_auto_backup_history');
      setAutoBackups([]);
      setLastBackupTime(null);
      setStatusMessage('Đã dọn dẹp bộ nhớ sao lưu tự động.');
      setTimeout(() => setStatusMessage(''), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load backups on mount and schedule periodic background tasks
  useEffect(() => {
    try {
      const stored = localStorage.getItem('crm_auto_backup_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        setAutoBackups(parsed);
        if (parsed.length > 0) {
          setLastBackupTime(new Date(parsed[0].timestamp));
        }
      }
    } catch (err) {
      console.error('Không thể load lịch sử sao lưu:', err);
    }

    const intervalId = setInterval(() => {
      createAutoBackup('Sao lưu định kỳ (60s)');
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  // Initialize from Local Storage
  useEffect(() => {
    setIsLoading(true);
    try {
      const storedCustomers = localStorage.getItem('crm_customers');
      const storedTransactions = localStorage.getItem('crm_transactions');
      const storedSession = localStorage.getItem('crm_current_session');

      if (storedSession) {
        setSession(JSON.parse(storedSession));
      }

      if (storedCustomers) {
        setCustomers(JSON.parse(storedCustomers));
      } else {
        localStorage.setItem('crm_customers', JSON.stringify(SAMPLE_CUSTOMERS));
        setCustomers(SAMPLE_CUSTOMERS);
      }

      if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions));
      } else {
        localStorage.setItem('crm_transactions', JSON.stringify(SAMPLE_TRANSACTIONS));
        setTransactions(SAMPLE_TRANSACTIONS);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu từ localStorage', err);
      setErrorMessage('Không thể tải cơ sở dữ liệu lưu trữ cục bộ.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle system logout
  const handleLogout = () => {
    const isConfirmed = window.confirm('Xác nhận đăng xuất khỏi hệ thống phiên làm việc hiện tại?');
    if (!isConfirmed) return;
    localStorage.removeItem('crm_current_session');
    setSession(null);
  };

  // Save changes wrapper for Customers
  const handleSaveCustomersList = async (updatedList: Customer[]) => {
    setIsLoading(true);
    setStatusMessage('Đang lưu thông tin khách hàng...');
    try {
      localStorage.setItem('crm_customers', JSON.stringify(updatedList));
      setCustomers(updatedList);
      createAutoBackup('Cập nhật Danh sách KH', updatedList);
      setStatusMessage('Đã tự động lưu dữ liệu khách hàng!');
      setTimeout(() => setStatusMessage(''), 2000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Lỗi khi ghi dữ liệu khách hàng.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Save changes wrapper for Transactions
  const handleSaveTransactionsList = async (updatedList: Transaction[]) => {
    setIsLoading(true);
    setStatusMessage('Đang cập nhật lịch sử bán lẻ...');
    try {
      localStorage.setItem('crm_transactions', JSON.stringify(updatedList));
      setTransactions(updatedList);
      createAutoBackup('Cập nhật Giao dịch', undefined, updatedList);
      setStatusMessage('Đã ghi nhận giao dịch thành công!');
      setTimeout(() => setStatusMessage(''), 2000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Lỗi khi cập nhật dữ liệu doanh thu.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Reset database to default
  const handleResetData = () => {
    const isConfirmed = window.confirm(
      'Bạn có chắc chắn muốn ĐẶT LẠI toàn bộ dữ liệu về cấu hình mẫu mặc định? Các chỉnh sửa hiện tại sẽ bị xóa sạch.'
    );
    if (!isConfirmed) return;

    setIsLoading(true);
    setStatusMessage('Đang đặt lại dữ liệu mẫu...');
    try {
      createAutoBackup('Trước khi Đặt lại dữ liệu');
      localStorage.setItem('crm_customers', JSON.stringify(SAMPLE_CUSTOMERS));
      localStorage.setItem('crm_transactions', JSON.stringify(SAMPLE_TRANSACTIONS));
      setCustomers(SAMPLE_CUSTOMERS);
      setTransactions(SAMPLE_TRANSACTIONS);
      setStatusMessage('Đặt lại cơ sở dữ liệu mẫu thành công!');
      setTimeout(() => setStatusMessage(''), 2000);
    } catch (err) {
      setErrorMessage('Lỗi phục hồi dữ liệu mẫu.');
    } finally {
      setIsLoading(false);
    }
  };

  // Backup data to JSON file
  const handleExportBackup = () => {
    try {
      const dataStr = JSON.stringify({ customers, transactions }, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `crm_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      setStatusMessage('Đã tải xuống file sao lưu thành công!');
      setTimeout(() => setStatusMessage(''), 2500);
    } catch (err) {
      alert('Không thể xuất file sao lưu.');
    }
  };

  // Restore data from JSON file
  const handleImportBackup = (e: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (event) => {
      try {
        const obj = JSON.parse(event.target?.result as string);
        if (Array.isArray(obj.customers) && Array.isArray(obj.transactions)) {
          const isConfirmed = window.confirm(
            `Nhận thấy tập tin hợp lệ: ${obj.customers.length} khách hàng & ${obj.transactions.length} giao dịch. Bạn có muốn khôi phục và ghi đè?`
          );
          if (!isConfirmed) return;

          createAutoBackup('Trước khi Nhập tệp sao lưu');
          localStorage.setItem('crm_customers', JSON.stringify(obj.customers));
          localStorage.setItem('crm_transactions', JSON.stringify(obj.transactions));
          setCustomers(obj.customers);
          setTransactions(obj.transactions);
          
          setStatusMessage('Khôi phục dữ liệu sao lưu thành công!');
          setTimeout(() => setStatusMessage(''), 3000);
        } else {
          alert('Định dạng tệp sao lưu JSON không hợp lệ. Phải chứa danh sách khách hàng và giao dịch.');
        }
      } catch (err) {
        alert('Không thể đọc file hoặc dữ liệu JSON bị hỏng.');
      }
    };
    fileReader.readAsText(files[0]);
    // Reset file input value so same file can be loaded again
    e.target.value = '';
  };

  // Dynamic filtered transactions for reporting
  const dashboardFilteredTransactions = useMemo(() => {
    const today = new Date();
    const todayStr = '2026-06-15'; // Target anchor specified by mock system
    
    // Calculate Monday of the current week (June 15, 2026 is Monday)
    const monday = new Date('2026-06-15T00:00:00');
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date('2026-06-21T23:59:59');
    sunday.setHours(23, 59, 59, 999);

    const checkYearMonth = '2026-06';
    const checkYear = '2026';

    return transactions.filter((t) => {
      if (dashboardTimeframe === 'all') return true;
      if (dashboardTimeframe === 'today') {
        return t.date === todayStr;
      }
      if (dashboardTimeframe === 'week') {
        const d = new Date(t.date + 'T12:00:00');
        return d >= monday && d <= sunday;
      }
      if (dashboardTimeframe === 'month') {
        return t.date.startsWith(checkYearMonth);
      }
      if (dashboardTimeframe === 'year') {
        return t.date.startsWith(checkYear);
      }
      return true;
    });
  }, [transactions, dashboardTimeframe]);

  const timeframeSubtitle = useMemo(() => {
    switch (dashboardTimeframe) {
      case 'today':
        return {
          period: 'Hôm nay (15/06)',
          revenueDesc: 'Doanh thu hôm nay',
          pendingDesc: 'Công nợ phát sinh hôm nay',
          clientsDesc: 'Khách có giao dịch hôm nay',
          avgDesc: 'Trung bình đơn hàng hôm nay',
        };
      case 'week':
        return {
          period: 'Tuần này (15/06 - 21/06)',
          revenueDesc: 'Doanh thu tuần này',
          pendingDesc: 'Công nợ phát sinh tuần này',
          clientsDesc: 'Khách hoạt động tuần này',
          avgDesc: 'Trung bình đơn hàng tuần này',
        };
      case 'month':
        return {
          period: 'Tháng này (Tháng 06/2026)',
          revenueDesc: 'Doanh thu tháng này',
          pendingDesc: 'Công nợ phát sinh tháng này',
          clientsDesc: 'Khách hoạt động tháng này',
          avgDesc: 'Trung bình đơn hàng tháng này',
        };
      case 'year':
        return {
          period: 'Năm nay (2026)',
          revenueDesc: 'Doanh thu năm nay',
          pendingDesc: 'Công nợ phát sinh năm nay',
          clientsDesc: 'Khách hoạt động năm nay',
          avgDesc: 'Trung bình đơn hàng năm nay',
        };
      default:
        return {
          period: 'Tất cả thời gian',
          revenueDesc: 'Tổng doanh thu thực tế',
          pendingDesc: 'Tổng công nợ chưa thu',
          clientsDesc: 'Khách hàng đang hoạt động',
          avgDesc: 'Giá trị đơn hàng trung bình',
        };
    }
  }, [dashboardTimeframe]);

  // KPI calculations
  const stats = useMemo(() => {
    const periodPaid = dashboardFilteredTransactions.filter((t) => t.status === 'Đã thanh toán');
    const periodUnpaid = dashboardFilteredTransactions.filter((t) => t.status === 'Chưa thanh toán');

    const totalRev = periodPaid.reduce((sum, t) => sum + (t.totalAmount ?? t.amount), 0);
    const pendingRev = periodUnpaid.reduce((sum, t) => sum + (t.totalAmount ?? t.amount), 0);
    
    const totalClients = customers.length;
    const activeClients = customers.filter((c) => c.status === 'Hoạt động').length;

    const uniqueClientIdsInPeriod = new Set(dashboardFilteredTransactions.map((t) => t.customerId));
    const activeClientsInPeriod = uniqueClientIdsInPeriod.size;

    const avgOrderValue = periodPaid.length > 0 ? (totalRev / periodPaid.length) : 0;

    return {
      totalRev,
      pendingRev,
      totalClients,
      activeClients,
      activeClientsInPeriod,
      avgOrderValue,
      totalTransactions: dashboardFilteredTransactions.length,
      paidTransactions: periodPaid.length,
    };
  }, [dashboardFilteredTransactions, customers]);

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  if (!session) {
    return (
      <AuthScreen 
        onLoginSuccess={setSession} 
        theme={theme} 
        onToggleTheme={() => setTheme((p) => (p === 'light' ? 'dark' : 'light'))} 
      />
    );
  }

  return (
    <div id="main-app-container" className="min-h-screen bg-gray-50/50 dark:bg-slate-950 text-gray-850 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Professional Executive Header */}
      <header className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 z-10 px-6 py-4 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white p-2.5 rounded-xl flex items-center justify-center shadow-sm">
              <Database className="w-5.5 h-5.5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                Quản lý Khách hàng & Doanh thu
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-medium font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Trạng thái: Thiết bị ngoại tuyến hoạt động (Lưu trữ Cục bộ an toàn)</span>
              </div>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="flex flex-wrap items-center gap-3.5">
            {/* Theme Toggle Button */}
            <button
              id="btn-toggle-theme"
              onClick={() => setTheme((p) => (p === 'light' ? 'dark' : 'light'))}
              className="flex items-center justify-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-2xs active:scale-95"
              title={theme === 'light' ? 'Chuyển sang giao diện tối (Dark Mode)' : 'Chuyển sang giao diện sáng (Light Mode)'}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-slate-700" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500 animate-pulse" />
              )}
            </button>

            {/* Session User Info Badge */}
            <div id="session-badge" className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl pl-3 pr-2 py-1.5 text-slate-700 dark:text-gray-300 text-xs shadow-xs">
              <div className="flex flex-col text-left">
                <span className="font-bold text-slate-900 dark:text-white leading-tight">{session.fullName}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5 mt-0.5 select-none">
                  {session.role === 'admin' ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-semibold text-blue-750 dark:text-blue-400">Quản trị viên</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-semibold text-amber-700 dark:text-amber-400">Nhân viên</span>
                    </>
                  )}
                </span>
              </div>
              <button
                id="btn-auth-logout"
                onClick={handleLogout}
                className="p-1.5 px-2.5 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 dark:text-gray-400 hover:text-rose-700 dark:hover:text-rose-350 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-rose-100 dark:hover:border-rose-900 font-bold transition-all ml-2 cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>

            {/* Database indicator */}
            <div className="flex items-center gap-1.5 bg-emerald-55 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl px-3 py-1.5 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Cơ sở dữ liệu an toàn</span>
            </div>

            {/* Auto-backup trigger button and mini status pulse indicator */}
            <button
              id="btn-auto-backup-trigger"
              onClick={() => setIsBackupModalOpen(true)}
              className="flex items-center gap-1.5 bg-blue-50/70 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-bold px-3 py-1.5 border border-blue-200/50 dark:border-blue-900/40 rounded-xl transition-all cursor-pointer shadow-sm relative active:scale-98"
              title="Nhấp để hiển thị lịch sử sao lưu tự động hệ thống"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span>Sao lưu: {lastBackupTime ? lastBackupTime.toLocaleTimeString('vi-VN') : 'Sẵn sàng'}</span>
            </button>

            {/* Backup & Restore and Reset Actions */}
            <div className="flex items-center gap-2">
              <button
                id="btn-export-backup"
                onClick={handleExportBackup}
                disabled={isLoading}
                className="flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold text-xs px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl transition-colors cursor-pointer shadow-sm"
                title="Tải tệp JSON lưu trữ về máy tính"
              >
                <Download className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span className="hidden sm:inline">Sao lưu file</span>
              </button>

              <button
                id="btn-import-trigger"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold text-xs px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl transition-colors cursor-pointer shadow-sm"
                title="Khôi phục dữ liệu từ tệp sao lưu JSON"
              >
                <Upload className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span className="hidden sm:inline">Khôi phục</span>
              </button>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportBackup}
                accept=".json"
                className="hidden"
              />

              <button
                id="btn-reset-sample"
                onClick={handleResetData}
                disabled={isLoading}
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3 py-2 border border-rose-150 rounded-xl transition-colors cursor-pointer shadow-sm"
                title="Khôi phục lại dữ liệu mẫu gốc"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại mẫu</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Sync Status Notifications messages */}
        {statusMessage && (
          <div id="toast-status" className="bg-blue-600 text-white text-xs py-2.5 px-5 rounded-2xl flex items-center gap-2 shadow-md max-w-fit mx-auto transition-all">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span className="font-bold">{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div id="toast-error" className="bg-red-50 border border-red-100 text-red-700 text-xs p-4 rounded-2xl flex items-start gap-2.5 max-w-2xl mx-auto shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Lỗi cơ sở dữ liệu:</p>
              <p className="text-gray-650 text-[11px] leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-gray-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'dashboard'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-500'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <LineChart className="w-4 h-4" />
            Báo cáo & Tổng quan
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'customers'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-500'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Khách hàng ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'transactions'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-500'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Doanh thu / Bán lẻ ({transactions.length})
          </button>
          <button
            id="tab-btn-members"
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-500'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            Thành viên & Quyền hạn
          </button>
        </div>

        {/* Content Render Region */}
        <div id="tab-content" className="min-h-[400px]">
          {activeTab === 'dashboard' && (
            <div id="tab-dashboard" className="space-y-6">
              {/* Premium Time Range Filter */}
              <div id="dashboard-timeframe-filters" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5.5 h-5.5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Phạm vi thời gian báo cáo</h2>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Bảng điều khiển và biểu đồ tự động lọc theo thời gian được chọn</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 dark:bg-slate-950 p-1.5 rounded-xl border border-gray-100/80 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDashboardTimeframe('all')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      dashboardTimeframe === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardTimeframe('today')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      dashboardTimeframe === 'today'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardTimeframe('week')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      dashboardTimeframe === 'week'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    Tuần này
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardTimeframe('month')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      dashboardTimeframe === 'month'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    Tháng này
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardTimeframe('year')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      dashboardTimeframe === 'year'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    Năm nay
                  </button>
                </div>
              </div>

              {/* Executive Summary Metrics Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Revenue realized in current scope */}
                <div className="bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 p-5 rounded-2xl border shadow-sm flex items-center gap-4 transition-colors">
                  <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Doanh thu thực nhận</h3>
                    <p className="text-xl font-extrabold text-blue-650 dark:text-blue-400 mt-1">{formatVND(stats.totalRev)}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1">{timeframeSubtitle.revenueDesc}</p>
                  </div>
                </div>

                {/* Metric 2: Uncollected balances / Outstanding receivable in scope */}
                <div className="bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 p-5 rounded-2xl border shadow-sm flex items-center gap-4 transition-colors">
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Công nợ chưa thu</h3>
                    <p className="text-xl font-extrabold text-amber-700 dark:text-amber-400 mt-1">{formatVND(stats.pendingRev)}</p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">{timeframeSubtitle.pendingDesc}</p>
                  </div>
                </div>

                {/* Metric 3: Active and engaged accounts in period */}
                <div className="bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 p-5 rounded-2xl border shadow-sm flex items-center gap-4 transition-colors">
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Khách hàng hoạt động</h3>
                    {dashboardTimeframe === 'all' ? (
                      <>
                        <p className="text-xl font-extrabold text-emerald-750 dark:text-emerald-400 mt-1">
                          {stats.activeClients} <span className="text-xs font-normal text-gray-450 dark:text-gray-505">/ {stats.totalClients}</span>
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{((stats.activeClients / (stats.totalClients || 1)) * 100).toFixed(0)}% tổng số khách hàng</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-extrabold text-emerald-750 dark:text-emerald-400 mt-1">
                          {stats.activeClientsInPeriod} <span className="text-xs font-normal text-gray-450 dark:text-gray-505">khách hàng</span>
                        </p>
                        <p className="text-[10px] text-gray-550 dark:text-gray-400 font-medium mt-1">{timeframeSubtitle.clientsDesc}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Metric 4: Average ticket / order size */}
                <div className="bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 p-5 rounded-2xl border shadow-sm flex items-center gap-4 transition-colors">
                  <div className="p-3.5 bg-purple-50 dark:bg-purple-955/20 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Giá trị trung bình</h3>
                    <p className="text-xl font-extrabold text-purple-750 dark:text-purple-400 mt-1">{formatVND(stats.avgOrderValue)}</p>
                    <p className="text-[10px] text-gray-550 dark:text-gray-400 font-medium mt-1">{timeframeSubtitle.avgDesc}</p>
                  </div>
                </div>
              </div>

              {/* Data Visualization Charts component */}
              <DashboardCharts transactions={dashboardFilteredTransactions} customers={customers} />
            </div>
          )}

          {activeTab === 'customers' && (
            <div id="tab-customers">
              <CustomerSection
                customers={customers}
                onSaveCustomers={handleSaveCustomersList}
                isLoading={isLoading}
              />
            </div>
          )}

          {activeTab === 'transactions' && (
            <div id="tab-transactions">
              <TransactionSection
                transactions={transactions}
                customers={customers}
                onSaveTransactions={handleSaveTransactionsList}
                isLoading={isLoading}
              />
            </div>
          )}

          {activeTab === 'members' && session && (
            <div id="tab-members">
              <MemberSection
                currentSession={session}
                onShowNotification={(msg, isError) => {
                  if (isError) {
                    setErrorMessage(msg);
                    setTimeout(() => setErrorMessage(''), 4000);
                  } else {
                    setStatusMessage(msg);
                    setTimeout(() => setStatusMessage(''), 3000);
                  }
                }}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="bg-white border-t border-gray-150 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-gray-500 text-center sm:text-left">
          <p>© 2026 Customer & Revenue Manager. Lưu trữ ngoại tuyến an toàn.</p>
          <div className="flex items-center justify-center gap-4 text-blue-600 font-bold">
            <span>Phiên bản Offline-First</span>
          </div>
        </div>
      </footer>

      {/* Auto Backup Manager Control Modal Overlay */}
      <AutoBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        backups={autoBackups}
        onRestore={handleRestoreFromAutoBackup}
        onClearAll={handleClearAllAutoBackups}
        lastBackupTime={lastBackupTime}
        onForceBackupNow={() => createAutoBackup('Sao lưu thủ công tức thời')}
      />
    </div>
  );
}
