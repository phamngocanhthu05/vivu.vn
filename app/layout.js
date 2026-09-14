import './globals.css';

export const metadata = {
  title: 'Itinerary planner',
  description: 'Plan trips with friends, on a map, on a budget.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
