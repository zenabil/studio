import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppProviders } from '@/components/app-providers';
import { AppLayout } from '@/components/app-layout';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Poppins } from 'next/font/google';
import { cn } from '@/lib/utils';
import NextTopLoader from 'nextjs-toploader';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthLayout } from '@/components/auth-layout';

export const metadata: Metadata = {
  title: 'Frucio',
  description: 'Point of Sale application for small businesses',
  manifest: '/manifest.json',
};

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <head />
      <body className={cn("font-body antialiased", poppins.className)}>
        <NextTopLoader
          color="hsl(var(--primary))"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px hsl(var(--primary)),0 0 5px hsl(var(--primary))"
        />
        <FirebaseClientProvider>
          <AppProviders>
              <AuthLayout>
                <SidebarProvider>
                  <AppLayout>{children}</AppLayout>
                </SidebarProvider>
              </AuthLayout>
            <Toaster />
          </AppProviders>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
