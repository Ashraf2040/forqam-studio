import type { Metadata } from 'next';
import './shell.css';

export const metadata: Metadata = {
  title: 'Alforqan - Studio',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%231e3a8a'/%3E%3Ctext x='32' y='45' font-size='38' font-family='Arial' font-weight='bold' text-anchor='middle' fill='white'%3EA%3C/text%3E%3C/svg%3E",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
