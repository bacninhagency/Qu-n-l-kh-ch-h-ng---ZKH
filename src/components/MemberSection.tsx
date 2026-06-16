import { useState, useMemo, FormEvent } from 'react';
import { 
  User, 
  UserPlus, 
  Shield, 
  ShieldCheck, 
  Trash2, 
  Search, 
  Lock, 
  Key, 
  AlertCircle, 
  Check, 
  UserCheck, 
  Calendar,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserAccount, UserSession } from '../types';

interface MemberSectionProps {
  currentSession: UserSession;
  onShowNotification: (message: string, isError?: boolean) => void;
}

// Same password hashing algorithm as AuthScreen for security compatibility
const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'local_' + Math.abs(hash).toString(36);
};

export default function MemberSection({ currentSession, onShowNotification }: MemberSectionProps) {
  // Local state for registered users list
  const [users, setUsers] = useState<UserAccount[]>(() => {
    const stored = localStorage.getItem('crm_users');
    if (!stored) {
      // Default admin account
      const defaultAdmin: UserAccount = {
        username: 'admin',
        fullName: 'Quản trị viên Hệ thống',
        passwordHash: hashPassword('admin123'),
        role: 'admin',
        createdAt: '2026-06-15T00:00:00.000Z'
      };
      localStorage.setItem('crm_users', JSON.stringify([defaultAdmin]));
      return [defaultAdmin];
    }
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  });

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'nhan_vien'>('all');

  // Form states for creating a member
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'nhan_vien'>('nhan_vien');
  
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const isAdmin = currentSession.role === 'admin';

  // Handle member creation
  const handleCreateMember = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!isAdmin) {
      setFormError('Chỉ Quản trị viên mới được bổ sung tài khoản nhân sự mới.');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanFullName = fullName.trim();

    if (!cleanUsername || !cleanFullName || !password || !confirmPassword) {
      setFormError('Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }

    if (cleanUsername.length < 3) {
      setFormError('Tên đăng nhập tối thiểu phải dài 3 ký tự.');
      return;
    }

    // Check spaces in username
    if (/\s/.test(cleanUsername)) {
      setFormError('Tên đăng nhập không được chứa khoảng trắng.');
      return;
    }

    if (password.length < 5) {
      setFormError('Mật khẩu bảo mật phải tối thiểu dài 5 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Mật khẩu nhập lại không chính xác.');
      return;
    }

    // Check user existence
    const exists = users.some(u => u.username === cleanUsername);
    if (exists) {
      setFormError('Tên đăng nhập này đã tồn tại trên hệ thống.');
      return;
    }

    const newAccount: UserAccount = {
      username: cleanUsername,
      fullName: cleanFullName,
      passwordHash: hashPassword(password),
      role: role,
      createdAt: new Date().toISOString()
    };

    const updatedUsers = [...users, newAccount];
    localStorage.setItem('crm_users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);

    // Reset Form fields
    setUsername('');
    setFullName('');
    setPassword('');
    setConfirmPassword('');
    setRole('nhan_vien');
    setShowPassword(false);

    onShowNotification(`Đã tạo tài khoản thành viên "${cleanUsername}" thành công!`);
  };

  // Handle member deletion
  const handleDeleteMember = (targetUsername: string) => {
    if (!isAdmin) {
      onShowNotification('Bạn không có quyền thực hiện hành động này.', true);
      return;
    }

    if (targetUsername === currentSession.username) {
      onShowNotification('Không thể tự xóa tài khoản của chính bạn đang đăng nhập.', true);
      return;
    }

    if (targetUsername === 'admin') {
      onShowNotification('Không thể xóa tài khoản Quản trị viên mặc định gốc.', true);
      return;
    }

    const isConfirmed = window.confirm(
      `Xác nhận xóa tài khoản "${targetUsername}"? Thành viên này sẽ không thể đăng nhập phiên sau nữa.`
    );
    if (!isConfirmed) return;

    const updatedUsers = users.filter(u => u.username !== targetUsername);
    localStorage.setItem('crm_users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    onShowNotification(`Đã xóa tài khoản thành viên "${targetUsername}" khỏi hệ thống.`);
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = 
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchRole = roleFilter === 'all' || u.role === roleFilter;

      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  return (
    <div id="member-management-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      
      {/* 1. Account Creation Panel */}
      <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-tight">Thêm tài khoản thành viên</h3>
              <p className="text-[10px] text-gray-500 font-medium">Bổ sung nhân sự hoặc quản trị vào phần mềm CRM</p>
            </div>
          </div>

          {!isAdmin ? (
            <div className="p-4 bg-amber-50 border border-amber-100/70 rounded-xl text-center space-y-2 mt-4">
              <Shield className="w-8 h-8 text-amber-505 mx-auto" />
              <h4 className="text-xs font-bold text-gray-850">Chế độ Xem thành viên</h4>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Tài khoản của bạn có quyền hạn <strong>Nhân viên</strong>. Chỉ tài khoản chức vụ <strong>Quản trị viên</strong> mới được quản lý và thêm thành viên đăng nhập mới.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateMember} className="space-y-4 mt-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Họ và tên thành viên *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-hidden focus:ring-1.5 focus:ring-blue-500"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Tên đăng nhập (Username) *
                </label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="nguyenvana (viết liền không dấu)"
                    className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-hidden focus:ring-1.5 focus:ring-blue-500 font-medium"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Phân quyền chức vụ *
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <select
                    className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-hidden focus:ring-1.5 focus:ring-blue-500 bg-white font-semibold"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                  >
                    <option value="nhan_vien">Nhân viên bán hàng (Staff)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Mật khẩu đăng nhập *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    className="w-full pl-9 pr-8 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-hidden focus:ring-1.5 focus:ring-blue-500 font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-650"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Nhập lại mật khẩu *
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-hidden focus:ring-1.5 focus:ring-blue-500 font-medium"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-650 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-98 flex items-center justify-center gap-1.5 mt-2"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Thêm tài khoản thành viên</span>
              </button>
            </form>
          )}
        </div>

        <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100/50 mt-4">
          <span className="text-[10px] text-blue-700 font-bold flex items-center gap-1">
            🔒 Bảo bảo và đồng bộ:
          </span>
          <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
            Mật khẩu mới đăng ký sẽ được băm bảo mật cục bộ trước khi lưu trữ. Bất kỳ thành viên nào được tạo đều có thể dùng để nhập vào màn hình đăng nhập.
          </p>
        </div>
      </div>

      {/* 2. Registered Users List and Table Grid */}
      <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
        <div className="space-y-4">
          
          {/* List Headers & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">Danh sách tài khoản hệ thống</h3>
              <p className="text-xs text-gray-400 mt-1">Tổng cộng {users.length} tài khoản đang có quyền truy cập</p>
            </div>

            {/* Quick selectors for roles */}
            <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-100/80">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:text-gray-955'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('admin')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'admin'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:text-gray-955'
                }`}
              >
                Quản trị
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('nhan_vien')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'nhan_vien'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:text-gray-955'
                }`}
              >
                Nhân viên
              </button>
            </div>
          </div>

          {/* Search bar input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-405" />
            <input
              type="text"
              placeholder="Tìm theo tên đăng nhập hoặc họ tên nhân sự..."
              className="w-full pl-9 pr-4 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-hidden focus:ring-1.5 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Members Table */}
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <div className="max-h-[340px] overflow-y-auto pr-0.5">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                    <th className="p-3">Thành viên</th>
                    <th className="p-3">Tên đăng nhập</th>
                    <th className="p-3">Chức vụ</th>
                    <th className="p-3">Ngày tạo</th>
                    {isAdmin && <th className="p-3 text-center">Xóa</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-gray-400">
                        Không tìm thấy tài khoản thành viên nào khớp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isSelf = user.username === currentSession.username;
                      const isDefaultAdmin = user.username === 'admin';

                      return (
                        <tr key={user.username} className={`hover:bg-gray-50/60 ${isSelf ? 'bg-blue-50/20' : ''}`}>
                          <td className="p-3">
                            <div className="font-bold text-gray-900 flex items-center gap-1.5">
                              <span>{user.fullName}</span>
                              {isSelf && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-105 text-blue-800 border border-blue-200/50 rounded-md">
                                  Tôi
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-mono font-medium text-gray-600">
                            {user.username}
                          </td>
                          <td className="p-3">
                            {user.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-1.5 py-0.5">
                                <Shield className="w-3 h-3 text-blue-600" />
                                <span>Quản trị (Admin)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-100 rounded-md px-1.5 py-0.5">
                                <User className="w-3 h-3 text-slate-500" />
                                <span>Nhân viên (Staff)</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-gray-450 font-medium">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-gray-350" />
                              <span>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                          </td>
                          {isAdmin && (
                            <td className="p-3 text-center">
                              {isDefaultAdmin || isSelf ? (
                                <span className="text-[10px] text-gray-350 font-bold select-none">-</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMember(user.username)}
                                  className="p-1 text-gray-450 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title="Xóa tài khoản này khỏi hệ thống"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <div className="mt-4 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex gap-2 w-full">
          <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-500 leading-relaxed">
            <strong>Bảo vệ Tài khoản:</strong> Phiên đăng nhập được duy trì tối đa cho đến khi nhấn nút <strong>Đăng xuất</strong>. Mật khẩu không bao giờ được gửi đi ngoài môi trường an toàn trên thiết bị của bạn.
          </p>
        </div>

      </div>

    </div>
  );
}
