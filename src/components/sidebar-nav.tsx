

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  CircleDollarSign,
  UsersRound,
  BarChartBig,
  TriangleAlert,
  Settings,
  Croissant,
  Truck,
  Package,
  PanelLeft,
  Receipt,
  HandCoins,
  LogOut,
  FileText,
  Users,
  User,
} from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { LanguageSwitcher } from './language-switcher';
import { useData } from '@/contexts/data-context';
import { Badge } from './ui/badge';
import { useState, useEffect, useMemo } from 'react';
import { useSettings } from '@/contexts/settings-context';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { calculateDebtAlerts } from '@/lib/utils';
import { format } from 'date-fns';
import { fr, ar } from 'date-fns/locale';
import { useAuth, useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';


export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, language, dir } = useLanguage();
  const { products, customers, salesHistory, isLoading } = useData();
  const { settings } = useSettings();
  const [isMounted, setIsMounted] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const auth = useAuth();
  const { user, userProfile } = useUser();


  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  };

  const dateLocale = useMemo(() => (language === 'ar' ? ar : fr), [language]);

  const lowStockCount = useMemo(() => {
    if (isLoading) return 0;
    return products.filter(p => p && p.stock <= (p.minStock || 0)).length;
  }, [products, isLoading]);

  const debtAlertCount = useMemo(() => {
    if (isLoading) return 0;
    return calculateDebtAlerts(customers, salesHistory, settings.paymentTermsDays).length;
  }, [customers, salesHistory, settings.paymentTermsDays, isLoading]);

  const totalAlertCount = lowStockCount + debtAlertCount;
  
  const navItems = useMemo(() => {
    return [
      { href: '/', label: t.nav.reports, icon: BarChartBig },
      { href: '/pos', label: t.nav.pos, icon: CircleDollarSign },
      { href: '/products', label: t.nav.products, icon: Package },
      { href: '/customers', label: t.nav.customers, icon: UsersRound },
      { href: '/suppliers', label: t.nav.suppliers, icon: Truck },
      { href: '/purchase-orders', label: t.nav.purchaseOrders, icon: FileText },
      { href: '/bakery-orders', label: t.nav.bakeryOrders, icon: Croissant },
      { href: '/expenses', label: t.nav.expenses, icon: Receipt },
      { href: '/alerts', label: t.nav.alerts, icon: TriangleAlert, alertCount: totalAlertCount },
      { href: '/zakat', label: t.nav.zakat, icon: HandCoins },
      { href: '/users', label: t.nav.userManagement, icon: Users },
      { href: '/settings', label: t.nav.settings, icon: Settings },
    ];
  }, [t, totalAlertCount]);

  const AppLogo = () => (
    <div className="bg-primary/10 p-2 rounded-lg group">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-10 w-10 text-primary transition-transform duration-300 group-hover:scale-110"
        >
            <path d="M7 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7Z" />
            <path d="M16 2v4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4" />
            <path d="M12 18h.01" />
        </svg>
    </div>
  );

  const ClockDisplay = () => (
    <div className="group-data-[collapsible=icon]:hidden px-2 text-center">
        <p className="font-semibold text-lg">{format(currentDateTime, 'HH:mm:ss')}</p>
        <p className="text-xs text-muted-foreground">{format(currentDateTime, 'PPPP', { locale: dateLocale })}</p>
    </div>
  );

  const UserMenu = () => {
    const userInitial = userProfile?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?';
    return (
        <div className="flex flex-col gap-2">
            <Button
                variant={pathname === '/profile' ? 'accent' : 'ghost'}
                className="w-full justify-start items-center p-2 h-auto text-left rounded-lg"
                asChild
            >
                <Link href="/profile">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user?.photoURL || ''} alt={userProfile?.name || user?.email || ''} />
                        <AvatarFallback>{userInitial}</AvatarFallback>
                    </Avatar>
                    <div className="group-data-[collapsible=icon]:hidden flex-grow overflow-hidden ml-2 rtl:mr-2 rtl:ml-0">
                        <p className="text-sm font-medium truncate">{userProfile?.name || user?.email}</p>
                    </div>
                </Link>
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:size-10"
                onClick={handleSignOut}
            >
                <LogOut className="h-4 w-4"/>
                <span className="group-data-[collapsible=icon]:hidden ml-2 rtl:mr-2 rtl:ml-0">{t.auth.signOut}</span>
            </Button>
        </div>
    )
  }

  if (!isMounted) {
    return (
      <div className="w-16 hidden md:block">
        <div className="p-4"><Skeleton className="h-8 w-8" /></div>
        <div className="p-2 space-y-2 mt-4">
          <Skeleton className="h-9 w-12" />
          <Skeleton className="h-9 w-12" />
          <Skeleton className="h-9 w-12" />
          <Skeleton className="h-9 w-12" />
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="absolute top-4 z-20 flex items-center gap-2 ltr:left-4 rtl:right-4 md:hidden">
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                    <PanelLeft />
                    <span className="sr-only">Toggle Sidebar</span>
                </Button>
            </SheetTrigger>
            <SheetContent side={dir === 'rtl' ? 'right' : 'left'} className="p-0">
                 <SheetHeader className="sr-only">
                    <SheetTitle>Navigation Menu</SheetTitle>
                    <SheetDescription>
                        Contains the main navigation links for the application.
                    </SheetDescription>
                 </SheetHeader>
                <div className="flex h-full w-full flex-col">
                    <SidebarHeader>
                        <div className="flex items-center gap-3">
                        <AppLogo />
                        <div className="group-data-[collapsible=icon]:hidden">
                            <div className="flex flex-col">
                                <span className="font-headline text-lg font-bold leading-tight">{t.appName}</span>
                            </div>
                        </div>
                        </div>
                    </SidebarHeader>
                    <SidebarContent className="flex flex-col">
                        <Separator className="my-2" />
                        <SidebarMenu>
                        {navItems.map((item) => (
                            <SidebarMenuItem key={item.href}>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === item.href}
                            >
                                <Link href={item.href} className="relative">
                                <item.icon className="h-5 w-5" />
                                <span>{item.label}</span>
                                {item.alertCount && item.alertCount > 0 ? (
                                    <Badge variant="destructive" className="absolute top-1 right-1 h-5 w-5 justify-center p-0">
                                    {item.alertCount}
                                    </Badge>
                                ) : null}
                                </Link>
                            </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                        </SidebarMenu>
                    </SidebarContent>
                    <SidebarFooter>
                        <ClockDisplay />
                        <Separator className="my-2" />
                        <LanguageSwitcher />
                        <Separator className="my-2" />
                        <UserMenu />
                    </SidebarFooter>
                </div>
            </SheetContent>
        </Sheet>
    </div>
    <Sidebar side={dir === 'rtl' ? 'right' : 'left'} collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <AppLogo />
          <div className="group-data-[collapsible=icon]:hidden">
            {isMounted ? (
                <div className="flex flex-col">
                    <span className="font-headline text-lg font-bold leading-tight">{t.appName}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                    <Skeleton className="h-5 w-24" />
                </div>
              )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col">
        <Separator className="my-2" />
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href} className="relative">
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                  {item.alertCount && item.alertCount > 0 ? (
                    <Badge variant="destructive" className="absolute top-1 right-1 h-5 w-5 justify-center p-0 group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:right-0">
                      {item.alertCount}
                    </Badge>
                  ) : null}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
         <div className="group-data-[collapsible=icon]:hidden w-full">
            <ClockDisplay />
            <Separator className="my-2" />
            <LanguageSwitcher />
        </div>
        <Separator className="my-2" />
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
    </>
  );
}
