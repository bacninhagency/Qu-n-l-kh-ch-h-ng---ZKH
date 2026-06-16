import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Transaction, Customer } from '../types';

interface DashboardChartsProps {
  transactions: Transaction[];
  customers: Customer[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function DashboardCharts({ transactions, customers }: DashboardChartsProps) {
  // Format currency
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // 5. Cash Flow comparison by Customer Type (Doanh thu thực nhận vs Công nợ chưa thu)
  const cashFlowByCustomerType = useMemo(() => {
    const dataMap: {
      [key: string]: {
        name: string;
        'Doanh thu thực nhận': number;
        'Công nợ chưa thu': number;
      };
    } = {
      'Cá nhân': { name: 'Cá nhân', 'Doanh thu thực nhận': 0, 'Công nợ chưa thu': 0 },
      'Doanh nghiệp': { name: 'Doanh nghiệp', 'Doanh thu thực nhận': 0, 'Công nợ chưa thu': 0 },
    };

    transactions.forEach((t) => {
      const targetCust = customers?.find((c) => c.id === t.customerId);
      const cType = targetCust ? targetCust.type : 'Cá nhân';
      const amount = t.totalAmount ?? t.amount;

      if (t.status === 'Đã thanh toán') {
        if (dataMap[cType]) {
          dataMap[cType]['Doanh thu thực nhận'] += amount;
        } else {
          dataMap[cType] = { name: cType, 'Doanh thu thực nhận': amount, 'Công nợ chưa thu': 0 };
        }
      } else {
        if (dataMap[cType]) {
          dataMap[cType]['Công nợ chưa thu'] += amount;
        } else {
          dataMap[cType] = { name: cType, 'Doanh thu thực nhận': 0, 'Công nợ chưa thu': amount };
        }
      }
    });

    return Object.values(dataMap);
  }, [transactions, customers]);

  // 1. Daily Revenue Chart Logic (Last 15 days)
  const dailyData = useMemo(() => {
    const dailyMap: { [date: string]: number } = {};
    
    // Sort transactions by date
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    
    sorted.forEach((t) => {
      if (t.status === 'Đã thanh toán') {
        dailyMap[t.date] = (dailyMap[t.date] || 0) + (t.totalAmount ?? t.amount);
      }
    });

    // Take the last 15 distinct dates that have data or are recent
    const keys = Object.keys(dailyMap).sort().slice(-15);
    return keys.map((date) => ({
      name: date.split('-').slice(1).reverse().join('/'), // DD/MM
      'Doanh thu': dailyMap[date],
    }));
  }, [transactions]);

  // 2. Weekly Revenue Chart Logic
  const weeklyData = useMemo(() => {
    // Group by iso week (approximated)
    const weeklyMap: { [weekLabel: string]: number } = {};
    
    transactions.forEach((t) => {
      if (t.status !== 'Đã thanh toán') return;
      
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      
      // Get ISO week number or year-week
      const year = d.getFullYear();
      const firstJan = new Date(year, 0, 1);
      const days = Math.floor((d.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((days + firstJan.getDay() + 1) / 7);
      
      const weekKey = `Tuần ${weekNumber}/${year}`;
      weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + (t.totalAmount ?? t.amount);
    });

    return Object.keys(weeklyMap)
      .sort()
      .map((week) => ({
        name: week,
        'Doanh thu': weeklyMap[week],
      }));
  }, [transactions]);

  // 3. Monthly Revenue Chart Logic
  const monthlyData = useMemo(() => {
    const monthlyMap: { [monthLabel: string]: number } = {};
    
    transactions.forEach((t) => {
      if (t.status !== 'Đã thanh toán') return;
      
      const parts = t.date.split('-');
      if (parts.length < 2) return;
      
      // key like "Tháng 06/2026"
      const monthKey = `Tháng ${parts[1]}/${parts[0]}`;
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + (t.totalAmount ?? t.amount);
    });

    return Object.keys(monthlyMap)
      .sort()
      .map((month) => ({
        name: month,
        'Doanh thu': monthlyMap[month],
      }));
  }, [transactions]);

  // 4. Category Breakdown
  const categoryData = useMemo(() => {
    const catMap: { [cat: string]: number } = {};
    
    transactions.forEach((t) => {
      if (t.status !== 'Đã thanh toán') return;
      const cat = t.category || 'Khác';
      catMap[cat] = (catMap[cat] || 0) + (t.totalAmount ?? t.amount);
    });

    return Object.keys(catMap).map((cat) => ({
      name: cat,
      value: catMap[cat],
    }));
  }, [transactions]);

  const totalRevenue = useMemo(() => {
    return transactions
      .filter((t) => t.status === 'Đã thanh toán')
      .reduce((sum, t) => sum + (t.totalAmount ?? t.amount), 0);
  }, [transactions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Daily Revenue Chart */}
      <div id="chart-daily-container" className="lg:col-span-2 bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 p-5 rounded-2xl border shadow-xs transition-colors">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Doanh thu hàng ngày</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Biểu thị doanh thu thực tế từ đơn hàng đã thanh toán (15 ngày gần nhất)</p>
        </div>
        <div className="h-[280px] w-full">
          {dailyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Không có dữ liệu doanh thu hàng ngày
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val / 1000000}M`}
                />
                <Tooltip
                  formatter={(value: any) => [formatVND(value as number), 'Doanh thu']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6' }}
                />
                <Line
                  type="monotone"
                  dataKey="Doanh thu"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category Contribution Distribution */}
      <div id="chart-category-container" className="bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 p-5 rounded-2xl border shadow-xs flex flex-col justify-between transition-colors">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phân bổ theo danh mục</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Sự đóng góp của từng nhóm sản phẩm & dịch vụ</p>
        </div>
        
        <div className="my-2 h-[180px] w-full relative flex items-center justify-center">
          {categoryData.length === 0 ? (
            <div className="text-gray-400 text-sm">Chưa có giao dịch thanh toán</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [formatVND(value as number), 'Doanh số']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="space-y-1.5">
          {categoryData.slice(0, 4).map((item, index) => {
            const pct = totalRevenue > 0 ? ((item.value / totalRevenue) * 100).toFixed(1) : '0';
            return (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-600 dark:text-gray-300 font-medium truncate max-w-[120px]">{item.name}</span>
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-right">
                  <span className="font-semibold text-gray-750 dark:text-gray-200">{formatVND(item.value)}</span>
                  <span className="ml-1 text-[10px] text-gray-400">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Revenue Chart */}
      <div id="chart-weekly-container" className="bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 p-5 rounded-2xl border shadow-xs transition-colors">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Doanh thu hàng tuần</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">So sánh mức doanh số giữa các tuần trong quý</p>
        </div>
        <div className="h-[220px] w-full">
          {weeklyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Không có dữ liệu doanh thu hàng tuần
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val / 1000000}M`}
                />
                <Tooltip
                  formatter={(value: any) => [formatVND(value as number), 'Doanh thu']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6' }}
                />
                <Bar dataKey="Doanh thu" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div id="chart-monthly-container" className="bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 p-5 rounded-2xl border shadow-xs lg:col-span-2 transition-colors">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Doanh thu hàng tháng</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tổng quan sự tăng trưởng doanh số theo tháng năm nay</p>
        </div>
        <div className="h-[220px] w-full">
          {monthlyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Không có dữ liệu doanh thu hàng tháng
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val / 1000000}M`}
                />
                <Tooltip
                  formatter={(value: any) => [formatVND(value as number), 'Doanh thu']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6' }}
                />
                <Bar dataKey="Doanh thu" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Customer Type Cash Flow Comparison */}
      <div id="chart-cashflow-customer-type" className="lg:col-span-2 bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 p-5 rounded-2xl border shadow-xs flex flex-col justify-between transition-colors">
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dòng tiền theo phân loại khách hàng</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">So sánh thực nhận và nợ đọng phải thu chia theo phân khúc khách hàng</p>
          </div>
          <div className="h-[210px] w-full">
            {cashFlowByCustomerType.length === 0 || (cashFlowByCustomerType.every(item => item['Doanh thu thực nhận'] === 0 && item['Công nợ chưa thu'] === 0)) ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Chưa có dữ liệu dòng tiền theo loại khách hàng
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowByCustomerType} margin={{ top: 10, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val / 1000000}M`}
                  />
                  <Tooltip
                    formatter={(value: any, name: string) => [formatVND(value as number), name]}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  <Bar dataKey="Doanh thu thực nhận" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Công nợ chưa thu" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Cash Flow Strategy Insights */}
      <div id="cashflow-insights-panel" className="bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 p-5 rounded-2xl border shadow-xs flex flex-col justify-between transition-colors">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-slate-700 dark:text-slate-350">Hiệu quả thu hồi dòng tiền</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Đánh giá tỷ lệ nợ đọng đối với từng phân khúc khách hàng</p>
        </div>

        <div className="my-3 space-y-3.5 flex-1 flex flex-col justify-center">
          {cashFlowByCustomerType.map((item) => {
            const total = item['Doanh thu thực nhận'] + item['Công nợ chưa thu'];
            const rate = total > 0 ? (item['Doanh thu thực nhận'] / total) * 100 : 0;
            const isExcellent = rate >= 85;
            const isMedium = rate >= 60 && rate < 85;

            return (
              <div key={item.name} className="space-y-1.5 p-3 rounded-xl bg-gray-50 dark:bg-slate-950/70 border border-gray-100/70 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-800 dark:text-gray-200">{item.name}</span>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                    isExcellent ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : isMedium ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-750 dark:text-rose-400'
                  }`}>
                    Đã thu bồi: {rate.toFixed(1)}%
                  </span>
                </div>

                <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${isExcellent ? 'bg-emerald-500' : isMedium ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${total > 0 ? rate : 100}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400">
                  <span>Thực nhận: <strong className="text-blue-600 dark:text-blue-400 font-bold">{formatVND(item['Doanh thu thực nhận'])}</strong></span>
                  <span>Công nợ: <strong className="text-amber-600 dark:text-amber-400 font-medium">{formatVND(item['Công nợ chưa thu'])}</strong></span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
          <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold flex items-center gap-1">
            📊 Gợi ý Quản trị Công nợ:
          </span>
          <p className="text-[10px] text-gray-500 dark:text-gray-450 mt-1 leading-relaxed">
            Các khách hàng doanh nghiệp thường có chu kỳ công nợ lâu hơn. Hãy áp dụng chính sách chiết khấu thanh toán sớm nếu tỷ lệ thu hồi dưới 80%.
          </p>
        </div>
      </div>
    </div>
  );
}
