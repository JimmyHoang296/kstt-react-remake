// Supabase — primary data backend (Postgres via PostgREST)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

// Google Apps Script Web App dành riêng cho tính năng "Ghi nhận" (kstt-gas-violation/,
// có thể deploy bằng một tài khoản Google khác với tài khoản chạy kstt-gas chính):
//   - createRecord (tạo biên bản Word từ template trong Drive)
//   - notify / notifyHighlight (gửi Telegram, AI tóm tắt qua Gemini)
//   - uploadImage (lưu ảnh ghi nhận lên Drive)
export const VIOLATION_GAS_URL = import.meta.env.VITE_VIOLATION_GAS_URL || '';
