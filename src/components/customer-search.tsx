
'use client';

import * as React from 'react';
import { Check, PlusCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from './ui/badge';
import type { Customer } from '@/contexts/data-context';
import { useLanguage } from '@/contexts/language-context';
import { useSettings } from '@/contexts/settings-context';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from './ui/command';

interface CustomerSearchProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelectCustomer: (customerId: string | null) => void;
  onAddNewCustomer: () => void;
}

export const CustomerSearch = React.forwardRef<
  { focus: () => void },
  CustomerSearchProps
>(({ customers, selectedCustomerId, onSelectCustomer, onAddNewCustomer }, ref) => {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
  }));

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;

  const handleSelect = (customerId: string | null) => {
    onSelectCustomer(customerId);
    setSearchValue('');
    setOpen(false);
  };

  const filteredCustomers = searchValue
    ? customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          customer.phone?.includes(searchValue)
      )
    : customers;

  if (selectedCustomer) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-input p-2">
        <div className="flex-grow">
          <p className="text-sm font-medium">{selectedCustomer.name}</p>
          <p className="text-xs text-muted-foreground">
            {t.customers.balance}:{' '}
            <span
              className={cn(
                'font-semibold',
                selectedCustomer.balance > 0 ? 'text-destructive' : 'text-success'
              )}
            >
              {settings.currency}
              {selectedCustomer.balance.toFixed(2)}
            </span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onSelectCustomer(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            placeholder={`${t.customers.searchCustomers} (F4)`}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setOpen(true)}
            className="w-full"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>
              <div className="p-4 text-center text-sm">{t.customers.noCustomerFound}</div>
            </CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={onAddNewCustomer} className="text-primary">
                <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                {t.customers.addCustomer}
              </CommandItem>
              <CommandItem value="no-customer" onSelect={() => handleSelect(null)}>
                <Check
                  className={cn(
                    'mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0',
                    !selectedCustomerId ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {t.pos.noCustomer}
              </CommandItem>
              {filteredCustomers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.name}
                  onSelect={() => handleSelect(customer.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0',
                      selectedCustomerId === customer.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span>{customer.name}</span>
                  {customer.balance > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {settings.currency}
                      {customer.balance.toFixed(2)}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
CustomerSearch.displayName = 'CustomerSearch';
