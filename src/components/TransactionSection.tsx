import { useState, useMemo, FormEvent } from 'react';
import { Transaction, Customer } from '../types';
import { Search, Plus, Edit2, Trash2, Calendar, DollarSign, Filter, X, Eye, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface TransactionSectionProps {
  transactions: Transaction[];
  customers: Customer[];
  onSaveTransactions: (updatedList: Transaction[]) => Promise<void>;
  isLoading: boolean;
}

const CATEGORIES = ['Bán lẻ', 'Dịch vụ', 'Dự án', 'Bán sỉ', 'Khác'];

export default function TransactionSection({ transactions, customers, onSaveTransactions, isLoading }: TransactionSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals / Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formVatRate, setFormVatRate] = useState<'0%' | '5%' | '8%' | '10%' | 'KCT'>('0%');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState('Bán lẻ');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'Tiền mặt' | 'Chuyển khoản' | 'Thẻ'>('Chuyển khoản');
  const [formStatus, setFormStatus] = useState<'Đã thanh toán' | 'Chưa thanh toán'>('Đã thanh toán');
  const [formNotes, setFormNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Calculate VAT Amount
  const calculateVatAmount = (amount: number, vatRate: string): number => {
    switch (vatRate) {
      case '5%':
        return Math.round(amount * 0.05);
      case '8%':
        return Math.round(amount * 0.08);
      case '10%':
        return Math.round(amount * 0.10);
      case '0%':
      case 'KCT':
      default:
        return 0;
    }
  };

  // Calculate Total Amount
  const calculateTotalAmount = (amount: number, vatRate: '0%' | '5%' | '8%' | '10%' | 'KCT'): number => {
    return amount + calculateVatAmount(amount, vatRate);
  };

  // Select customer callback
  const handleCustomerSelect = (customerId: string) => {
    const selected = customers.find(c => c.id === customerId);
    if (selected) {
      setFormCustomerId(selected.id);
      setFormCustomerName(selected.name);
    } else {
      setFormCustomerId('');
      setFormCustomerName('');
    }
  };

  // Format currency
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date)) // descending date
      .filter((t) => {
        const matchSearch =
          t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.notes.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchCategory = filterCategory === 'all' || t.category === filterCategory;
        const matchPayment = filterPayment === 'all' || t.paymentMethod === filterPayment;
        const matchStatus = filterStatus === 'all' || t.status === filterStatus;
        
        let matchDate = true;
        if (startDate) {
          matchDate = matchDate && t.date >= startDate;
        }
        if (endDate) {
          matchDate = matchDate && t.date <= endDate;
        }
        
        return matchSearch && matchCategory && matchPayment && matchStatus && matchDate;
      });
  }, [transactions, searchQuery, filterCategory, filterPayment, filterStatus, startDate, endDate]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingTransaction(null);
    setFormCustomerId('');
    setFormCustomerName('');
    setFormAmount('');
    setFormVatRate('0%');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCategory('Bán lẻ');
    setFormPaymentMethod('Chuyển khoản');
    setFormStatus('Đã thanh toán');
    setFormNotes('');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormCustomerId(transaction.customerId);
    setFormCustomerName(transaction.customerName);
    setFormAmount(transaction.amount);
    setFormVatRate(transaction.vatRate || '0%');
    setFormDate(transaction.date);
    setFormCategory(transaction.category);
    setFormPaymentMethod(transaction.paymentMethod);
    setFormStatus(transaction.status);
    setFormNotes(transaction.notes);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  // Submit form
  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formCustomerName.trim()) {
      setErrorMessage('Vui lòng chọn hoặc nhập tên khách hàng');
      return;
    }
    if (formAmount === '' || Number(formAmount) <= 0) {
      setErrorMessage('Vui lòng nhập số tiền giao dịch hợp lệ (> 0)');
      return;
    }
    if (!formDate) {
      setErrorMessage('Vui lòng chọn ngày giao dịch');
      return;
    }

    const updatedList = [...transactions];
    
    const calculatedTotal = calculateTotalAmount(Number(formAmount), formVatRate);

    if (editingTransaction) {
      // User Confirmation for Mutation
      const isConfirmed = window.confirm(
        `Xác nhận lưu thay đổi hóa đơn giao dịch "${editingTransaction.id}"? Thay đổi này sẽ lưu vào bộ nhớ cục bộ.`
      );
      if (!isConfirmed) return;

      const idx = updatedList.findIndex((t) => t.id === editingTransaction.id);
      if (idx > -1) {
        updatedList[idx] = {
          ...editingTransaction,
          customerId: formCustomerId,
          customerName: formCustomerName.trim(),
          amount: Number(formAmount),
          vatRate: formVatRate,
          totalAmount: calculatedTotal,
          date: formDate,
          category: formCategory,
          paymentMethod: formPaymentMethod,
          status: formStatus,
          notes: formNotes.trim(),
        };
      }
    } else {
      // Create new transaction
      const newId = `GD${String(transactions.length + 1).padStart(3, '0')}`;
      const newTransaction: Transaction = {
        id: newId,
        customerId: formCustomerId || 'KH_LE', // Khách lẻ
        customerName: formCustomerName.trim(),
        amount: Number(formAmount),
        vatRate: formVatRate,
        totalAmount: calculatedTotal,
        date: formDate,
        category: formCategory,
        paymentMethod: formPaymentMethod,
        status: formStatus,
        notes: formNotes.trim(),
      };

      const isConfirmed = window.confirm(
        `Xác nhận ghi nhận giao dịch mới trị giá ${formatVND(calculatedTotal)} (bao gồm VAT) cho khách hàng "${newTransaction.customerName}"?`
      );
      if (!isConfirmed) return;

      updatedList.push(newTransaction);
    }

    try {
      await onSaveTransactions(updatedList);
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi ghi nhận dữ liệu vào Sheets');
    }
  };

  // Delete transaction handler
  const handleDeleteTransaction = async (transaction: Transaction) => {
    const isConfirmed = window.confirm(
      `CẢNH BÁO: Bạn có muốn xóa chứng từ giao dịch "${transaction.id}" trị giá ${formatVND(transaction.totalAmount ?? transaction.amount)}? \nDữ liệu sẽ bị xóa vĩnh viễn khỏi bộ nhớ cục bộ.`
    );
    if (!isConfirmed) return;

    const updatedList = transactions.filter((t) => t.id !== transaction.id);
    try {
      await onSaveTransactions(updatedList);
    } catch (err: any) {
      alert(`Không thể xóa giao dịch: ${err.message}`);
    }
  };

  return (
    <div id="transaction-section-root" className="space-y-6">
      {/* Date Filters and Search Panel */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm giao dịch, tên khách, ghi chú..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-add-transaction"
              onClick={handleOpenCreateModal}
              disabled={isLoading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Ghi nhận doanh thu
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="pt-3 border-t border-gray-50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category selection */}
            <select
              className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">Tất cả danh mục</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Payment Method selection */}
            <select
              className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
            >
              <option value="all">Tất cả thanh toán</option>
              <option value="Tiền mặt">Tiền mặt</option>
              <option value="Chuyển khoản">Chuyển khoản</option>
              <option value="Thẻ border border-gray-100">Thẻ</option>
            </select>

            {/* Status selection */}
            <select
              className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Đã thanh toán">Đã thanh toán</option>
              <option value="Chưa thanh toán">Chưa thanh toán</option>
            </select>
          </div>

          {/* Date range selection */}
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-gray-400" /> Từ</span>
            <input
              type="date"
              className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-gray-700 font-medium focus:outline-hidden"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span>Đến</span>
            <input
              type="date"
              className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-gray-700 font-medium focus:outline-hidden"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="p-1 hover:bg-gray-100 rounded-md text-red-500"
                title="Xóa bộ lọc ngày"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100">
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã GD</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Khách hàng</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ngày GD</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Danh mục</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hình thức</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Tiền trước thuế</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">VAT</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right font-bold text-blue-700">Tổng tiền</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Thanh toán</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400 text-sm">
                    {isLoading ? 'Đang cập nhật danh sách...' : 'Không có giao dịch nào phù hợp với bộ lọc tìm kiếm'}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const currentVatAmount = calculateVatAmount(t.amount, t.vatRate || '0%');
                  const currentTotalAmount = t.totalAmount ?? (t.amount + currentVatAmount);
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                          {t.id}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-gray-800">{t.customerName}</div>
                        <div className="text-[11px] font-mono text-gray-400 mt-0.5">{t.customerId}</div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-xs text-gray-600 font-medium">
                        {t.date.split('-').reverse().join('/')}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="text-xs bg-slate-50 text-slate-700 border border-slate-100 font-semibold px-2 py-0.5 rounded-md">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-xs font-medium text-gray-600">
                        {t.paymentMethod}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-right text-xs font-medium text-gray-750">
                        {formatVND(t.amount)}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-center">
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                          {t.vatRate || '0%'}
                        </span>
                        {currentVatAmount > 0 && (
                          <div className="text-[10px] text-gray-400 mt-0.5">({formatVND(currentVatAmount)})</div>
                        )}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-right text-sm font-extrabold text-blue-650">
                        {formatVND(currentTotalAmount)}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            t.status === 'Đã thanh toán'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}
                        >
                          {t.status === 'Đã thanh toán' ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5" />
                          )}
                          {t.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <button
                            id={`btn-edit-tx-${t.id}`}
                            onClick={() => handleOpenEditModal(t)}
                            disabled={isLoading}
                            className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-blue-600 rounded-lg border border-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
                            title="Sửa chứng từ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-tx-${t.id}`}
                            onClick={() => handleDeleteTransaction(t)}
                            disabled={isLoading}
                            className="p-1.5 bg-red-50 hover:bg-red-100/70 text-red-600 rounded-lg border border-red-100/30 transition-colors disabled:opacity-50 cursor-pointer"
                            title="Xóa chứng từ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-semibold text-gray-600">
          <span>Khớp bộ lọc: {filteredTransactions.length} hóa đơn</span>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <span>
              Tổng tiền gốc: <span className="text-gray-800 font-bold">{formatVND(filteredTransactions.filter(t => t.status === 'Đã thanh toán').reduce((acc, t) => acc + t.amount, 0))}</span>
            </span>
            <span className="text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
              Tổng thực thu (gồm VAT): {formatVND(filteredTransactions.filter(t => t.status === 'Đã thanh toán').reduce((acc, t) => acc + (t.totalAmount ?? (t.amount + calculateVatAmount(t.amount, t.vatRate || '0%'))), 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Create/Edit Transaction Modal */}
      {isModalOpen && (
        <div id="tx-modal-backdrop" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">
                {editingTransaction ? 'Cập nhật hóa đơn giao dịch' : 'Ghi nhận doanh số mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl">
                  {errorMessage}
                </div>
              )}

              {/* Customer Link Choice */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Khách hàng liên đới *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    className="col-span-2 px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-800 font-medium"
                    value={formCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                  >
                    <option value="">-- Chọn khách từ danh mục --</option>
                    <option value="KH_LE">Khách hàng vãng lai (Khách lẻ)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.id}] {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                  
                  {/* Manual Override inputs */}
                  <input
                    type="text"
                    required
                    placeholder="Tên khách hàng"
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-800"
                    value={formCustomerName}
                    onChange={(e) => {
                      setFormCustomerName(e.target.value);
                      if (formCustomerId !== '' && formCustomerId !== 'KH_LE') {
                        setFormCustomerId(''); // detached if manually renamed
                      }
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Chọn từ danh mục khách hàng đã đăng ký hoặc gõ trực tiếp tên khách mới</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Số tiền trước thuế (VND) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Ví dụ: 1500000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-800 font-bold"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  {typeof formAmount === 'number' && (
                    <span className="text-xs text-gray-400 mt-1 font-semibold block">{formatVND(formAmount)}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Thuế suất VAT *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-800 font-semibold"
                    value={formVatRate}
                    onChange={(e) => setFormVatRate(e.target.value as any)}
                  >
                    <option value="0%">0%</option>
                    <option value="5%">5%</option>
                    <option value="8%">8%</option>
                    <option value="10%">10%</option>
                    <option value="KCT">KCT (Không chịu thuế)</option>
                  </select>
                  {typeof formAmount === 'number' && formVatRate !== 'KCT' && formVatRate !== '0%' && (
                    <span className="text-[10px] text-amber-600 mt-1 font-semibold block">
                      Tiền thuế: +{formatVND(calculateVatAmount(formAmount, formVatRate))}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Ngày giao dịch *
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden text-gray-800 font-medium"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
              </div>

              {typeof formAmount === 'number' && (
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between text-xs font-medium">
                  <span className="text-gray-600">Tổng tiền thanh toán (sau thuế):</span>
                  <span className="font-extrabold text-blue-600 text-sm">
                    {formatVND(calculateTotalAmount(formAmount, formVatRate))}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Danh mục doanh thu
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-800"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Hình thức thanh toán
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-800"
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                  >
                    <option value="Chuyển khoản">Chuyển khoản</option>
                    <option value="Tiền mặt">Tiền mặt</option>
                    <option value="Thẻ">Thẻ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Trạng thái hóa đơn
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-800"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                  >
                    <option value="Đã thanh toán">Đã thanh toán</option>
                    <option value="Chưa thanh toán">Chưa thanh toán</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Mô tả / ghi chú phụ
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú chi tiết mua sắm hoặc điều khoản hợp đồng..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-800 resize-none"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'Đang lưu...' : editingTransaction ? 'Cập nhật' : 'Ghi nhận doanh thu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
