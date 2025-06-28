import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppProviders } from '@/components/app-providers';
import { AppLayout } from '@/components/app-layout';
import { SidebarProvider } from '@/components/ui/sidebar';
import { GeistSans } from 'geist/font/sans';
import { cn } from '@/lib/utils';

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
