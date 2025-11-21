import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, CheckCircle, HelpCircle, Info, ShieldAlert, Calendar } from 'lucide-react';
import { FinancialData } from '../types';

interface Props {
  data: FinancialData[];
}

type RiskGroup = 'BS' | 'PL' | 'CF' | 'ANALYSIS';
type RiskStatus = 'SAFE' | 'RISK' | 'WARNING' | 'UNKNOWN';

interface RiskRule {
  id: number;
  group: RiskGroup;
  name: string;
  condition: string;
  explanation: string;
  check?: (current: FinancialData, prev?: FinancialData) => RiskStatus;
}

export const RiskAnalysis: React.FC<Props> = ({ data }) => {
  // Initialize with the most recent year
  const [selectedYear, setSelectedYear] = useState<number>(data.length > 0 ? data[0].year : 0);

  // Reset to newest year if data changes significantly (e.g., new upload)
  useEffect(() => {
    if (data.length > 0) {
      // Check if current selected year still exists in data
      const exists = data.some(d => d.year === selectedYear);
      if (!exists) {
        setSelectedYear(data[0].year);
      }
    }
  }, [data, selectedYear]);

  // Find the data for the selected year and the previous year relative to it
  const currentYear = useMemo(() => data.find(d => d.year === selectedYear), [data, selectedYear]);
  const prevYear = useMemo(() => data.find(d => d.year === selectedYear - 1), [data, selectedYear]);

  const rules: RiskRule[] = [
    // --- GROUP 1: BALANCE SHEET ---
    {
      id: 1, group: 'BS', name: 'Tiền và tương đương tiền',
      condition: 'Tăng đột biến nhưng doanh thu giảm',
      explanation: 'Ghi nhận doanh thu ảo, điều chỉnh lợi nhuận',
      check: (c, p) => {
        if (!p) return 'UNKNOWN';
        return (c.cashAndEquivalents > p.cashAndEquivalents * 1.5 && c.revenue < p.revenue) ? 'RISK' : 'SAFE';
      }
    },
    { id: 2, group: 'BS', name: 'Tiền mặt lớn, ít gửi NH', condition: 'Nghi ngờ chi tiêu ngoài sổ, không qua ngân hàng', explanation: 'Rủi ro chi tiêu không hóa đơn, quỹ đen.' },
    {
      id: 3, group: 'BS', name: 'Phải thu khách hàng',
      condition: 'Phải thu / Tổng tài sản > 40%',
      explanation: 'Treo doanh thu, bán hàng chưa thu tiền',
      check: (c) => (c.receivables / c.totalAssets > 0.4) ? 'RISK' : 'SAFE'
    },
    {
      id: 4, group: 'BS', name: 'Tăng trưởng Phải thu vs Doanh thu',
      condition: 'Phải thu tăng >30% trong khi doanh thu giảm',
      explanation: 'Ghi nhận doanh thu khống, đối ứng nội bộ',
      check: (c, p) => {
        if (!p) return 'UNKNOWN';
        const recGrowth = (c.receivables - p.receivables) / p.receivables;
        const revGrowth = (c.revenue - p.revenue) / p.revenue;
        return (recGrowth > 0.3 && revGrowth < 0) ? 'RISK' : 'SAFE';
      }
    },
    { id: 5, group: 'BS', name: 'Phải trả người bán', condition: 'Tăng mạnh, tồn kho không tương ứng', explanation: 'Ghi nhận chi phí ảo hoặc dùng hóa đơn khống' },
    { id: 6, group: 'BS', name: 'Phải thu – Phải trả', condition: 'Chênh lệch lớn, tăng bất thường', explanation: 'Dấu hiệu “quay vòng chứng từ” nội bộ' },
    {
      id: 7, group: 'BS', name: 'Hàng tồn kho',
      condition: 'Hàng tồn kho / Tổng tài sản > 50%',
      explanation: 'Ghi nhận tồn khống để che lỗ hoặc không bán được hàng',
      check: (c) => (c.inventory / c.totalAssets > 0.5) ? 'RISK' : 'SAFE'
    },
    {
      id: 8, group: 'BS', name: 'Biến động Tồn kho vs Doanh thu',
      condition: 'Tồn kho giảm đột biến, doanh thu không tăng',
      explanation: 'Xuất bán không kê khai doanh thu',
      check: (c, p) => {
        if (!p) return 'UNKNOWN';
        return (c.inventory < p.inventory * 0.7 && c.revenue <= p.revenue * 1.05) ? 'WARNING' : 'SAFE';
      }
    },
    { id: 9, group: 'BS', name: 'TSCĐ vs Khấu hao', condition: 'TSCĐ tăng mạnh nhưng chi phí khấu hao không đổi', explanation: 'Đầu tư ảo hoặc không ghi nhận đúng tài sản' },
    { id: 10, group: 'BS', name: 'Tỷ lệ Khấu hao', condition: 'Chi phí khấu hao < 3% tổng TSCĐ', explanation: 'Không ghi nhận đầy đủ khấu hao' },
    { id: 11, group: 'BS', name: 'Vay ngắn hạn', condition: 'Tăng đột biến cuối năm', explanation: 'Có thể “chuyển lợi nhuận” sang chi phí lãi vay' },
    {
      id: 12, group: 'BS', name: 'Cấu trúc Nợ',
      condition: 'Nợ phải trả / VCSH > 3 lần',
      explanation: 'Rủi ro mất khả năng thanh toán, sử dụng vốn vay nội bộ',
      check: (c) => (c.totalLiabilities / c.equity > 3) ? 'RISK' : 'SAFE'
    },
    {
      id: 13, group: 'BS', name: 'Cổ tức',
      condition: 'Lỗ lũy kế nhưng vẫn chia cổ tức',
      explanation: 'Gian lận lợi nhuận hoặc chia không đúng luật',
      check: (c) => (c.retainedEarnings < 0 && c.netCashFinancing < 0) ? 'WARNING' : 'SAFE' // Rough proxy
    },
    { id: 14, group: 'BS', name: 'Tài sản dở dang', condition: 'Kéo dài nhiều năm', explanation: 'Dự án treo, có thể chuyển giá, ghi nhận sai kỳ' },
    { id: 15, group: 'BS', name: 'Đầu tư tài chính', condition: 'Khoản lớn, nội bộ, không cổ tức', explanation: 'Dấu hiệu chuyển giá, chuyển lợi nhuận' },

    // --- GROUP 2: INCOME STATEMENT ---
    {
      id: 16, group: 'PL', name: 'Biến động Doanh thu',
      condition: 'Tăng/giảm > 30% so năm trước',
      explanation: 'Biến động bất thường so ngành hoặc địa bàn',
      check: (c, p) => {
        if (!p) return 'UNKNOWN';
        const change = Math.abs((c.revenue - p.revenue) / p.revenue);
        return change > 0.3 ? 'WARNING' : 'SAFE';
      }
    },
    { id: 17, group: 'PL', name: 'Doanh thu vs Giá vốn', condition: 'Doanh thu giảm nhưng giá vốn tăng', explanation: 'Khai thiếu doanh thu, ghi sai kỳ' },
    {
      id: 18, group: 'PL', name: 'Tỷ lệ Giá vốn',
      condition: 'Giá vốn > 95% doanh thu',
      explanation: 'Ghi nhận chi phí không hợp lệ để giảm thuế TNDN',
      check: (c) => (c.costOfGoodsSold / c.revenue > 0.95) ? 'RISK' : 'SAFE'
    },
    {
      id: 19, group: 'PL', name: 'Biên lợi nhuận gộp',
      condition: 'Biên LNG < 5% (trong ngành có lãi)',
      explanation: 'Có thể khai sai doanh thu hoặc chi phí',
      check: (c) => (c.grossProfit / c.revenue < 0.05) ? 'WARNING' : 'SAFE'
    },
    {
      id: 20, group: 'PL', name: 'Chi phí bán hàng',
      condition: 'Tăng mạnh (>20%) bất thường',
      explanation: 'Rủi ro ghi khống chi phí marketing, tiếp khách',
      check: (c, p) => {
        if(!p) return 'UNKNOWN';
        return ((c.operatingExpenses - p.operatingExpenses)/p.operatingExpenses > 0.2) ? 'WARNING' : 'SAFE'; // Using OpExp as proxy
      }
    },
    { id: 21, group: 'PL', name: 'Chi phí quản lý', condition: '> 15% doanh thu', explanation: 'Không phù hợp quy mô hoạt động' },
    {
      id: 22, group: 'PL', name: 'Lợi nhuận sau thuế',
      condition: 'Âm ≥ 2 năm liên tục',
      explanation: 'DN vẫn hoạt động, dấu hiệu chuyển giá',
      check: (c, p) => (c.netProfit < 0 && p && p.netProfit < 0) ? 'RISK' : 'SAFE'
    },
    { id: 23, group: 'PL', name: 'Thuế TNDN', condition: 'LN kế toán dương, thuế nộp thấp', explanation: 'Điều chỉnh thuế sai, khai không đúng thu nhập chịu thuế' },
    { id: 24, group: 'PL', name: 'Chi phí lãi vay', condition: 'Cao (>20% LN gộp)', explanation: 'Vi phạm khống chế chi phí lãi vay (NĐ 132)' },
    { id: 25, group: 'PL', name: 'Chi phí khác', condition: 'Tăng bất thường', explanation: 'Ghi chi phí không hóa đơn, hoặc trích lập sai' },
    { id: 26, group: 'PL', name: 'Chi phí nhân công', condition: 'Thấp bất hợp lý', explanation: 'Khai giảm lương để né BHXH và PIT' },
    { id: 27, group: 'PL', name: 'Thu nhập khác', condition: 'Lớn đột biến', explanation: 'Thanh lý, nhượng bán TSCĐ có dấu hiệu điều chỉnh LN' },
    {
      id: 28, group: 'PL', name: 'Tỷ suất LN Trước thuế',
      condition: 'LNTT < 1% doanh thu',
      explanation: 'Dấu hiệu chuyển giá hoặc doanh thu ảo',
      check: (c) => ((c.netProfit / c.revenue) < 0.01) ? 'WARNING' : 'SAFE' // Using Net as proxy if Pre-tax missing
    },
    { id: 29, group: 'PL', name: 'Hoạt động', condition: 'Doanh thu = 0, Chi phí lớn', explanation: 'DN “treo” hoạt động để trốn kê khai' },

    // --- GROUP 3: CASH FLOW ---
    {
      id: 30, group: 'CF', name: 'Chất lượng Lợi nhuận',
      condition: 'Dòng tiền HĐKD âm, LNST dương',
      explanation: 'Doanh thu chưa thu tiền, ghi ảo',
      check: (c) => (c.netCashOperating < 0 && c.netProfit > 0) ? 'RISK' : 'SAFE'
    },
    { id: 31, group: 'CF', name: 'Dòng tiền Đầu tư', condition: 'Dương lớn (Bán TSCĐ)', explanation: 'Bán tài sản bù lỗ hoạt động' },
    { id: 32, group: 'CF', name: 'Dòng tiền Tài chính', condition: 'Vay nợ cao, trả gốc ít', explanation: 'Có thể vay nội bộ, điều chuyển vốn' },
    { id: 33, group: 'CF', name: 'Cổ tức tiền mặt', condition: 'Trả ra lớn trong khi lỗ', explanation: 'Chia lợi nhuận không có thật' },
    { id: 34, group: 'CF', name: 'Đầu tư vs Khấu hao', condition: 'Không đầu tư nhưng khấu hao cao', explanation: 'Ghi nhận TSCĐ ảo' },
    {
      id: 35, group: 'CF', name: 'Khả năng thanh toán',
      condition: 'Dòng tiền thuần âm 3 năm liền',
      explanation: 'Dấu hiệu mất khả năng thanh toán, rủi ro thuế cao',
      check: () => {
        // This rule checks 3 consecutive years. We need to look deeper than just 'current' and 'prev'.
        const year0 = data.find(d => d.year === selectedYear);
        const year1 = data.find(d => d.year === selectedYear - 1);
        const year2 = data.find(d => d.year === selectedYear - 2);
        
        if (!year0 || !year1 || !year2) return 'UNKNOWN';
        return (year0.netCashFlow < 0 && year1.netCashFlow < 0 && year2.netCashFlow < 0) ? 'RISK' : 'SAFE';
      }
    },

    // --- GROUP 4: ANALYTICS ---
    { id: 36, group: 'ANALYSIS', name: 'Biến động Quý', condition: 'Doanh thu quý không ổn định', explanation: 'Có thể điều chỉnh kỳ ghi nhận hóa đơn' },
    { id: 37, group: 'ANALYSIS', name: 'Tỷ trọng Chi phí', condition: 'Biến động > ±20%', explanation: 'Khai không đồng nhất giữa các kỳ' },
    {
      id: 38, group: 'ANALYSIS', name: 'So sánh Ngành',
      condition: 'Biên LNG thấp hơn trung vị ngành > 50%',
      explanation: 'Dấu hiệu gian lận giá vốn'
    },
    { id: 39, group: 'ANALYSIS', name: 'Cơ cấu Tài sản', condition: 'Tỷ trọng TSCĐ giảm mạnh', explanation: 'Thanh lý hoặc ghi giảm TSCĐ không khai thuế' },
    {
      id: 40, group: 'ANALYSIS', name: 'Vòng quay Phải thu',
      condition: 'Phải thu / Doanh thu tăng > 2 lần',
      explanation: 'Treo doanh thu',
      check: (c, p) => {
        if (!p) return 'UNKNOWN';
        const cRatio = c.receivables / c.revenue;
        const pRatio = p.receivables / p.revenue;
        return (cRatio > pRatio * 2) ? 'RISK' : 'SAFE';
      }
    },
    {
      id: 41, group: 'ANALYSIS', name: 'Rủi ro Phá sản',
      condition: 'Nợ phải trả / Tài sản > 80%',
      explanation: 'Rủi ro phá sản, chuyển giá',
      check: (c) => (c.totalLiabilities / c.totalAssets > 0.8) ? 'RISK' : 'SAFE'
    },
    {
      id: 42, group: 'ANALYSIS', name: 'Tồn kho ứ đọng',
      condition: 'Tồn kho / Doanh thu > 70%',
      explanation: 'Không tiêu thụ hàng hoặc tồn khống',
      check: (c) => (c.inventory / c.revenue > 0.7) ? 'RISK' : 'SAFE'
    },
    {
      id: 43, group: 'ANALYSIS', name: 'Hiệu quả Vốn',
      condition: 'ROE < 5%',
      explanation: 'Lợi nhuận thấp, nghi ngờ chuyển giá',
      check: (c) => ((c.netProfit / c.equity) < 0.05) ? 'WARNING' : 'SAFE'
    },
    {
      id: 44, group: 'ANALYSIS', name: 'Hiệu quả Tài sản',
      condition: 'ROA < 2%',
      explanation: 'Hiệu quả thấp bất thường',
      check: (c) => ((c.netProfit / c.totalAssets) < 0.02) ? 'WARNING' : 'SAFE'
    },
    {
      id: 45, group: 'ANALYSIS', name: 'Thanh khoản Nhanh',
      condition: 'Hệ số thanh toán nhanh < 0.5',
      explanation: 'Mất cân đối tài chính nghiêm trọng',
      check: (c) => {
        const quick = (c.currentAssets - c.inventory) / c.currentLiabilities;
        return quick < 0.5 ? 'RISK' : 'SAFE';
      }
    },
  ];

  const getStatusColor = (status: RiskStatus) => {
    switch (status) {
      case 'RISK': return 'bg-red-100 text-red-700 border-red-200';
      case 'WARNING': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'SAFE': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const getStatusIcon = (status: RiskStatus) => {
    switch (status) {
      case 'RISK': return <ShieldAlert size={18} />;
      case 'WARNING': return <AlertTriangle size={18} />;
      case 'SAFE': return <CheckCircle size={18} />;
      default: return <HelpCircle size={18} />;
    }
  };

  const getGroupTitle = (group: RiskGroup) => {
    switch (group) {
      case 'BS': return 'I. RỦI RO BẢNG CÂN ĐỐI KẾ TOÁN';
      case 'PL': return 'II. RỦI RO KẾT QUẢ KINH DOANH';
      case 'CF': return 'III. RỦI RO LƯU CHUYỂN TIỀN TỆ';
      case 'ANALYSIS': return 'IV. PHÂN TÍCH NGANG & DỌC';
    }
  };

  const renderGroup = (group: RiskGroup) => {
    const groupRules = rules.filter(r => r.group === group);
    
    return (
      <div className="mb-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">{getGroupTitle(group)}</h3>
          <span className="text-xs font-medium px-2 py-1 bg-slate-200 rounded-full text-slate-600">
            {groupRules.length} Tiêu chí
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {groupRules.map((rule) => {
            // We pass currentYear and prevYear dynamically derived from selectedYear
            const status = (currentYear && rule.check) ? rule.check(currentYear, prevYear) : 'UNKNOWN';
            
            return (
              <div key={rule.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-4 items-start group">
                <div className={`p-2 rounded-lg border flex-shrink-0 ${getStatusColor(status)}`}>
                  {getStatusIcon(status)}
                </div>
                <div className="flex-1">
                   <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-slate-800 mb-1">{rule.id}. {rule.name}</h4>
                      {status !== 'UNKNOWN' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          status === 'RISK' ? 'bg-red-600 text-white' : 
                          status === 'WARNING' ? 'bg-orange-500 text-white' : 
                          'bg-green-500 text-white'
                        }`}>
                          {status === 'SAFE' ? 'An toàn' : status === 'RISK' ? 'Rủi ro cao' : 'Cảnh báo'}
                        </span>
                      )}
                   </div>
                   <p className="text-sm text-slate-600 mb-1"><span className="font-medium text-slate-500">Dấu hiệu:</span> {rule.condition}</p>
                   <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded mt-2 group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-slate-100">
                      <Info size={14} className="mt-0.5 text-blue-500" />
                      <span>{rule.explanation}</span>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!currentYear) return <div>Chưa có dữ liệu để phân tích.</div>;

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Bộ lọc 45 Dấu hiệu Rủi ro Tài chính</h2>
        <p className="text-slate-500">Phát hiện sớm các sai sót trọng yếu và rủi ro thuế</p>
      </div>

      {/* Year Selection Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-10">
        <label className="font-medium text-slate-700 flex items-center gap-2">
          <Calendar size={20} className="text-blue-600"/>
          Chọn năm tài chính đánh giá:
        </label>
        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-w-[150px] shadow-sm"
        >
          {data.map(d => (
            <option key={d.year} value={d.year}>Năm {d.year}</option>
          ))}
        </select>
        
        {prevYear && (
           <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-full border">
             Đang so sánh với: <strong>{prevYear.year}</strong>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {renderGroup('BS')}
        {renderGroup('PL')}
        {renderGroup('CF')}
        {renderGroup('ANALYSIS')}
      </div>
    </div>
  );
};