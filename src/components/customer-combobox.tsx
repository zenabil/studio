'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Customer } from '@/lib/data';
import { useLanguage } from '@/contexts/language-context';

interface CustomerComboboxProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelectCustomer: (customerId: string | null) => void;
}

export function CustomerCombobox({
  customers,
  selectedCustomerId,
  onSelectCustomer,
}: CustomerComboboxProps) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) || null;

  const filteredCustomers = React.useMemo(() => {
    if (!search) return customers;
    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [customers, search]);

  const handleSelect = (customerId: string | null) => {
    onSelectCustomer(customerId);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCustomer ? selectedCustomer.name : t.pos.selectCustomer}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t.customers.searchCustomers}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{t.customers.noCustomerFound}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="no-customer"
                onSelect={() => handleSelect(null)}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    !selectedCustomerId ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {t.pos.noCustomer}
              </CommandItem>
              {filteredCustomers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onSelect={() => handleSelect(customer.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedCustomerId === customer.id
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  {customer.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
