import '../src/styles/tailwind.css';

export const metadata = {
  title: 'Gold Continent'
};

export const viewport = { themeColor: '#0f766e' };

export default function RootLayout({ children }) {
  return <html lang="es"><body>{children}</body></html>;
}
