import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import './globals.css';
import { Poppins } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import PWARegister from '@/components/pwa-register';

export const metadata = {
  title: 'BGattendance',
  description: 'Attendance and employee management',
  manifest: '/manifest.json',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1F2F3F' };

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins', display: 'swap' });

// Applies the saved theme before first paint (no white flash in dark mode).
const themeScript = `try{var v=localStorage.getItem('bg-theme');var d=v?v==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className={poppins.variable}>
        <ThemeProvider><PWARegister />{children}</ThemeProvider>
      </body>
    </html>
  );
}
