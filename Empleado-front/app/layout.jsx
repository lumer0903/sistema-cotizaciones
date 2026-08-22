import { Poppins } from 'next/font/google';
import '../src/styles/tailwind.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata = {
  title: 'Gold Continent'
};

export const viewport = { themeColor: '#0f766e' };

export default function RootLayout({ children }) {
  return <html lang="es" className={poppins.variable}><body>{children}</body></html>;
}
