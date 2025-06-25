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
} from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { LanguageSwitcher } from './language-switcher';

export function SidebarNav() {
  const pathname = usePathname();
  const { t, dir } = useLanguage();

  const navItems = [
    { href: '/', label: t.nav.pos, icon: CircleDollarSign },
    { href: '/customers', label: t.nav.customers, icon: UsersRound },
    { href: '/reports', label: t.nav.reports, icon: BarChartBig },
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
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
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
