import type { Metadata } from 'next';
import { Sora, Manrope } from 'next/font/google';
import './globals.css';
import Header from './components/Header';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';

const sora = Sora({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: 'WhereToStream',
  description: 'Find where movies and TV shows are streaming',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable}`}>
      <body className="bg-background font-body text-foreground antialiased">
        <ErrorBoundary>
          <div className="flex min-h-screen flex-col">
            <Header />
            <div className="flex-grow">{children}</div>
            <Footer />
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
