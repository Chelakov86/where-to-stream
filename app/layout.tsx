import type { Metadata } from 'next';
import './globals.css';
import Header from './components/Header';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';

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
    <html lang="en" className="dark">
      <body className="text-white min-h-screen flex flex-col">
        <ErrorBoundary>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
              {children}
            </main>
            <Footer />
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
