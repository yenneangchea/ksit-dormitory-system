import type { Metadata } from 'next';
import { Geist_Mono, Kantumruy_Pro, Koulen, Moul } from 'next/font/google';
import './globals.css';

const kantumruyPro = Kantumruy_Pro({
  variable: '--font-kantumruy-pro',
  subsets: ['khmer', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const koulen = Koulen({
  variable: '--font-koulen',
  subsets: ['khmer'],
  weight: '400',
  display: 'swap',
});

const moul = Moul({
  variable: '--font-moul',
  subsets: ['khmer'],
  weight: '400',
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'KSIT Dormitory Management System',
  description: 'Smart residence operations for Kampong Speu Institute of Technology.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="km" className={`${kantumruyPro.variable} ${koulen.variable} ${moul.variable} ${geistMono.variable}`}>
      <body>
        <script src="https://telegram.org/js/telegram-web-app.js" defer />
        {children}
      </body>
    </html>
  );
}
