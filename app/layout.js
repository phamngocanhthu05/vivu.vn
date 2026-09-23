import './globals.css';

export const metadata = {
  title: 'vivu.vn',
  description: 'Hệ thống thiết kế và quản lý lịch trình du lịch cho cá nhân, gia đình và doanh nghiệp',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
