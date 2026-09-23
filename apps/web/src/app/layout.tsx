import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import { Providers } from './providers';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
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
      <body className={`${dmSans.className} min-h-screen bg-gray-50 text-gray-900 font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
