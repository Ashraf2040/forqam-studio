import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Behavior & Academic Portal' };

// Own root layout: this screen is a full page of its own (it is shown inside the shell's iframe).
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="stylesheet" href="/legacy/portal/portal.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
