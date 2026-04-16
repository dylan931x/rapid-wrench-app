import type { Metadata, Viewport } from 'next';
import { PwaProvider } from '@/components/pwa/pwa-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rapid Wrench',
  description: 'Phone-first mobile mechanic field app.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Rapid Wrench',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}<PwaProvider /></body>
    </html>
  );
}
