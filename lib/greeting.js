import { useState, useEffect } from 'react';

const TET = { 2025: [1, 29], 2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3] };
const GIO_TO_HUNG_VUONG = { 2025: [4, 7], 2026: [4, 26], 2027: [3, 17], 2028: [4, 4], 2029: [3, 24], 2030: [4, 12] };
const TRUNG_THU = { 2025: [10, 6], 2026: [9, 25], 2027: [9, 15], 2028: [10, 3], 2029: [9, 22], 2030: [9, 12] };

function withinWindow(table, now, year, spanDays) {
  const d = table[year];
  if (!d) return false;
  const target = new Date(year, d[0] - 1, d[1]);
  const diffDays = Math.round((now - target) / 86400000);
  return diffDays >= 0 && diffDays <= spanDays;
}

export function computeGreeting() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();
  const weekday = now.getDay();
  const hour = now.getHours();
  const dateLabel = now.toLocaleDateString('vi-VN', { weekday: 'long', month: 'long', day: 'numeric' });

  const withDate = (rest) => ({ ...rest, dateLabel });

  if (month === 1 && day === 1)
    return withDate({ greeting: 'Chúc mừng năm mới', subline: 'Một năm mới, một hành trình mới. Đi đâu đây?', accent: '#B9944B' });
  if (month === 12 && day === 31)
    return withDate({ greeting: 'Còn một ngày nữa thôi', subline: 'Khép lại năm cũ bằng một điều đáng nhớ. Cùng lên kế hoạch nhé.', accent: '#B9944B' });
  if (withinWindow(TET, now, year, 6))
    return withDate({ greeting: 'Tết là ngày đoàn viên', subline: 'Mở đầu hành trình mới bằng một chuyến du xuân nhé?', accent: '#B9944B' });
  if (month === 2 && day === 14)
    return withDate({ greeting: 'Chúc mừng Lễ Tình nhân', subline: 'Đã có kế hoạch gì với "nửa kia" chưa?', accent: '#A8455B' });
  if (withinWindow(GIO_TO_HUNG_VUONG, now, year, 0))
    return withDate({ greeting: 'Giỗ Tổ Hùng Vương', subline: 'Mùng 10 tháng 3 — dịp để nhớ cội nguồn, và cũng là dịp để xách vali lên đường.', accent: '#8A5A34' });
  if ((month === 4 && day === 30) || (month === 5 && day === 1))
    return withDate({ greeting: 'Chúc mừng dịp lễ 30/4 - 1/5', subline: 'Kỳ nghỉ lễ dài đang đến gần — đã có điểm đến chưa?', accent: '#A8503B' });
  if (withinWindow(TRUNG_THU, now, year, 0))
    return withDate({ greeting: 'Chúc Tết Trung Thu', subline: 'Mùa trăng rằm, mùa của những chuyến đi ngắn ngày.', accent: '#B9944B' });
  if (month === 9 && day === 2)
    return withDate({ greeting: 'Chúc mừng Quốc khánh 2/9', subline: 'Một kỳ nghỉ dài nữa — cùng lên kế hoạch cho chuyến đi tiếp theo.', accent: '#A8503B' });
  if (month === 10 && day === 31)
    return withDate({ greeting: 'Chúc mừng lễ Halloween', subline: 'Không có trò đùa nào ở đây — chỉ có điểm đến tiếp theo của bạn.', accent: '#A8503B' });
  if (month === 12 && day >= 24 && day <= 26)
    return withDate({ greeting: 'Giáng sinh an lành', subline: 'Đã đến lúc lên kế hoạch cho nơi năm mới sẽ đưa bạn đến.', accent: '#33503F' });

  if (weekday === 5)
    return withDate({ greeting: 'Thứ Sáu vui vẻ', subline: 'Đến giờ tìm nơi để đi cuối tuần rồi.', accent: '#A8503B' });
  if (weekday === 6 || weekday === 0)
    return withDate({ greeting: 'Cuối tuần vui vẻ chứ?', subline: 'Tranh thủ vạch ra chuyến đi tiếp theo trước khi cuối tuần này kết thúc.', accent: '#A8503B' });

  if (hour < 5) return withDate({ greeting: 'Vẫn còn thức à?', subline: 'Giá vé tốt thường xuất hiện vào những giờ lạ. Cùng xem có gì hay ho không.', accent: '#A8503B' });
  if (hour < 12) return withDate({ greeting: 'Chào buổi sáng', subline: 'Vạch ra lịch trình, phần còn lại để chúng tôi lo.', accent: '#A8503B' });
  if (hour < 17) return withDate({ greeting: 'Chào buổi chiều', subline: 'Vạch ra lịch trình, đặt chỗ nghỉ, phần hậu cần để vivu lo.', accent: '#A8503B' });
  if (hour < 21) return withDate({ greeting: 'Chào buổi tối', subline: 'Thời điểm thích hợp để mơ về chuyến đi tiếp theo.', accent: '#A8503B' });
  return withDate({ greeting: 'Chúc ngủ ngon', subline: 'Tìm thêm một chuyến đi trước khi ngủ nhé? Vivu sẽ không nói cho ai biết đâu.', accent: '#A8503B' });
}

// Computed client-side only, in useEffect — Date() must not run during SSR
// render or the server-rendered HTML won't match the client's first render.
export function useAdaptiveGreeting() {
  const [state, setState] = useState(null);
  useEffect(() => {
    setState(computeGreeting());
  }, []);
  return state;
}
