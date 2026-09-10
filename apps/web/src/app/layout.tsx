import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import { Providers } from './providers';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });

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
    <html lang="es" className={`${dmSans.variable} font-sans antialiased`}>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}