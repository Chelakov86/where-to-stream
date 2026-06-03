import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from './components/Header';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

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
    <html lang="en">
      <body className={`${inter.className} bg-background text-text antialiased`}>
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
