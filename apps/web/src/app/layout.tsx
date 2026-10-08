import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '../styles/tailwind.css';
import { Providers } from './providers';

const dmSans = localFont({
  src: [
    {
      path: './fonts/dmsans-latin.woff2',
      weight: '300 900',
      style: 'normal',
    },
  ],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Gold Continent',
  description: 'Sistema de gestión comercial',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${dmSans.variable} ${dmSans.className} font-sans antialiased`}>
      <body className={`${dmSans.className} min-h-screen bg-zinc-50 text-zinc-900 font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
