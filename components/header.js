'use client';

import Link from 'next/link';
import Image from 'next/image';

const INK = '#1C2B3A';
const TERRACOTTA = '#A8503B';
const PARCHMENT = '#F1E9D8';

export default function Header() {
  return (
    <header className="site-header">
      <Link href="/trips" className="brand">
       <Image src="/apple-touch-icon.png" alt="vivu.vn" width={50} height={50} />
        <span>vivu.vn</span>
      </Link>
      <nav className="nav-links">
        <Link href="/trips">Chuyến đi của bạn</Link>
        <Link href="/trips/new">Tạo chuyến đi</Link>
        <Link href="/help">Trợ giúp</Link>
      </nav>

      <style jsx>{`
        .site-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: ${PARCHMENT};
          border-bottom: 1px solid rgba(28,43,58,0.12);
         font-family: 'Fraunces', Georgia, 'Times New Roman', serif;
        }
        .brand {
          font-family: 'Fraunces', serif;
          font-size: 20px;
          font-weight: 500;
          color: ${INK};
          text-decoration: none;
        }
        .nav-links {
          display: flex;
          gap: 20px;
        }
        .nav-links a {
          color: ${INK};
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: color 0.2s ease;
        }
        .nav-links a:hover {
          color: ${TERRACOTTA};
        }
        @media (max-width: 600px) {
          .site-header {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
          }
        }
      `}</style>
    </header>
  );
}