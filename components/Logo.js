'use client';

import Link from 'next/link';

const INK = '#1C2B3A';
const TERRACOTTA = '#A8503B';
const BRASS = '#B9944B';

// Reusable vivu.vn logo: the compass/route mark plus wordmark, wrapped in a
// Link so clicking it anywhere in the app returns the user to the homepage.
export default function Logo({ href = '/trips' }) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        textDecoration: 'none',
      }}
    >
      <svg width="28" height="28" viewBox="0 20 220 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="110" cy="120" r="66" fill="none" stroke={INK} strokeWidth="5" />
        <path d="M55 195 L165 45" fill="none" stroke={TERRACOTTA} strokeWidth="5" strokeLinecap="round" strokeDasharray="3 17" />
        <circle cx="165" cy="45" r="10" fill={BRASS} />
      </svg>
      <span style={{ fontFamily: "'Fraunces', Georgia, 'Times New Roman', serif", fontWeight: 500, fontSize: '1.15rem' }}>
        <span style={{ color: INK }}>vivu</span>
        <span style={{ color: TERRACOTTA }}>.vn</span>
      </span>
    </Link>
  );
}
