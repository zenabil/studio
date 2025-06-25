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
  Package,
  TriangleAlert,
} from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { LanguageSwitcher } from './language-switcher';
import { useData } from '@/contexts/data-context';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';

export function SidebarNav() {
  const pathname = usePathname();
  const { t, dir } = useLanguage();
  const { products } = useData();

  const lowStockCount = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock).length;
  }, [products]);

  const navItems = [
    { href: '/', label: t.nav.pos, icon: CircleDollarSign },
    { href: '/products', label: t.nav.products, icon: Package },
    { href: '/customers', label: t.nav.customers, icon: UsersRound },
    { href: '/reports', label: t.nav.reports, icon: BarChartBig },
    { href: '/alerts', label: t.nav.alerts, icon: TriangleAlert, alertCount: lowStockCount },
  ];

  return (
    <>
    <div className="absolute top-4 z-20 flex items-center gap-2 ltr:left-4 rtl:right-4 md:hidden">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            <span className="font-headline text-xl font-bold">{t.appName}</span>
        </div>
    </div>
    <Sidebar side={dir === 'rtl' ? 'right' : 'left'}>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          <span className="font-headline text-xl font-bold">{t.appName}</span>
          <div className="grow" />
          <SidebarTrigger className="hidden md:flex" />
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
