'use client';

import Link from 'next/link';

const INK = '#1C2B3A';
const TERRACOTTA = '#A8503B';
const PARCHMENT = '#F1E9D8';
const INK_SOFT = 'rgba(28,43,58,0.62)';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-row">
        <div className="footer-col">
          <p className="footer-brand">vivu.vn</p>
          <p className="footer-tagline">Hệ thống thiết kế và quản lý lịch trình du lịch cho cá nhân, gia đình và doanh nghiệp</p>
        </div>

        <div className="footer-col">
          <p className="footer-heading">Điều hướng</p>
          <Link href="/trips">Chuyến đi của bạn</Link>
          <Link href="/trips/new">Tạo chuyến đi</Link>
          <Link href="/help">Trợ giúp</Link>
        </div>

        <div className="footer-col">
          <p className="footer-heading">Pháp lý</p>
          <Link href="/privacy">Chính sách bảo mật</Link>
          <Link href="/terms">Điều khoản dịch vụ</Link>
          <a href="mailto:support@example.com">Liên hệ</a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} vivu.vn. Bản đồ © của cộng tác viên OpenStreetMap.</p>
      </div>

      <style jsx>{`
        .site-footer {
          background: ${PARCHMENT};
          border-top: 1px solid rgba(28,43,58,0.12);
         font-family: 'Fraunces', Georgia, 'Times New Roman', serif;
          color: ${INK};
          padding: 32px 24px 16px;
          margin-top: 40px;
        }
        .footer-row {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 32px;
          max-width: 960px;
          margin: 0 auto;
        }
        .footer-col {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 160px;
        }
        .footer-brand {
          font-family: 'Fraunces', serif;
          font-size: 18px;
          font-weight: 500;
          margin: 0;
        }
        .footer-tagline {
          font-size: 13px;
          color: ${INK_SOFT};
          margin: 0;
          max-width: 220px;
        }
        .footer-heading {
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 4px;
          color: ${INK_SOFT};
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .footer-col a {
          color: ${INK};
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s ease;
        }
        .footer-col a:hover {
          color: ${TERRACOTTA};
        }
        .footer-bottom {
          max-width: 960px;
          margin: 24px auto 0;
          padding-top: 16px;
          border-top: 1px solid rgba(28,43,58,0.1);
          font-size: 12px;
          color: ${INK_SOFT};
          text-align: center;
        }
      `}</style>
    </footer>
  );
}