'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react';

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
  onAddNewCustomer: () => void;
}

export const CustomerCombobox = React.forwardRef<HTMLButtonElement, CustomerComboboxProps>(
  ({ customers, selectedCustomerId, onSelectCustomer, onAddNewCustomer }, ref) => {
    const { t } = useLanguage();
    const [open, setOpen] = React.useState(false);

    const selectedCustomer =
      customers.find((c) => c.id === selectedCustomerId) || null;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
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
          <Command>
            <CommandInput placeholder={t.customers.searchCustomers} />
            <CommandList>
              <CommandEmpty>{t.customers.noCustomerFound}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onAddNewCustomer();
                    setOpen(false);
                  }}
                  className="text-primary"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t.customers.addCustomer}
                </CommandItem>
                <CommandItem
                  value="no-customer"
                  onSelect={() => {
                    onSelectCustomer(null);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      !selectedCustomerId ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {t.pos.noCustomer}
                </CommandItem>
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={`${customer.name}---${customer.id}`}
                    onSelect={(currentValue) => {
                      const customerId = currentValue.split('---')[1];
                      onSelectCustomer(customerId);
                      setOpen(false);
                    }}
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
);
CustomerCombobox.displayName = 'CustomerCombobox';
