import emailjs from "emailjs-com";

const SERVICE_ID  = "service_v5qfrqf";
const TEMPLATE_ID = "template_42olg89";
const PUBLIC_KEY  = "cJB0-VCPJKcF7QAyy"; // chỉ dùng cái này

// KHỞI TẠO VỚI PUBLIC_KEY  
emailjs.init(PUBLIC_KEY);

export const sendThankYouEmail = async (
  userEmail: string,
  userName: string,
  order: any
) => {
  console.log("BẮT ĐẦU GỬI MAIL CHO:", userEmail, "ORDER:", order.id);

  const total =
    (order.total || 0) +
    (order.tax || 0) +
    (order.deliveryFee || 10);

  const itemsList = (order.items || [])
    .map((item: any) => `${item.title || item.Title} × ${item.numberInCart || 1}`)
    .join("\n");

  // ⚠️ TÊN BIẾN PHẢI TRÙNG VỚI TEMPLATE TRONG EMAILJS
  const templateParams = {
    to_email: userEmail,
    to_name: userName || "Khách yêu",
    order_id: (order.id || "").slice(-8).toUpperCase(),
    items_list: itemsList,
    // Nếu bạn dùng VND thì có thể format lại
    total_amount: total.toLocaleString("vi-VN") + " ₫",
  };

  try {
    const res = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams // ❗ không cần tham số thứ 4 nữa, vì đã init ở trên
      // hoặc nếu muốn thì để PUBLIC_KEY ở đây thay vì PRIVATE_KEY
      // emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
    );
    console.log("GỬI MAIL THÀNH CÔNG:", res.status, res.text);
  } catch (error: any) {
    console.log("Lỗi gửi mail:", error?.text || error);
  }
};
