import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { Sora, Manrope } from 'next/font/google';
import './globals.css';
import AppHeader from './components/AppHeader';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';

const sora = Sora({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: 'WhereToStream — Find where to stream any movie or series',
  description:
    'Search movies and TV shows and see which streaming services carry them in your country, plus rent and buy options worldwide.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable}`}>
      <body className="bg-background font-body text-foreground antialiased">
        <ErrorBoundary>
          <div className="flex min-h-screen flex-col">
            <Suspense fallback={<div className="h-16 border-b border-border" />}>
              <AppHeader />
            </Suspense>
            <div className="flex-grow">{children}</div>
            <Footer />
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
