'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { LanguageSwitcher } from './language-switcher';
import { useData } from '@/contexts/data-context';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useMemo } from 'react';
import { useSettings } from '@/contexts/settings-context';
import { addDays, differenceInCalendarDays, set, isBefore, addMonths } from 'date-fns';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

export function SidebarNav() {
  const pathname = usePathname();
  const { t, dir } = useLanguage();
  const { products, customers, salesHistory, isLoading } = useData();
  const { settings } = useSettings();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const lowStockCount = useMemo(() => {
    if (isLoading) return 0;
    return products.filter(p => p.stock <= (p.minStock || 0)).length;
  }, [products, isLoading]);

  const debtAlertCount = useMemo(() => {
    if (isLoading) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let count = 0;
    
    const indebtedCustomers = customers.filter(c => c.balance > 0);
    const allSalesSorted = salesHistory.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const customer of indebtedCustomers) {
        let debtOriginDate: Date | null = null;
        let balanceTrace = customer.balance;
        
        const customerHistory = allSalesSorted.filter(s => s.customerId === customer.id);
        for (let i = customerHistory.length - 1; i >= 0; i--) {
            const tx = customerHistory[i];
            if (balanceTrace <= 0) break;

            debtOriginDate = new Date(tx.date);
            
            if (tx.items.length > 0) { // It's a Sale
                balanceTrace -= tx.totals.balance;
            } else { // It's a Payment
                balanceTrace += tx.totals.amountPaid;
            }
        }
        
        if (!debtOriginDate) continue; // Safeguard

        let alertDueDate: Date | null = null;
        
        if (customer.settlementDay && customer.settlementDay >= 1 && customer.settlementDay <= 31) {
            let relevantDueDate = set(debtOriginDate, { date: customer.settlementDay });
            if (isBefore(relevantDueDate, debtOriginDate)) {
                relevantDueDate = addMonths(relevantDueDate, 1);
            }
            alertDueDate = relevantDueDate;
        } else if (settings.paymentTermsDays > 0) {
            alertDueDate = addDays(debtOriginDate, settings.paymentTermsDays);
        }
        
        if (alertDueDate) {
          const daysUntilDue = differenceInCalendarDays(alertDueDate, today);
          if (daysUntilDue <= 1) {
              count++;
          }
        }
    }
    return count;
  }, [customers, salesHistory, settings.paymentTermsDays, isLoading]);

  const totalAlertCount = lowStockCount + debtAlertCount;
  
  const navItems = useMemo(() => [
    { href: '/', label: t.nav.pos, icon: CircleDollarSign },
    { href: '/products', label: t.nav.products, icon: Package },
    { href: '/customers', label: t.nav.customers, icon: UsersRound },
    { href: '/suppliers', label: t.nav.suppliers, icon: Truck },
    { href: '/bakery-orders', label: t.nav.bakeryOrders, icon: Croissant },
    { href: '/reports', label: t.nav.reports, icon: BarChartBig },
    { href: '/alerts', label: t.nav.alerts, icon: TriangleAlert, alertCount: totalAlertCount },
    { href: '/settings', label: t.nav.settings, icon: Settings },
  ], [t, totalAlertCount]);

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
                        <div className="group-data-[collapsible=icon]:hidden">
                            <div className="flex flex-col">
                                <span className="font-headline text-lg font-bold leading-tight">{t.appName}</span>
                                <Badge variant="success" className="w-fit px-1.5 text-[10px] leading-none">
                                    {t.appStatus.pro}
                                </Badge>
                            </div>
                        </div>
                        </div>
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarMenu>
                        {navItems.map((item) => (
                            <SidebarMenuItem key={item.label}>
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
                        <LanguageSwitcher />
                    </SidebarFooter>
                </div>
            </SheetContent>
        </Sheet>
    </div>
    <Sidebar side={dir === 'rtl' ? 'right' : 'left'} collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-3">
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
          <div className="group-data-[collapsible=icon]:hidden">
            {isMounted ? (
                <div className="flex flex-col">
                    <span className="font-headline text-lg font-bold leading-tight">{t.appName}</span>
                    <Badge variant="success" className="w-fit px-1.5 text-[10px] leading-none">
                        {t.appStatus.pro}
                    </Badge>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-3 w-12" />
                </div>
              )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
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
            <LanguageSwitcher />
        </div>
      </SidebarFooter>
    </Sidebar>
    </>
  );
}
