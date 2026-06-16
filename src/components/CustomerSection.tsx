import { useState, useMemo, FormEvent } from 'react';
import { Customer } from '../types';
import { Search, Plus, Edit2, Trash2, UserPlus, Filter, X, ChevronRight, Mail, Phone, MapPin, Tag } from 'lucide-react';

interface CustomerSectionProps {
  customers: Customer[];
  onSaveCustomers: (updatedList: Customer[]) => Promise<void>;
  isLoading: boolean;
}

export default function CustomerSection({ customers, onSaveCustomers, isLoading }: CustomerSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Modals / Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formType, setFormType] = useState<'Cá nhân' | 'Doanh nghiệp'>('Cá nhân');
  const [formStatus, setFormStatus] = useState<'Hoạt động' | 'Không hoạt động'>('Hoạt động');
  const [formMst, setFormMst] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Filter and search customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.mst && c.mst.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchType = filterType === 'all' || c.type === filterType;
      const matchStatus = filterStatus === 'all' || c.status === filterStatus;
      
      return matchSearch && matchType && matchStatus;
    });
  }, [customers, searchQuery, filterType, filterStatus]);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormType('Cá nhân');
    setFormStatus('Hoạt động');
    setFormMst('');
    setFormNotes('');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormEmail(customer.email);
    setFormAddress(customer.address);
    setFormType(customer.type);
    setFormStatus(customer.status);
    setFormMst(customer.mst || '');
    setFormNotes(customer.notes);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  // Submit form handler
  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formName.trim()) {
      setErrorMessage('Vui lòng nhập tên khách hàng');
      return;
    }
    if (!formPhone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại');
      return;
    }

    const updatedList = [...customers];
    
    if (editingCustomer) {
      // User Confirmation for Mutation
      const isConfirmed = window.confirm(
        `Xác nhận cập nhật thông tin khách hàng "${editingCustomer.name}"? Thay đổi này sẽ lưu vào bộ nhớ cục bộ.`
      );
      if (!isConfirmed) return;

      const idx = updatedList.findIndex((c) => c.id === editingCustomer.id);
      if (idx > -1) {
        updatedList[idx] = {
          ...editingCustomer,
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim(),
          address: formAddress.trim(),
          type: formType,
          status: formStatus,
          notes: formNotes.trim(),
          mst: formMst.trim(),
        };
      }
    } else {
      // Create new customer
      const newId = `KH${String(customers.length + 1).padStart(3, '0')}`;
      const newCustomer: Customer = {
        id: newId,
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        address: formAddress.trim(),
        type: formType,
        status: formStatus,
        notes: formNotes.trim(),
        createdAt: new Date().toISOString().split('T')[0],
        mst: formMst.trim(),
      };
      
      const isConfirmed = window.confirm(
        `Xác nhận thêm khách hàng mới "${newCustomer.name}"?`
      );
      if (!isConfirmed) return;

      updatedList.push(newCustomer);
    }

    try {
      await onSaveCustomers(updatedList);
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi đồng bộ dữ liệu');
    }
  };

  // Delete customer handler
  const handleDeleteCustomer = async (customer: Customer) => {
    const isConfirmed = window.confirm(
      `CẢNH BÁO: Bạn có chắc chắn muốn xóa khách hàng "${customer.name}" (${customer.id}) khỏi hệ thống? \nHành động này cũng xóa dữ liệu trên Google Sheets tương ứng.`
    );
    if (!isConfirmed) return;

    const updatedList = customers.filter((c) => c.id !== customer.id);
    try {
      await onSaveCustomers(updatedList);
    } catch (err: any) {
      alert(`Không thể xóa khách hàng: ${err.message}`);
    }
  };

  return (
    <div id="customer-section-root" className="space-y-6">
      {/* Action Header and Quick Search */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm theo mã, tên, SĐT, email..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Filters */}
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
            <Filter className="w-4 h-4 text-gray-400 ml-1" />
            <select
              className="text-xs bg-transparent border-0 ring-0 focus:ring-0 font-medium text-gray-600 outline-hidden"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Tất cả nhóm</option>
              <option value="Cá nhân">Cá nhân</option>
              <option value="Doanh nghiệp">Doanh nghiệp</option>
            </select>
            <span className="text-gray-300">|</span>
            <select
              className="text-xs bg-transparent border-0 ring-0 focus:ring-0 font-medium text-gray-600 outline-hidden mr-1"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Hoạt động">Hoạt động</option>
              <option value="Không hoạt động">Không hoạt động</option>
            </select>
          </div>

          <button
            id="btn-add-customer"
            onClick={handleOpenCreateModal}
            disabled={isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Thêm khách hàng
          </button>
        </div>
      </div>

      {/* Customer List Display */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100">
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã KH</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên & Nhóm</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Liên hệ</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Địa chỉ</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ghi chú</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                    {isLoading ? 'Đang tải danh sách...' : 'Không tìm thấy khách hàng nào khớp với bộ lọc'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                        {customer.id}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Tag className="w-3 h-3 text-gray-400" />
                        <span className="text-[11px] text-gray-500 font-medium">{customer.type}</span>
                        {customer.mst && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-100/70 px-1.5 py-0.5 rounded-sm">
                              MST: {customer.mst}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{customer.phone || 'Chưa cung cấp'}</span>
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-1.5 text-xs text-dash-email text-gray-500">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate max-w-[170px]">{customer.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-600 max-w-[200px] truncate">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{customer.address || '-'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          customer.status === 'Hoạt động'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {customer.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-500 max-w-[150px] truncate">
                      {customer.notes || '-'}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          id={`btn-edit-${customer.id}`}
                          onClick={() => handleOpenEditModal(customer)}
                          disabled={isLoading}
                          className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-blue-600 rounded-lg border border-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
                          title="Sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-delete-${customer.id}`}
                          onClick={() => handleDeleteCustomer(customer)}
                          disabled={isLoading}
                          className="p-1.5 bg-red-50 hover:bg-red-100/70 text-red-600 rounded-lg border border-red-100/30 transition-colors disabled:opacity-50 cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">
            Hiển thị {filteredCustomers.length} trong tổng số {customers.length} khách hàng
          </span>
        </div>
      </div>

      {/* Slide-over or Center Modal for Create/Edit Customer */}
      {isModalOpen && (
        <div id="customer-modal-backdrop" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">
                {editingCustomer ? 'Cập nhật thông tin khách hàng' : 'Thêm mới khách hàng'}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Tên khách hàng *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A, Công ty X..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-800"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Số điện thoại *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="09XXXXXXXX"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-800"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Địa chỉ Email
                  </label>
                  <input
                    type="email"
                    placeholder="example@gmail.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-800"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Nhóm khách hàng
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-800"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                  >
                    <option value="Cá nhân">Cá nhân</option>
                    <option value="Doanh nghiệp">Doanh nghiệp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Địa chỉ liên hệ
                </label>
                <input
                  type="text"
                  placeholder="Quận/Huyện, Tỉnh/Thành phố..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-800"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Mã số thuế (MST)
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập mã số thuế (nếu có)..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-800"
                    value={formMst}
                    onChange={(e) => setFormMst(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Trạng thái hoạt động
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-800"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                  >
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Không hoạt động">Không hoạt động</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Ghi chú thông tin thêm
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú sở thích, yêu cầu đặc biệt của khách hàng..."
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'Đang lưu...' : editingCustomer ? 'Cập nhật' : 'Thêm khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
