import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppProviders } from '@/components/app-providers';
import { AppLayout } from '@/components/app-layout';
import { SidebarProvider } from '@/components/ui/sidebar';
import { GeistSans } from 'geist/font/sans';
import { cn } from '@/lib/utils';
import NextTopLoader from 'nextjs-toploader';

export const metadata: Metadata = {
  title: 'Frucio',
  description: 'Point of Sale application for small businesses',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <head />
      <body className="font-sans antialiased">
        <NextTopLoader
          color="#008080"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #008080,0 0 5px #008080"
        />
        <AppProviders>
          <SidebarProvider>
            <AppLayout>{children}</AppLayout>
          </SidebarProvider>
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
