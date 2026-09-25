import './globals.css';
import Header from '../components/header';
import Footer from '../components/footer';

export const metadata = {
  title: 'vivu.vn',
  description: 'Hệ thống thiết kế và quản lý lịch trình du lịch cho cá nhân, gia đình và doanh nghiệp',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
  <body className="app-shell">
        <Header />
        <main className="app-main">{children}</main>
        <Footer />
        <style>{`
          .app-shell {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            margin: 0;
          }
          .app-main {
            flex: 1 0 auto;
          }
        `}</style>
      </body>
    </html>
  );
}
