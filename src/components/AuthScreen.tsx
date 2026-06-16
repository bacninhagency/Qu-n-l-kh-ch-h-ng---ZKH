import { useState, FormEvent } from 'react';
import { User, Lock, Eye, EyeOff, UserPlus, Shield, LogIn, Check, Info, Sun, Moon } from 'lucide-react';
import { UserAccount, UserSession } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (session: UserSession) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

// Simple security obfuscation for local database passwords
const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'local_' + Math.abs(hash).toString(36);
};

export default function AuthScreen({ onLoginSuccess, theme, onToggleTheme }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'nhan_vien'>('nhan_vien');
  
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Get users database or initialize
  const getUsers = (): UserAccount[] => {
    const stored = localStorage.getItem('crm_users');
    if (!stored) {
      // Default fallback administrator
      const defaultAdmin: UserAccount = {
        username: 'admin',
        fullName: 'Quản trị viên Hệ thống',
        passwordHash: hashPassword('admin123'),
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('crm_users', JSON.stringify([defaultAdmin]));
      return [defaultAdmin];
    }
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  };

  const handleAuthSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanUsername = username.trim().toLowerCase();
    const cleanFullName = fullName.trim();

    if (!cleanUsername || !password) {
      setErrorMsg('Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    const users = getUsers();

    if (isLogin) {
      // Log In Mode
      const user = users.find(u => u.username === cleanUsername);
      if (!user) {
        setErrorMsg('Tên đăng nhập không tồn tại.');
        return;
      }

      if (user.passwordHash !== hashPassword(password)) {
        setErrorMsg('Mật khẩu nhập vào không chính xác.');
        return;
      }

      // Successful login
      const session: UserSession = {
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        loginTime: new Date().toISOString()
      };
      
      localStorage.setItem('crm_current_session', JSON.stringify(session));
      setSuccessMsg('Đăng nhập thành công! Đang truy cập...');
      setTimeout(() => {
        onLoginSuccess(session);
      }, 800);
    } else {
      // Register Mode
      if (cleanUsername.length < 3) {
        setErrorMsg('Tên đăng nhập tối thiểu phải dài 3 ký tự.');
        return;
      }

      if (password.length < 5) {
        setErrorMsg('Mật khẩu bảo mật phải tối thiểu dài 5 ký tự.');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMsg('Xác nhận lại mật khẩu chưa trùng khớp.');
        return;
      }

      if (!cleanFullName) {
        setErrorMsg('Vui lòng điền họ và tên nhân viên.');
        return;
      }

      // Check existence
      const exists = users.some(u => u.username === cleanUsername);
      if (exists) {
        setErrorMsg('Tên đăng nhập này đã được đăng ký trên hệ thống.');
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
      
      setSuccessMsg('Đã đăng ký tài khoản thành công! Hãy đăng nhập ngay.');
      
      // Auto toggle to Login and set registered username
      setTimeout(() => {
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
        setSuccessMsg('');
      }, 1200);
    }
  };

  return (
    <div id="auth-screen-layout" className="min-h-screen bg-linear-to-tr from-slate-50 via-slate-100 to-blue-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center p-4 transition-colors duration-300 relative">
      
      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-750 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-sm cursor-pointer flex items-center justify-center active:scale-95"
          title={theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
        >
          {theme === 'light' ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-500 animate-pulse" />}
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-805 shadow-xl overflow-hidden transition-all duration-300">
        
        {/* Upper visual accent block */}
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white relative">
          <div className="absolute right-4 top-4 opacity-10">
            <Shield className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-white/10 rounded-xl backdrop-blur-xs flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </span>
            <span className="text-[11px] font-bold tracking-widest uppercase opacity-85">Hệ thống Bảo mật Nội bộ</span>
          </div>
          <h2 className="text-2xl font-black mt-4 tracking-tight leading-snug">
            Customer & Revenue
          </h2>
          <p className="text-xs text-blue-100 mt-1 font-medium">
            Quản trị viên và nhân viên đăng nhập để bắt đầu phiên làm việc
          </p>
        </div>

        {/* Auth Forms */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Quick Tab Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
            <button
              type="button"
              id="tab-auth-login"
              onClick={() => {
                setIsLogin(true);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                isLogin ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              id="tab-auth-register"
              onClick={() => {
                setIsLogin(false);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                !isLogin ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Tạo tài khoản mới
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {/* Name field - Register only */}
            {!isLogin && (
              <div className="transition-all">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Họ và Tên Nhân viên
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    id="input-auth-fullname"
                    placeholder="Nguyễn Văn A..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-gray-150"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Username field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Tên đăng nhập (Username)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  id="input-auth-username"
                  placeholder="admin..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-gray-150 font-medium"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Mật khẩu (Password)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  id="input-auth-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-gray-150 font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password - Register only */}
            {!isLogin && (
              <div className="transition-all">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    id="input-auth-confirm"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-gray-150 font-medium"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Role select - Register only */}
            {!isLogin && (
              <div className="transition-all">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Chức vụ quản trị
                </label>
                <select
                  id="select-auth-role"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-gray-150 font-semibold"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                >
                  <option value="nhan_vien" className="dark:bg-slate-900">Nhân viên bán hàng (Staff)</option>
                  <option value="admin" className="dark:bg-slate-900">Quản trị viên (Admin)</option>
                </select>
              </div>
            )}

            {/* System notifications inside card */}
            {errorMsg && (
              <div id="auth-error-msg" className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex items-start gap-2">
                <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div id="auth-success-msg" className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              id="btn-auth-submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 mt-4 shadow-sm"
            >
              {isLogin ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập hệ thống</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Đăng ký đăng nhập</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
