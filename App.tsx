import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  PieChart, 
  Bot, 
  BarChart2, 
  Menu, 
  ArrowUpRight,
  TrendingUp,
  Activity,
  DollarSign,
  Briefcase,
  Send,
  RefreshCw,
  User,
  Bot as BotIcon,
  Table,
  Percent,
  ArrowRightLeft,
  Building2,
  ShieldAlert
} from 'lucide-react';
import { FileUpload } from './components/FileUpload.tsx';
import { FinancialCharts } from './components/FinancialCharts.tsx';
import { RiskAnalysis } from './components/RiskAnalysis.tsx';
import { createFinancialChat } from './services/geminiService';
import { FinancialData, ImportStatus, Ratios, Tab, ChatMessage, QuarterlyData, MonthlyData, CompanyInfo } from './types';
import { Chat, GenerateContentResponse } from "@google/genai";

// --- Mock Data Generator ---
const generateMockData = (years = 6): FinancialData[] => {
  const baseRevenue = 80000000000; // 80 billion VND (Recent year)
  return Array.from({ length: years }, (_, i) => {
    const year = 2024 - i;
    // Simulate some volatility
    const volatility = 1 + (Math.random() * 0.2 - 0.1); 
    const trend = 1 - (i * 0.12); // Older years have less revenue generally
    const revenue = baseRevenue * trend * volatility;
    
    const grossMargin = 0.25 + (Math.random() * 0.05); // 25-30%
    const netMargin = 0.08 + (Math.random() * 0.04); // 8-12%
    
    const grossProfit = revenue * grossMargin;
    const costOfGoodsSold = revenue - grossProfit;
    const operatingExpenses = revenue * 0.12;
    const financialExpenses = revenue * 0.03;
    const financialIncome = revenue * 0.008;
    const otherIncome = revenue * 0.005;
    const otherExpenses = revenue * 0.002;
    
    const operatingProfit = grossProfit - operatingExpenses;
    const netProfit = revenue * netMargin;

    const totalAssets = revenue * 0.9;
    const currentAssets = totalAssets * 0.65;
    const nonCurrentAssets = totalAssets * 0.35;
    
    // Older years might have higher debt ratio simulation
    const debtRatio = 0.4 + (i * 0.02); 
    const totalLiabilities = totalAssets * debtRatio;
    const currentLiabilities = totalLiabilities * 0.75;
    const nonCurrentLiabilities = totalLiabilities * 0.25;
    
    const equity = totalAssets - totalLiabilities;

    return {
      year,
      revenue,
      costOfGoodsSold,
      grossProfit,
      operatingExpenses,
      operatingProfit,
      financialIncome,
      financialExpenses,
      otherIncome,
      otherExpenses,
      netProfit,
      totalAssets,
      currentAssets,
      cashAndEquivalents: currentAssets * 0.15,
      receivables: currentAssets * 0.35,
      inventory: currentAssets * 0.45, // Significant inventory
      nonCurrentAssets,
      fixedAssets: nonCurrentAssets * 0.85,
      totalLiabilities,
      currentLiabilities,
      nonCurrentLiabilities,
      equity,
      retainedEarnings: equity * 0.25,
      netCashOperating: netProfit * 1.3,
      netCashInvesting: -(nonCurrentAssets * 0.15),
      netCashFinancing: -(totalLiabilities * 0.1),
      netCashFlow: (netProfit * 1.3) - (nonCurrentAssets * 0.15) - (totalLiabilities * 0.1),
      trialBalanceTotalDebit: totalAssets * 2.5,
      trialBalanceTotalCredit: totalAssets * 2.5,
    };
  });
};

const generateMockQuarterlyData = (): QuarterlyData[] => {
  return [
    { quarter: 'Q1/2024', revenue: 18500000000, vatOutput: 1850000000 },
    { quarter: 'Q2/2024', revenue: 21000000000, vatOutput: 2100000000 },
    { quarter: 'Q3/2024', revenue: 19200000000, vatOutput: 1920000000 },
    { quarter: 'Q4/2024', revenue: 25500000000, vatOutput: 2550000000 },
  ];
};

const generateMockMonthlyData = (): MonthlyData[] => {
  const months = Array.from({length: 12}, (_, i) => (i + 1).toString().padStart(2, '0'));
  return months.map(m => ({
    month: `T${m}`,
    revenue: 5500000000 + Math.random() * 3000000000, 
    invoiceCount: Math.floor(80 + Math.random() * 150)
  }));
};

