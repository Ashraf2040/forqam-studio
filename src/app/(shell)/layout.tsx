import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import './shell.css';

export const metadata: Metadata = {
  title: 'Alforqan Studio — Premium Classroom Game Platform',
  description:
    'Turn any lesson into an unforgettable game show. 8+ live game modes, smart question import (Excel, Word, paste), live scoreboards and analytics — built for teachers.',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23182a52'/%3E%3Cstop offset='1' stop-color='%230a1128'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' rx='16' fill='url(%23g)'/%3E%3Cpath d='M32 12l18 9-18 9-18-9z' fill='%23f0c05a'/%3E%3Cpath d='M22 27v10c0 4 5 7 10 7s10-3 10-7V27l-10 5z' fill='%232dd4bf'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = {
  themeColor: '#070b16',
  width: 'device-width',
  initialScale: 1,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Cairo:wght@400;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(13, 20, 36, 0.95)',
              color: '#eef2ff',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              fontWeight: 700,
              fontSize: 14,
              borderRadius: 16,
              boxShadow: '0 18px 46px rgba(2,6,18,.5)',
            },
            duration: 3200,
          }}
        />
      </body>
    </html>
  );
}
