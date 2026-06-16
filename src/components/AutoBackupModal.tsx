import { X, Clock, Database, Trash2, ArrowLeftRight, Check, ShieldCheck, Zap, Info, RotateCcw } from 'lucide-react';
import { AutoBackupItem } from '../types';

interface AutoBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  backups: AutoBackupItem[];
  onRestore: (backup: AutoBackupItem) => void;
  onClearAll: () => void;
  lastBackupTime: Date | null;
  onForceBackupNow: () => void;
}

const getRelativeTime = (isoString: string) => {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 5) return 'Vừa xong';
  if (diffSecs < 60) return `${diffSecs} giây trước`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return new Date(isoString).toLocaleDateString('vi-VN');
};

const getBackupSizeKB = (item: any) => {
  try {
    const len = JSON.stringify(item).length;
    return (len / 1024).toFixed(1) + ' KB';
  } catch {
    return '0.5 KB';
  }
};

export default function AutoBackupModal({
  isOpen,
  onClose,
  backups,
  onRestore,
  onClearAll,
  lastBackupTime,
  onForceBackupNow
}: AutoBackupModalProps) {
  if (!isOpen) return null;

  return (
    <div id="auto-backup-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-all animate-fade-in">
      <div id="auto-backup-modal-container" className="bg-white w-full max-w-2xl rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-linear-to-r from-blue-700 via-blue-600 to-indigo-700 text-white px-6 py-5 relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs flex items-center justify-center">
              <Clock className="w-5.5 h-5.5 text-white" />
            </span>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Trung tâm Sao lưu Tự động</h3>
              <p className="text-xs text-blue-100/90 font-medium">Bảo vệ cơ sở dữ liệu thời gian thực và khôi phục khi cần thiết</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 px-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Info */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Quick System Status Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* System Engine Parameters */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Trạng thái cơ chế</span>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <span className="text-xs font-bold text-slate-800">Tự động sao lưu đang hoạt động</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Thiết bị giám sát thay đổi dữ liệu lớn và chạy kiểm tra định kỳ mỗi <strong>60 giây</strong> để tự động tạo checkpoint dự phòng.
                </p>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-200/50">
                Lần sao lưu gần nhất:{' '}
                <strong className="text-slate-700">
                  {lastBackupTime ? lastBackupTime.toLocaleTimeString('vi-VN') : 'Mới khởi động'}
                </strong>
              </div>
            </div>

            {/* Quick Action Trigger */}
            <div className="bg-blue-50/40 border border-blue-100/65 rounded-2xl p-4 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Sức khỏe dữ liệu hiện tại</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Tạo điểm sao lưu tức thời trước khi cấu hình hoặc thực hiện thay đổi thử nghiệm diện rộng.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onForceBackupNow}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Sao lưu tức thời</span>
                </button>

                {backups.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="p-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                    title="Xóa tất cả các bản sao lưu bổ sung"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Backup Timeline Records */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                Lọc Lịch Sử Sao Lưu ({backups.length}/10 Checkpoints)
              </h4>
              {backups.length > 0 && (
                <span className="text-[10px] text-slate-400 font-medium font-mono">Lưu trữ cục bộ tự xoay vòng (FIFO)</span>
              )}
            </div>

            {backups.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                <Database className="w-8 h-8 text-slate-300 mx-auto" />
                <h5 className="text-xs font-bold text-slate-700">Chưa có bản sao lưu tự động nào</h5>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Hệ thống sẽ tự động ghi nhận một điểm sao lưu khi định kỳ 60 giây trôi qua hoặc khi bạn thực hiện sửa đổi đầu tiên.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {backups.map((item, idx) => (
                  <div 
                    key={item.id}
                    className="p-3.5 bg-white border border-slate-150 hover:border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      {/* Left Badge Index / Circle */}
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-slate-600">
                        {idx === 0 ? (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-1 py-0.5 rounded-sm">Kế</span>
                        ) : (
                          <span>#{backups.length - idx}</span>
                        )}
                      </div>

                      {/* Info Title and Sub */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{item.label}</span>
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                            {getBackupSizeKB(item)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-slate-500">
                          <span className="text-blue-600 font-bold">{getRelativeTime(item.timestamp)}</span>
                          <span className="text-slate-350">•</span>
                          <span>{new Date(item.timestamp).toLocaleString('vi-VN')}</span>
                        </div>
                        
                        {/* Summary details count badges */}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <span>👥</span>
                            <span>{item.customerCount} Khách hàng</span>
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <span>💵</span>
                            <span>{item.transactionCount} Giao dịch</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Restore Trigger button */}
                    <button
                      type="button"
                      onClick={() => onRestore(item)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-700 font-bold text-xs rounded-xl transition-all cursor-pointer select-none flex items-center gap-1.5 shrink-0 self-end sm:self-center"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Khôi phục này</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guidelines info text */}
          <div className="p-3.5 bg-amber-50/50 border border-amber-100/60 rounded-2xl flex gap-2.5">
            <Info className="w-4 h-4 text-amber-605 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>Mẹo bảo mật:</strong> Các bản sao lưu tự động (Auto-Backups) được cách ly độc lập tại bộ nhớ của trình duyệt. 
              Điều này cho phép bạn quay trở lại các trạng thái ổn định trước đó khi lỡ tay xóa nhầm khách hàng hoặc thiết lập giao dịch sai lệch.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Enterprise Client-State Shield
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Đóng bảng
          </button>
        </div>

      </div>
    </div>
  );
}
