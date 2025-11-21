export enum Tab {
  MENU = 'MENU',
  STATEMENTS = 'STATEMENTS',
  ANALYSIS = 'ANALYSIS',
  AI = 'AI',
  STATS = 'STATS',
}

export interface CompanyInfo {
  taxId: string;
  name: string;
  address: string;
  representative: string;
  dateFounded?: string;
}

export interface FinancialData {
  year: number;
  // Income Statement
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number; // Selling + Admin
  operatingProfit: number;
  financialIncome: number;
  financialExpenses: number;
  otherIncome: number;
  otherExpenses: number;
  netProfit: number;

  // Balance Sheet
  totalAssets: number;
  currentAssets: number; // Short-term
  cashAndEquivalents: number;
  receivables: number;
  inventory: number;
  nonCurrentAssets: number; // Long-term
  fixedAssets: number;

  totalLiabilities: number;
  currentLiabilities: number;
  nonCurrentLiabilities: number;
  equity: number;
  retainedEarnings: number;

  // Cash Flow
  netCashOperating: number;
  netCashInvesting: number;
  netCashFinancing: number;
  netCashFlow: number;
  
  // Trial Balance (Simplified for demo)
  trialBalanceTotalDebit: number;
  trialBalanceTotalCredit: number;
}

export interface QuarterlyData {
  quarter: string;
  revenue: number;
  vatOutput: number;
}

export interface MonthlyData {
  month: string;
  revenue: number;
  invoiceCount: number;
}

export interface Ratios {
  liquidity: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
  };
  profitability: {
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
    roe: number;
    roa: number;
  };
  leverage: {
    debtToEquity: number;
    debtToAssets: number;
  };
  activity: {
    assetTurnover: number;
    inventoryTurnover: number;
    receivablesTurnover: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

export interface ImportStatus {
  bctcFiles: File[];
  gtgtFiles: File[];
  tndnFiles: File[];
  tncnFiles: File[];
  hddtFiles: File[];
  
  // Flags for UI convenience
  hasGtgt: boolean;
  hasTndn: boolean;
  hasTncn: boolean;
  hasHddt: boolean;
}