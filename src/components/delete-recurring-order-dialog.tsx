'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useLanguage } from '@/contexts/language-context';
import type { BakeryOrder } from '@/lib/data';

interface DeleteRecurringOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: BakeryOrder | null;
  onDeleteInstance: (orderId: string) => void;
  onDeletePattern: (orderName: string) => void;
}

export function DeleteRecurringOrderDialog({
  isOpen,
  onClose,
  order,
  onDeleteInstance,
  onDeletePattern,
}: DeleteRecurringOrderDialogProps) {
  const { t } = useLanguage();

  if (!order) {
    return null;
  }

  const handleDeleteInstance = () => {
    onDeleteInstance(order.id);
    onClose();
  };

  const handleDeletePattern = () => {
    onDeletePattern(order.name);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.bakeryOrders.deleteRecurringTitle}</DialogTitle>
          <DialogDescription>
            "{order.name}" &mdash; {t.bakeryOrders.deleteRecurringDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 py-4">
          <Button
            variant="outline"
            onClick={handleDeleteInstance}
          >
            {t.bakeryOrders.deleteInstanceOnly}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeletePattern}
          >
            {t.bakeryOrders.deletePattern}
          </Button>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              {t.customers.cancel}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
