import { GoogleGenAI, Chat } from "@google/genai";
import { FinancialData, Ratios, CompanyInfo } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const createFinancialChat = (data: FinancialData[], ratios: Ratios, companyInfo: CompanyInfo): Chat => {
  // Prepare a summary of the last few years for context
  const historySummary = data.map(d => 
    `- Năm ${d.year}: Doanh thu ${d.revenue.toLocaleString('vi-VN')} VND, LNST ${d.netProfit.toLocaleString('vi-VN')} VND`
  ).join('\n    ');

  const context = `
    Bạn là một chuyên gia phân tích tài chính cấp cao (CFO) và Kế toán trưởng, hỗ trợ doanh nghiệp Việt Nam.
    
    THÔNG TIN DOANH NGHIỆP:
    - Tên: ${companyInfo.name}
    - MST: ${companyInfo.taxId}
    - Địa chỉ: ${companyInfo.address}

    DỮ LIỆU TÀI CHÍNH (${data.length} năm gần nhất):
    ${historySummary}

    SỐ LIỆU CHI TIẾT NĂM GẦN NHẤT (${data[0]?.year}):
    - Tổng tài sản: ${data[0]?.totalAssets.toLocaleString('vi-VN')} VND
    - Vốn chủ sở hữu: ${data[0]?.equity.toLocaleString('vi-VN')} VND
    - Hàng tồn kho: ${data[0]?.inventory.toLocaleString('vi-VN')} VND
    - Nợ phải trả: ${data[0]?.totalLiabilities.toLocaleString('vi-VN')} VND

    CÁC CHỈ SỐ TÀI CHÍNH QUAN TRỌNG (Năm ${data[0]?.year}):
    - Thanh khoản hiện hành: ${ratios.liquidity.currentRatio.toFixed(2)}
    - Tỷ suất LN gộp: ${(ratios.profitability.grossMargin * 100).toFixed(2)}%
    - Tỷ suất LN ròng: ${(ratios.profitability.netMargin * 100).toFixed(2)}%
    - ROE: ${(ratios.profitability.roe * 100).toFixed(2)}%
    - Tỷ số Nợ/Tổng tài sản: ${(ratios.leverage.debtToAssets * 100).toFixed(2)}%
    - Vòng quay hàng tồn kho: ${ratios.activity.inventoryTurnover.toFixed(2)} vòng
    - Vòng quay tổng tài sản: ${ratios.activity.assetTurnover.toFixed(2)} vòng

    NHIỆM VỤ CỦA BẠN:
    1. Trả lời câu hỏi dựa trên số liệu thực tế ở trên.
    2. Phân tích xu hướng tăng trưởng giữa các năm nếu được hỏi.
    3. Đưa ra cảnh báo nếu chỉ số nợ quá cao (>60%) hoặc thanh khoản quá thấp (<1.0).
    4. Đưa ra lời khuyên ngắn gọn, súc tích, chuyên nghiệp.
    5. Định dạng câu trả lời bằng Markdown đẹp mắt (dùng bold, list).
  `;

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: context,
    },
  });
};