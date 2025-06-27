'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  CircleDollarSign,
  UsersRound,
  BarChartBig,
  TriangleAlert,
  Settings,
  Croissant,
  Truck,
} from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { LanguageSwitcher } from './language-switcher';
import { useData } from '@/contexts/data-context';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/settings-context';
import { addDays, differenceInCalendarDays, getDate, getMonth, getYear, set } from 'date-fns';
import { Skeleton } from './ui/skeleton';

export function SidebarNav() {
  const pathname = usePathname();
  const { t, dir } = useLanguage();
  const { products, customers, salesHistory, isLoading } = useData();
  const { settings } = useSettings();
  const [lowStockCount, setLowStockCount] = useState(0);
  const [debtAlertCount, setDebtAlertCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    setLowStockCount(products.filter(p => p.stock <= (p.minStock || 0)).length);
  }, [products, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let count = 0;
    const indebtedCustomers = customers.filter(c => c.balance > 0);

    for (const customer of indebtedCustomers) {
        let alertDueDate: Date | null = null;
        
        // Priority 1: Customer-specific settlement day
        if (customer.settlementDay && customer.settlementDay >= 1 && customer.settlementDay <= 31) {
            const todayDate = getDate(today);
            const currentMonth = getMonth(today);
            const currentYear = getYear(today);

            if (todayDate >= customer.settlementDay) {
                // Due date is next month
                alertDueDate = new Date(currentYear, currentMonth + 1, customer.settlementDay);
            } else {
                // Due date is this month
                alertDueDate = set(today, { date: customer.settlementDay });
            }
        } 
        // Priority 2: Global payment terms based on oldest debt-creating sale
        else {
            const debtCreatingSales = salesHistory
                .filter(s => s.customerId === customer.id && s.totals.balance > 0)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            if (debtCreatingSales.length > 0) {
                const oldestDebtSale = debtCreatingSales[0];
                alertDueDate = addDays(new Date(oldestDebtSale.date), settings.paymentTermsDays);
            }
        }
        
        // Check if the due date is tomorrow to trigger an alert
        if (alertDueDate && differenceInCalendarDays(alertDueDate, today) === 1) {
            count++;
        }
    }
    setDebtAlertCount(count);
  }, [customers, salesHistory, settings.paymentTermsDays, isLoading]);

  const totalAlertCount = lowStockCount + debtAlertCount;

  const navItems = [
    { href: '/', label: t.nav.pos, icon: CircleDollarSign },
    { href: '/products', label: t.nav.products, icon: UsersRound },
    { href: '/customers', label: t.nav.customers, icon: UsersRound },
    { href: '/suppliers', label: t.nav.suppliers, icon: Truck },
    { href: '/bakery-orders', label: t.nav.bakeryOrders, icon: Croissant },
    { href: '/reports', label: t.nav.reports, icon: BarChartBig },
    { href: '/alerts', label: t.nav.alerts, icon: TriangleAlert, alertCount: totalAlertCount },
    { href: '/settings', label: t.nav.settings, icon: Settings },
  ];

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
        <SidebarTrigger />
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
                className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110"
              >
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" x2="21" y1="6" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
           </div>
          <div className="group-data-[collapsible=icon]:hidden">
            {isMounted ? (
                <span className="font-headline text-lg font-bold">{t.appName}</span>
              ) : (
                <Skeleton className="h-6 w-36" />
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
      <SidebarFooter className="group-data-[collapsible=icon]:items-center">
        <LanguageSwitcher />
      </SidebarFooter>
    </Sidebar>
    </>
  );
}