const calculateRatios = (data: FinancialData): Ratios => ({
  liquidity: {
    currentRatio: data.currentAssets / data.currentLiabilities,
    quickRatio: (data.currentAssets - data.inventory) / data.currentLiabilities,
    cashRatio: data.cashAndEquivalents / data.currentLiabilities,
  },
  profitability: {
    grossMargin: data.grossProfit / data.revenue,
    operatingMargin: data.operatingProfit / data.revenue,
    netMargin: data.netProfit / data.revenue,
    roe: data.netProfit / data.equity,
    roa: data.netProfit / data.totalAssets,
  },
  leverage: {
    debtToEquity: data.totalLiabilities / data.equity,
    debtToAssets: data.totalLiabilities / data.totalAssets,
  },
  activity: {
    assetTurnover: data.revenue / data.totalAssets,
    inventoryTurnover: data.costOfGoodsSold / data.inventory,
    receivablesTurnover: data.revenue / data.receivables,
  }
});

// --- Formatter Utils ---
const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
const formatPercent = (val: number) => `${(val * 100).toFixed(2)}%`;
const formatNum = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

const App: React.FC = () => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<Tab>(Tab.MENU);
  const [importStatus, setImportStatus] = useState<ImportStatus>({ 
    bctcFiles: [], gtgtFiles: [], tndnFiles: [], tncnFiles: [], hddtFiles: [],
    hasGtgt: false, hasTndn: false, hasTncn: false, hasHddt: false
  });
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [quarterlyData, setQuarterlyData] = useState<QuarterlyData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [currentRatios, setCurrentRatios] = useState<Ratios | null>(null);
  
  const [statementType, setStatementType] = useState<'BS' | 'PL' | 'CF' | 'NOTES' | 'TB'>('BS');
  const [analysisType, setAnalysisType] = useState<'RATIOS' | 'TRENDS' | 'RISK'>('RATIOS');
  const [trendMode, setTrendMode] = useState<'HORIZONTAL' | 'VERTICAL'>('HORIZONTAL');

  // Chat State
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  useEffect(() => {
    // Init Logic: Load Demo Data
    const data = generateMockData(6); // 6 years
    setFinancialData(data);
    setCurrentRatios(calculateRatios(data[0]));
  }, []);

  useEffect(() => {
    if (financialData.length > 0 && currentRatios && companyInfo) {
      const chat = createFinancialChat(financialData, currentRatios, companyInfo);
      setChatSession(chat);
      setMessages([{
        id: 'init',
        role: 'model',
        text: `Xin chào! Tôi là trợ lý AI của ${companyInfo.name}. Tôi đã tổng hợp dữ liệu 6 năm qua. Bạn cần phân tích xu hướng nào?`,
        timestamp: new Date()
      }]);
    }
  }, [financialData, currentRatios, companyInfo]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Handlers ---
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !chatSession) return;

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputMessage('');
    setIsChatLoading(true);

    try {
      const result = await chatSession.sendMessageStream({ message: newUserMsg.text });
      let fullResponseText = '';
      const botMsgId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, {
        id: botMsgId,
        role: 'model',
        text: '',
        timestamp: new Date()
      }]);

      for await (const chunk of result) {
          const responseChunk = chunk as GenerateContentResponse;
          fullResponseText += responseChunk.text;
          setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, text: fullResponseText } : msg));
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Lỗi kết nối AI. Vui lòng thử lại.",
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleFileUpload = (type: 'bctc' | 'gtgt' | 'tndn' | 'tncn' | 'hddt', files: FileList) => {
    const newFiles = Array.from(files);
    
    if (type === 'bctc') {
      const totalFiles = [...importStatus.bctcFiles, ...newFiles].slice(0, 6); // Limit to 6 years
      setImportStatus(prev => ({ ...prev, bctcFiles: totalFiles }));
      
      setTimeout(() => {
         const newData = generateMockData(6);
         setFinancialData(newData);
         setCurrentRatios(calculateRatios(newData[0]));
         // Mock Company Extraction
         setCompanyInfo({
           name: 'CÔNG TY CỔ PHẦN TẬP ĐOÀN FINAI',
           taxId: '0101999888',
           address: 'Tầng 12, Tòa nhà FinAI, Cầu Giấy, Hà Nội',
           representative: 'Nguyễn Văn A',
           dateFounded: '01/01/2010'
         });
         alert(`Đã xử lý ${totalFiles.length} tệp BCTC. Dữ liệu 6 năm đã sẵn sàng.`);
      }, 600);

    } else {
      setImportStatus(prev => ({
        ...prev,
        [`${type}Files`]: [...prev[`${type}Files` as keyof ImportStatus] as File[], ...newFiles],
        [`has${type.charAt(0).toUpperCase() + type.slice(1)}`]: true
      }));
      
      if (type === 'gtgt') setQuarterlyData(generateMockQuarterlyData());
      if (type === 'hddt') setMonthlyData(generateMockMonthlyData());
    }
  };

  // --- Rendering Helpers ---

  const renderTrendTable = (items: { label: string, key: keyof FinancialData, indent?: boolean, bold?: boolean }[], baseKey: keyof FinancialData) => {
    return (
      <div className="overflow-x-auto pb-4">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 min-w-[280px] bg-slate-50 sticky left-0 z-20 border-r">Chỉ tiêu</th>
              {financialData.map(d => (
                <th key={d.year} className="px-4 py-3 text-right min-w-[120px]">
                  {d.year}
                  {trendMode === 'VERTICAL' && <span className="block text-[10px] font-normal text-slate-400 uppercase mt-1">(% {baseKey === 'revenue' ? 'DT' : 'TTS'})</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                <td className={`px-4 py-2 sticky left-0 bg-white group-hover:bg-slate-50/80 border-r ${row.bold ? 'font-bold text-slate-800' : 'text-slate-600'} ${row.indent ? 'pl-8' : ''}`}>
                  {row.label}
                </td>
                {financialData.map((d, i) => {
                  const val = d[row.key] as number;
                  const baseVal = d[baseKey] as number;
                  const commonSize = baseVal !== 0 ? val / baseVal : 0;
                  
                  // For Horizontal mode, calculate change vs previous year (next index)
                  let changeNode = null;
                  if (trendMode === 'HORIZONTAL' && i < financialData.length - 1) {
                     const prevYearVal = financialData[i+1][row.key] as number;
                     const pctChange = prevYearVal !== 0 ? ((val - prevYearVal) / prevYearVal) : 0;
                     changeNode = (
                       <div className={`text-[10px] mt-1 ${pctChange > 0 ? 'text-green-600' : pctChange < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                          {pctChange > 0 ? '▲' : pctChange < 0 ? '▼' : '-'} {Math.abs(pctChange * 100).toFixed(1)}%
                       </div>
                     );
                  }

                  return (
                    <td key={d.year} className="px-4 py-2 text-right font-variant-numeric tabular-nums align-top">
                       <div className={`${row.bold ? 'font-medium text-slate-800' : 'text-slate-600'}`}>{formatNum(val)}</div>
                       {trendMode === 'VERTICAL' && (
                         <div className="text-[10px] text-slate-400 mt-1">{formatPercent(commonSize)}</div>
                       )}
                       {changeNode}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case Tab.MENU:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
               <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-800">
                 <Building2 className="text-blue-600" size={20}/> Thông tin Doanh nghiệp
               </h2>
               {companyInfo ? (
                  <div className="space-y-4 text-sm text-slate-600">
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-2">
                      <span className="text-slate-400 col-span-1">Mã số thuế</span> 
                      <span className="font-bold text-slate-900 col-span-2">{companyInfo.taxId}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-2">
                      <span className="text-slate-400 col-span-1">Tên công ty</span> 
                      <span className="font-medium text-slate-900 col-span-2">{companyInfo.name}</span>
                    </div>
                     <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-2">
                      <span className="text-slate-400 col-span-1">Địa chỉ</span> 
                      <span className="font-medium text-slate-900 col-span-2">{companyInfo.address}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <span className="text-slate-400 col-span-1">Người đại diện</span> 
                      <span className="font-medium text-slate-900 col-span-2">{companyInfo.representative}</span>
                    </div>
                  </div>
               ) : (
                 <div className="flex flex-col items-center justify-center h-40 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                    <p>Chưa có dữ liệu.</p>
                    <p className="text-xs">Vui lòng import BCTC (XML) để trích xuất.</p>
                 </div>
               )}
             </div>

             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
               <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-800">
                 <Activity className="text-green-600" size={20}/> Trạng thái Dữ liệu
               </h2>
               <div className="grid grid-cols-2 gap-3">
                  {/* BCTC Status */}
                  <div className={`p-3 rounded-lg border flex flex-col gap-2 ${importStatus.bctcFiles.length > 0 ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between items-center">
                       <p className="font-medium text-sm text-slate-900">Báo cáo tài chính</p>
                       <div className={`w-2 h-2 rounded-full ${importStatus.bctcFiles.length > 0 ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                    </div>
                    <p className="text-xs text-slate-500">{importStatus.bctcFiles.length} năm (Max 6)</p>
                  </div>
                  
                  {/* GTGT Status */}
                  <div className={`p-3 rounded-lg border flex flex-col gap-2 ${importStatus.hasGtgt ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between items-center">
                       <p className="font-medium text-sm text-slate-900">Tờ khai GTGT</p>
                       <div className={`w-2 h-2 rounded-full ${importStatus.hasGtgt ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                    </div>
                    <p className="text-xs text-slate-500">{importStatus.gtgtFiles.length} tệp</p>
                  </div>

                  {/* TNDN Status */}
                  <div className={`p-3 rounded-lg border flex flex-col gap-2 ${importStatus.hasTndn ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between items-center">
                       <p className="font-medium text-sm text-slate-900">Quyết toán TNDN</p>
                       <div className={`w-2 h-2 rounded-full ${importStatus.hasTndn ? 'bg-purple-500' : 'bg-slate-300'}`}></div>
                    </div>
                    <p className="text-xs text-slate-500">{importStatus.tndnFiles.length} tệp</p>
                  </div>

                  {/* TNCN Status */}
                  <div className={`p-3 rounded-lg border flex flex-col gap-2 ${importStatus.hasTncn ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between items-center">
                       <p className="font-medium text-sm text-slate-900">Quyết toán TNCN</p>
                       <div className={`w-2 h-2 rounded-full ${importStatus.hasTncn ? 'bg-orange-500' : 'bg-slate-300'}`}></div>
                    </div>
                    <p className="text-xs text-slate-500">{importStatus.tncnFiles.length} tệp</p>
                  </div>

                   {/* HDDT Status */}
                   <div className={`p-3 rounded-lg border flex flex-col gap-2 col-span-2 ${importStatus.hasHddt ? 'bg-teal-50 border-teal-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between items-center">
                       <p className="font-medium text-sm text-slate-900">Dữ liệu Hóa đơn điện tử</p>
                       <div className={`w-2 h-2 rounded-full ${importStatus.hasHddt ? 'bg-teal-500' : 'bg-slate-300'}`}></div>
                    </div>
                    <p className="text-xs text-slate-500">{importStatus.hddtFiles.length} tệp Excel</p>
                  </div>
               </div>
             </div>
          </div>
        );

      case Tab.STATEMENTS:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in flex flex-col h-[700px]">
            <div className="border-b px-6 py-3 bg-slate-50 flex gap-2 overflow-x-auto no-scrollbar items-center justify-between">
              <div className="flex gap-2">
                {[
                  { id: 'BS', label: 'Cân đối kế toán' },
                  { id: 'PL', label: 'Kết quả kinh doanh' },
                  { id: 'CF', label: 'Lưu chuyển tiền tệ' },
                  { id: 'NOTES', label: 'Thuyết minh' },
                  { id: 'TB', label: 'Cân đối tài khoản' }
                ].map((t) => (
                  <button 
                    key={t.id} 
                    onClick={() => setStatementType(t.id as any)}
                    className={`text-sm font-medium whitespace-nowrap px-4 py-2 rounded-lg transition-all ${statementType === t.id ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="hidden lg:flex text-xs text-slate-400 items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-green-500"></span> Tăng trưởng
                 <span className="w-2 h-2 rounded-full bg-red-500"></span> Suy giảm
              </div>
            </div>
            
            {/* Toolbar inside Statement */}
            <div className="px-6 py-2 border-b bg-white flex items-center justify-between">
               <div className="text-sm text-slate-500">Đơn vị tính: <span className="font-semibold text-slate-700">VND</span></div>
               <div className="flex gap-2">
                   <button 
                      onClick={() => setTrendMode('HORIZONTAL')}
                      className={`text-xs px-3 py-1.5 rounded border ${trendMode === 'HORIZONTAL' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                      Biến động năm
                    </button>
                     <button 
                      onClick={() => setTrendMode('VERTICAL')}
                      className={`text-xs px-3 py-1.5 rounded border ${trendMode === 'VERTICAL' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                       Phân tích dọc (%)
                    </button>
               </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-white">
              {statementType === 'PL' && renderTrendTable([
                { label: '1. Doanh thu thuần', key: 'revenue', bold: true },
                { label: '2. Giá vốn hàng bán', key: 'costOfGoodsSold' },
                { label: '3. Lợi nhuận gộp', key: 'grossProfit', bold: true },
                { label: '4. Doanh thu tài chính', key: 'financialIncome' },
                { label: '5. Chi phí tài chính', key: 'financialExpenses' },
                { label: '6. Chi phí bán hàng & QLDN', key: 'operatingExpenses' },
                { label: '7. Lợi nhuận thuần từ HĐKD', key: 'operatingProfit', bold: true },
                { label: '8. Thu nhập khác', key: 'otherIncome' },
                { label: '9. Chi phí khác', key: 'otherExpenses' },
                { label: '10. Lợi nhuận sau thuế', key: 'netProfit', bold: true },
              ], 'revenue')}
              
              {statementType === 'BS' && renderTrendTable([
                { label: 'A. TÀI SẢN NGẮN HẠN', key: 'currentAssets', bold: true },
                { label: 'I. Tiền và tương đương tiền', key: 'cashAndEquivalents', indent: true },
                { label: 'II. Các khoản phải thu ngắn hạn', key: 'receivables', indent: true },
                { label: 'III. Hàng tồn kho', key: 'inventory', indent: true },
                { label: 'B. TÀI SẢN DÀI HẠN', key: 'nonCurrentAssets', bold: true },
                { label: 'I. Tài sản cố định', key: 'fixedAssets', indent: true },
                { label: 'TỔNG CỘNG TÀI SẢN', key: 'totalAssets', bold: true },
                { label: 'C. NỢ PHẢI TRẢ', key: 'totalLiabilities', bold: true },
                { label: 'I. Nợ ngắn hạn', key: 'currentLiabilities', indent: true },
                { label: 'II. Nợ dài hạn', key: 'nonCurrentLiabilities', indent: true },
                { label: 'D. VỐN CHỦ SỞ HỮU', key: 'equity', bold: true },
                { label: 'I. Lợi nhuận sau thuế chưa PP', key: 'retainedEarnings', indent: true },
                { label: 'TỔNG NGUỒN VỐN', key: 'totalAssets', bold: true },
              ], 'totalAssets')}

              {statementType === 'CF' && renderTrendTable([
                { label: 'I. Lưu chuyển tiền từ HĐKD', key: 'netCashOperating', bold: true },
                { label: 'II. Lưu chuyển tiền từ HĐĐT', key: 'netCashInvesting', bold: true },
                { label: 'III. Lưu chuyển tiền từ HĐTC', key: 'netCashFinancing', bold: true },
                { label: 'Lưu chuyển tiền thuần trong kỳ', key: 'netCashFlow', bold: true },
                { label: 'Tiền và TĐ tiền cuối kỳ', key: 'cashAndEquivalents', bold: true },
              ], 'revenue')}

               {statementType === 'TB' && (
                  <div className="p-12 text-center text-slate-500">
                    <Table size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg">Bảng cân đối tài khoản</p>
                    <p className="text-sm text-slate-400">Tổng phát sinh Nợ/Có: {formatNum(financialData[0].trialBalanceTotalDebit)}</p>
                  </div>
               )}
               
               {statementType === 'NOTES' && (
                  <div className="p-12 text-center text-slate-500">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Dữ liệu thuyết minh chưa có sẵn.</p>
                  </div>
               )}
            </div>
          </div>
        );

      case Tab.ANALYSIS:
        if (!currentRatios) return <div>No data</div>;
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Toggle */}
            <div className="flex justify-center">
              <div className="bg-slate-200 p-1 rounded-lg inline-flex shadow-inner">
                <button
                  onClick={() => setAnalysisType('RATIOS')}
                  className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${analysisType === 'RATIOS' ? 'bg-white text-blue-700 shadow' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  Chỉ số Tài chính
                </button>
                <button
                   onClick={() => setAnalysisType('TRENDS')}
                   className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${analysisType === 'TRENDS' ? 'bg-white text-blue-700 shadow' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  Phân tích Xu hướng
                </button>
                <button
                   onClick={() => setAnalysisType('RISK')}
                   className={`px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${analysisType === 'RISK' ? 'bg-white text-red-600 shadow' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  <ShieldAlert size={16} />
                  Đánh giá Rủi ro
                </button>
              </div>
            </div>

            {analysisType === 'RISK' && (
              <RiskAnalysis data={financialData} />
            )}

            {analysisType === 'RATIOS' && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Liquidity */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-4 text-blue-600">
                    <DollarSign size={20} />
                    <h3 className="font-semibold">Thanh khoản</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      { l: 'Thanh toán hiện hành', v: currentRatios.liquidity.currentRatio, good: 1.5 },
                      { l: 'Thanh toán nhanh', v: currentRatios.liquidity.quickRatio, good: 1.0 },
                      { l: 'Thanh toán tức thời', v: currentRatios.liquidity.cashRatio, good: 0.2 }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
                        <span className="text-sm text-slate-600">{item.l}</span>
                        <span className={`font-bold ${item.v >= item.good ? 'text-green-600' : 'text-orange-500'}`}>{item.v.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Profitability */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-4 text-purple-600">
                    <TrendingUp size={20} />
                    <h3 className="font-semibold">Sinh lời</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                       { l: 'Biên LN Gộp', v: currentRatios.profitability.grossMargin },
                       { l: 'Biên LN Ròng', v: currentRatios.profitability.netMargin },
                       { l: 'ROE (LNST/VCSH)', v: currentRatios.profitability.roe },
                       { l: 'ROA (LNST/TTS)', v: currentRatios.profitability.roa },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
                        <span className="text-sm text-slate-600">{item.l}</span>
                        <span className="font-bold text-slate-800">{formatPercent(item.v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Leverage */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-4 text-red-500">
                    <PieChart size={20} />
                    <h3 className="font-semibold">Đòn bẩy & Cấu trúc vốn</h3>
                  </div>
                   <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
                      <span className="text-sm text-slate-600">Nợ / Vốn chủ sở hữu (D/E)</span>
                      <span className="font-bold text-slate-800">{currentRatios.leverage.debtToEquity.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
                      <span className="text-sm text-slate-600">Nợ / Tổng tài sản (D/A)</span>
                      <span className={`font-bold ${currentRatios.leverage.debtToAssets > 0.6 ? 'text-red-500' : 'text-green-600'}`}>
                        {formatPercent(currentRatios.leverage.debtToAssets)}
                      </span>
                    </div>
                  </div>
                </div>

                 {/* Activity */}
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-4 text-orange-500">
                    <Briefcase size={20} />
                    <h3 className="font-semibold">Hiệu quả Hoạt động</h3>
                  </div>
                  <div className="space-y-3">
                     {[
                       { l: 'Vòng quay tài sản', v: currentRatios.activity.assetTurnover },
                       { l: 'Vòng quay tồn kho', v: currentRatios.activity.inventoryTurnover },
                       { l: 'Vòng quay phải thu', v: currentRatios.activity.receivablesTurnover },
                     ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
                          <span className="text-sm text-slate-600">{item.l}</span>
                          <span className="font-bold text-slate-800">{item.v.toFixed(2)}</span>
                        </div>
                     ))}
                  </div>
                </div>
              </div>
            )}

            {analysisType === 'TRENDS' && (
               <FinancialCharts data={financialData} />
            )}
          </div>
        );

      case Tab.STATS:
        return <FinancialCharts data={financialData} quarterlyData={quarterlyData} monthlyData={monthlyData} />;

      case Tab.AI:
        return (
          <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
            <div className="bg-slate-50 px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg text-white shadow-md">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">FinAI Expert</h3>
                  <p className="text-xs text-slate-500">Kế toán trưởng ảo của bạn</p>
                </div>
              </div>
              {companyInfo && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">{companyInfo.name}</span>}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[90%] lg:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-purple-600'}`}>
                        {msg.role === 'user' ? <User size={16}/> : <BotIcon size={16}/>}
                     </div>
                     <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                       msg.role === 'user' 
                         ? 'bg-blue-600 text-white rounded-tr-none' 
                         : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                     }`}>
                        {msg.isError ? (
                          <span className="text-red-500">{msg.text}</span>
                        ) : (
                          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1" dangerouslySetInnerHTML={{ 
                            __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>').replace(/- /g, '• ') 
                          }} />
                        )}
                     </div>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                 <div className="flex justify-start">
                   <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex gap-2 items-center">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                   </div>
                 </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-white border-t">
              <div className="relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="VD: Phân tích xu hướng lợi nhuận 3 năm gần nhất..."
                  className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  disabled={isChatLoading}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isChatLoading}
                  className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Chức năng đang phát triển</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 fixed h-full z-10 hidden lg:flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xl">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-blue-200 shadow-md">
              <BarChart2 size={20} />
            </div>
            FinAI
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">Financial Intelligence</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { id: Tab.MENU, label: 'Bàn làm việc', icon: Menu },
            { id: Tab.STATEMENTS, label: 'Báo cáo tài chính', icon: FileText },
            { id: Tab.ANALYSIS, label: 'Phân tích & Đánh giá', icon: ArrowUpRight },
            { id: Tab.STATS, label: 'Biểu đồ tăng trưởng', icon: PieChart },
            { id: Tab.AI, label: 'Trợ lý AI', icon: Bot },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? 'text-blue-600' : 'text-slate-400'} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/30">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-lg shadow-indigo-200">
            <p className="text-xs font-medium opacity-90 mb-1 text-indigo-100">Gói Doanh Nghiệp</p>
            <p className="text-sm font-bold mb-3">Nâng cấp Pro</p>
            <button className="text-xs bg-white/20 hover:bg-white/30 w-full py-2 rounded font-semibold text-white transition-colors border border-white/10">
              Xem báo giá
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-0 lg:ml-64 transition-all">
        {/* Header */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between shadow-sm">
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            {activeTab === Tab.MENU && 'Trung tâm điều khiển'}
            {activeTab === Tab.STATEMENTS && 'Báo cáo tài chính'}
            {activeTab === Tab.ANALYSIS && 'Phân tích & Đánh giá'}
            {activeTab === Tab.AI && 'Trợ lý Chuyên gia AI'}
            {activeTab === Tab.STATS && 'Biểu đồ Thống kê'}
          </h1>
          
          <div className="flex items-center gap-4">
            <button onClick={() => window.location.reload()} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
              <RefreshCw size={18} />
            </button>
            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
              <div className="text-right hidden md:block">
                 <p className="text-xs font-bold text-slate-700">Ksor Hăn</p>
                 <p className="text-[10px] text-slate-400">Kiểm tra viên thuế</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs border border-blue-200">
                AD
              </div>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Quick Import Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <FileUpload 
              label="BCTC" 
              accept=".xml" 
              multiple={true}
              maxFiles={6}
              isUploaded={importStatus.bctcFiles.length > 0} 
              fileCount={importStatus.bctcFiles.length}
              onUpload={(f) => handleFileUpload('bctc', f)}
            />
             <FileUpload 
              label="01GTGT" 
              accept=".xml" 
              multiple={true}
              isUploaded={importStatus.hasGtgt} 
              fileCount={importStatus.gtgtFiles.length}
              onUpload={(f) => handleFileUpload('gtgt', f)}
            />
            <FileUpload 
              label="03/TNDN" 
              accept=".xml" 
              multiple={true}
              isUploaded={importStatus.hasTndn}
              fileCount={importStatus.tndnFiles.length} 
              onUpload={(f) => handleFileUpload('tndn', f)}
            />
             <FileUpload 
              label="05/TNCN" 
              accept=".xml" 
              multiple={true}
              isUploaded={importStatus.hasTncn} 
              fileCount={importStatus.tncnFiles.length}
              onUpload={(f) => handleFileUpload('tncn', f)}
            />
             <FileUpload 
              label="HĐĐT (Excel)" 
              accept=".xlsx, .xls" 
              multiple={true}
              isUploaded={importStatus.hasHddt} 
              fileCount={importStatus.hddtFiles.length}
              onUpload={(f) => handleFileUpload('hddt', f)}
            />
          </div>

          <div className="min-h-[500px] pb-10">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Mobile Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 z-50 shadow-lg">
        {[
           { id: Tab.MENU, icon: LayoutDashboard },
           { id: Tab.STATEMENTS, icon: FileText },
           { id: Tab.STATS, icon: PieChart },
           { id: Tab.AI, icon: Bot },
        ].map((item) => (
           <button 
             key={item.id}
             onClick={() => setActiveTab(item.id)}
             className={`p-3 rounded-xl transition-all ${activeTab === item.id ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}
           >
             <item.icon size={24} />
           </button>
        ))}
      </div>
    </div>
  );
};

export default App;