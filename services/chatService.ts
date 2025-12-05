import { GoogleGenerativeAI } from "@google/generative-ai";
import Constants from "expo-constants";
import { get, ref } from "firebase/database";
import { db } from "./firebase";

// 1. Cấu hình Gemini
const API_KEY = (Constants.expoConfig as any)?.extra?.geminiApiKey;
const genAI = new GoogleGenerativeAI(API_KEY);

// 2. Hàm lấy danh sách món ăn (Giữ nguyên để tư vấn món)
async function getAllFoodsForAI() {
  try {
    const snapshot = await get(ref(db, "Foods")); 
    const list: string[] = [];
    
    snapshot.forEach((child) => {
      const val = child.val();
      if (val) {
        // Chỉ lấy tên, giá và mô tả
        list.push(`${val.Title || val.title} (${val.Price || val.price}đ): ${val.Description || ''}`);
      }
    });
    
    return list.join("\n");
  } catch (e) {
    console.error("Lỗi lấy món ăn:", e);
    return ""; 
  }
}

// 3. Hàm Gửi tin nhắn (Đã bỏ phần đọc Order)
export async function sendMessageToGemini(userMessage: string, userId: string, userName: string) {
  try {
    // Chỉ lấy dữ liệu Menu
    const menuData = await getAllFoodsForAI();

    // Tạo Prompt mới: Chỉ tập trung vào bán hàng
    const systemInstruction = `
      Bạn là nhân viên tư vấn của app đặt đồ ăn. Tên khách hàng: ${userName}.
      
      === MENU QUÁN ===
      ${menuData}

      YÊU CẦU:
      1. Trả lời ngắn gọn, thân thiện, dùng tiếng Việt.
      2. Nhiệm vụ chính là gợi ý món ăn từ Menu ở trên.
      3. Nếu khách hỏi về lịch sử đơn hàng, hãy trả lời khéo léo là bạn chưa được cấp quyền xem thông tin đó.
      4. Tuyệt đối không bịa ra món không có trong Menu.
    `;

    // Gọi Gemini
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", 
      systemInstruction: systemInstruction 
    });

    const result = await model.generateContent(userMessage);
    return result.response.text();

  } catch (error) {
    console.error("Gemini Error:", error);
    return "Xin lỗi, hệ thống AI đang bận. Bạn vui lòng thử lại sau nhé!";
  }
}