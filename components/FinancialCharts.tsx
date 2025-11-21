import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';
import { FinancialData, QuarterlyData, MonthlyData } from '../types';

interface Props {
  data: FinancialData[];
  quarterlyData?: QuarterlyData[];
  monthlyData?: MonthlyData[];
}

export const FinancialCharts: React.FC<Props> = ({ data, quarterlyData, monthlyData }) => {
  // Reverse data to show chronological order left to right (Oldest -> Newest)
  const chartData = [...data].reverse().map(d => ({
    ...d,
    debtRatio: (d.totalLiabilities / d.totalAssets) * 100, // Pre-calc for charts
    equityRatio: (d.equity / d.totalAssets) * 100,
    currentAssetsRatio: (d.currentAssets / d.totalAssets) * 100,
    nonCurrentAssetsRatio: (d.nonCurrentAssets / d.totalAssets) * 100,
    invTurnover: d.inventory > 0 ? d.costOfGoodsSold / d.inventory : 0,
    recTurnover: d.receivables > 0 ? d.revenue / d.receivables : 0,
    assetTurnover: d.revenue / d.totalAssets
  }));

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
    return `${value}`;
  };

  const COLORS = {
    primary: '#3b82f6', // Blue
    secondary: '#8b5cf6', // Violet
    success: '#10b981', // Emerald
    warning: '#f59e0b', // Amber
    danger: '#ef4444', // Red
    info: '#06b6d4', // Cyan
    dark: '#1e293b' // Slate 800
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Overview & Profit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Doanh thu & Lợi nhuận (6 năm)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={formatCurrencyShort} />
                <Tooltip formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
                <Legend />
                <Bar dataKey="revenue" name="Doanh thu" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="grossProfit" name="LN Gộp" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="netProfit" name="LN Sau thuế" fill={COLORS.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Biến động Hàng tồn kho</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.warning} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.warning} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={formatCurrencyShort} />
                <Tooltip formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
                <Legend />
                <Area type="monotone" dataKey="inventory" name="Hàng tồn kho" stroke={COLORS.warning} fillOpacity={1} fill="url(#colorInv)" />
                <Line type="monotone" dataKey="costOfGoodsSold" name="Giá vốn hàng bán" stroke={COLORS.danger} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section 2: Structure Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Cơ cấu Nguồn vốn (Nợ vs VCSH)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} stackOffset="expand">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}%`} />
                <Legend />
                <Bar dataKey="equityRatio" name="Vốn chủ sở hữu" stackId="a" fill={COLORS.success} />
                <Bar dataKey="debtRatio" name="Nợ phải trả" stackId="a" fill={COLORS.danger} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Cơ cấu Tài sản (Ngắn hạn vs Dài hạn)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} stackOffset="expand">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}%`} />
                <Legend />
                <Bar dataKey="currentAssetsRatio" name="Tài sản ngắn hạn" stackId="a" fill={COLORS.info} />
                <Bar dataKey="nonCurrentAssetsRatio" name="Tài sản dài hạn" stackId="a" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section 3: Efficiency & Ratios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Hiệu quả hoạt động (Vòng quay)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="invTurnover" name="Vòng quay Tồn kho" stroke={COLORS.warning} strokeWidth={2} />
                <Line type="monotone" dataKey="recTurnover" name="Vòng quay Phải thu" stroke={COLORS.info} strokeWidth={2} />
                <Line type="monotone" dataKey="assetTurnover" name="Vòng quay Tài sản" stroke={COLORS.primary} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <h3 className="text-lg font-semibold text-slate-800 mb-4">Tỷ lệ Nợ trên Tổng tài sản</h3>
           <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} unit="%" />
                <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`}/>
                <Legend />
                <Area type="monotone" dataKey="debtRatio" name="Tỷ lệ Nợ / TTS" stroke={COLORS.danger} fill={COLORS.danger} fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Section 4: Detailed Monthly/Quarterly */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Quarterly Revenue */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Doanh thu Quý (01GTGT)</h3>
          {quarterlyData && quarterlyData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={quarterlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="quarter" axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={formatCurrencyShort}/>
                  <Tooltip formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" name="Doanh thu chịu thuế" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#d97706" strokeWidth={2} dot={{r: 4}} name="Xu hướng" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
               <p className="text-slate-400 text-sm">Vui lòng import tờ khai 01GTGT</p>
            </div>
          )}
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Doanh thu Tháng (HĐĐT)</h3>
           {monthlyData && monthlyData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorRevMonth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={formatCurrencyShort} />
                  <Tooltip formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="Doanh thu thực tế" stroke={COLORS.success} fillOpacity={1} fill="url(#colorRevMonth)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
           ) : (
            <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
               <p className="text-slate-400 text-sm">Vui lòng import dữ liệu HĐĐT</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};