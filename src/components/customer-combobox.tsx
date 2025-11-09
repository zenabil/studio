
'use client';

import * as React from 'react';
import { Check, PlusCircle, User, X } from 'lucide-react';
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
import { useSettings } from '@/contexts/settings-context';
import { Badge } from './ui/badge';

interface CustomerComboboxProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelectCustomer: (customerId: string | null) => void;
  onAddNewCustomer: () => void;
}

export const CustomerCombobox = React.forwardRef<HTMLButtonElement, CustomerComboboxProps>(
  ({ customers, selectedCustomerId, onSelectCustomer, onAddNewCustomer }, ref) => {
    const { t } = useLanguage();
    const { settings } = useSettings();
    const [open, setOpen] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState('');

    const selectedCustomer =
      customers.find((c) => c.id === selectedCustomerId) || null;

    const handleSelect = (customerId: string | null) => {
      onSelectCustomer(customerId);
      setOpen(false);
      setSearchValue('');
    };

    const ComboboxTrigger = () => (
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-start"
          onClick={() => setOpen((prev) => !prev)}
        >
          <User className="mr-2 h-4 w-4 shrink-0 opacity-50 rtl:ml-2 rtl:mr-0" />
          {t.pos.customer}
          <kbd className="pointer-events-none ml-auto rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">F4</kbd>
        </Button>
      </PopoverTrigger>
    );

    const SelectedCustomerDisplay = () => (
       <div className="flex items-center gap-2 rounded-md border border-input p-2">
            <div className="flex-grow">
                <p className="text-sm font-medium">{selectedCustomer?.name}</p>
                <p className="text-xs text-muted-foreground">
                    {t.customers.balance}: <span className={cn('font-semibold', selectedCustomer && selectedCustomer.balance > 0 ? "text-destructive" : "text-success")}>{settings.currency}{selectedCustomer?.balance.toFixed(2)}</span>
                </p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onSelectCustomer(null)}>
                <X className="h-4 w-4" />
            </Button>
       </div>
    );

    return (
      <Popover open={open} onOpenChange={setOpen}>
        {selectedCustomer ? <SelectedCustomerDisplay /> : <ComboboxTrigger />}
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput 
                placeholder={t.customers.searchCustomers} 
                value={searchValue}
                onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-4 text-center text-sm">{t.customers.noCustomerFound}</div>
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onAddNewCustomer();
                    setOpen(false);
                  }}
                  className="text-primary"
                >
                  <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                  {t.customers.addCustomer}
                </CommandItem>
                <CommandItem
                  value="no-customer"
                  onSelect={() => handleSelect(null)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0',
                      !selectedCustomerId ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {t.pos.noCustomer}
                </CommandItem>
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.name}
                    onSelect={() => handleSelect(customer.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0',
                        selectedCustomerId === customer.id
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <span>{customer.name}</span>
                     {customer.balance > 0 && <Badge variant="destructive" className="ml-auto">{settings.currency}{customer.balance.toFixed(2)}</Badge>}
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

    