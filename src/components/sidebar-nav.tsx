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
  useSidebar,
} from '@/components/ui/sidebar';
import {
  CircleDollarSign,
  UsersRound,
  BarChartBig,
  Package,
  TriangleAlert,
  Settings,
} from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { LanguageSwitcher } from './language-switcher';
import { useData } from '@/contexts/data-context';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/settings-context';
import { addDays, differenceInCalendarDays, getDate, getMonth, getYear, set } from 'date-fns';

export function SidebarNav() {
  const pathname = usePathname();
  const { t, dir } = useLanguage();
  const { products, customers, salesHistory, isLoading } = useData();
  const { settings } = useSettings();
  const [lowStockCount, setLowStockCount] = useState(0);
  const [debtAlertCount, setDebtAlertCount] = useState(0);

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
        let dueDate: Date | null = null;

        if (customer.settlementDay && customer.settlementDay >= 1 && customer.settlementDay <= 31) {
            if (getDate(today) >= customer.settlementDay) {
                dueDate = new Date(getYear(today), getMonth(today) + 1, customer.settlementDay);
            } else {
                dueDate = set(today, { date: customer.settlementDay });
            }
        } else {
            const debtCreatingSales = salesHistory
                .filter(s => s.customerId === customer.id && s.totals.balance > 0)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            if (debtCreatingSales.length > 0) {
                const oldestDebtSale = debtCreatingSales[0];
                dueDate = addDays(new Date(oldestDebtSale.date), settings.paymentTermsDays);
            }
        }

        if (dueDate && differenceInCalendarDays(dueDate, today) === 1) {
            count++;
        }
    }
    setDebtAlertCount(count);
  }, [customers, salesHistory, settings.paymentTermsDays, isLoading]);

  const totalAlertCount = lowStockCount + debtAlertCount;

  const navItems = [
    { href: '/', label: t.nav.pos, icon: CircleDollarSign },
    { href: '/products', label: t.nav.products, icon: Package },
    { href: '/customers', label: t.nav.customers, icon: UsersRound },
    { href: '/reports', label: t.nav.reports, icon: BarChartBig },
    { href: '/alerts', label: t.nav.alerts, icon: TriangleAlert, alertCount: totalAlertCount },
    { href: '/settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <>
    <div className="absolute top-4 z-20 flex items-center gap-2 ltr:left-4 rtl:right-4 md:hidden">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <span className="font-headline text-xl font-bold">{t.appName}</span>
              <p className="text-xs text-muted-foreground -mt-1">{settings.companyInfo.name}</p>
            </div>
        </div>
    </div>
    <Sidebar side={dir === 'rtl' ? 'right' : 'left'}>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <span className="font-headline text-xl font-bold">{t.appName}</span>
            <p className="text-sm text-muted-foreground">{settings.companyInfo.name}</p>
          </div>
          <div className="grow" />
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
                    <Badge variant="destructive" className="absolute top-1 right-1 h-5 w-5 justify-center p-0 group-data-[collapsible=icon]:hidden">
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
    </Sidebar>
    </>
  );
}
