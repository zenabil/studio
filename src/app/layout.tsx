import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppProviders } from '@/components/app-providers';
import { AppLayout } from '@/components/app-layout';

export const metadata: Metadata = {
  title: 'Mercurio POS',
  description: 'Point of Sale application for small businesses',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
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
