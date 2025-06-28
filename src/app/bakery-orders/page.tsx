
'use client';
import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, CheckCircle, XCircle, Package, PackageCheck, Star, Pencil } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { AddBakeryOrderDialog } from '@/components/add-bakery-order-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { useData } from '@/contexts/data-context';
import type { BakeryOrder } from '@/lib/data';
import Loading from '@/app/loading';

// Helper functions for localStorage to remember deleted recurring orders for the day
const getTodaysDeletedRecurringKey = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  return `deletedRecurringOrders_${today}`;
};

const getDeletedRecurringForToday = (): string[] => {
  if (typeof window === 'undefined') return [];
  const key = getTodaysDeletedRecurringKey();
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

const addDeletedRecurringForToday = (orderName: string) => {
  if (typeof window === 'undefined') return;
  const key = getTodaysDeletedRecurringKey();
  const deletedNames = getDeletedRecurringForToday();
  if (!deletedNames.includes(orderName)) {
    deletedNames.push(orderName);
    localStorage.setItem(key, JSON.stringify(deletedNames));
  }
};


export default function BakeryOrdersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { bakeryOrders, addBakeryOrder, updateBakeryOrder, deleteBakeryOrder, isLoading, setRecurringStatusForOrderName } = useData();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<BakeryOrder | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<BakeryOrder | null>(null);
  const [orderToUnpin, setOrderToUnpin] = useState<BakeryOrder | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // This effect runs once after data is loaded to create any missing daily recurring orders.
    if (!isLoading && !isInitialized) {
        const initializeRecurringOrders = async () => {
            const today = new Date();
            const deletedForToday = getDeletedRecurringForToday();
            
            // Find recurring templates (any order marked as recurring)
            const recurringTemplates = bakeryOrders.filter(o => o.isRecurring);
            const uniqueTemplateNames = [...new Set(recurringTemplates.map(t => t.name))];
            
            const addPromises: Promise<void>[] = [];

            uniqueTemplateNames.forEach(name => {
                // Skip creation if it was deleted today
                if (deletedForToday.includes(name)) {
                return;
                }

                // Check if an order with this name already exists for today
                const instanceExists = bakeryOrders.some(o => o.name === name && isToday(new Date(o.date)));
                
                if (!instanceExists) {
                // Find the template to copy from. The oldest one is the "master" template.
                const template = recurringTemplates
                    .filter(t => t.name === name)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
                
                if (template) {
                    const { id, ...restOfTemplate } = template;
                    const newOrderData = {
                    ...restOfTemplate,
                    date: today.toISOString(),
                    paid: false,
                    received: false,
                    };
                    addPromises.push(addBakeryOrder(newOrderData));
                }
                }
            });

            if (addPromises.length > 0) {
                await Promise.all(addPromises);
            }
            
            // Once we've checked for and added orders, we mark this as initialized to prevent re-running.
            setIsInitialized(true);
        }

        initializeRecurringOrders();
    }
  }, [isLoading, isInitialized, bakeryOrders, addBakeryOrder]);


  const todaysOrders = useMemo(() => bakeryOrders.filter(o => isToday(new Date(o.date))), [bakeryOrders]);

  const totalBreadRequired = useMemo(() => {
    return todaysOrders
      .filter(order => !order.received)
      .reduce((total, order) => total + order.quantity, 0);
  }, [todaysOrders]);

  const sortedOrders = useMemo(() => {
    return [...todaysOrders].sort((a, b) => {
        if (a.received !== b.received) {
            return Number(a.received) - Number(b.received);
        }
        if (a.isRecurring !== b.isRecurring) {
            return Number(b.isRecurring) - Number(a.isRecurring);
        }
        return a.name.localeCompare(b.name);
    });
  }, [todaysOrders]);

  const handleOpenAddDialog = () => {
    setOrderToEdit(null);
    setIsDialogOpen(true);
  };
  
  const handleOpenEditDialog = (order: BakeryOrder) => {
    setOrderToEdit(order);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setOrderToEdit(null);
  }

  const handleSaveOrder = async (orderData: { name: string; quantity: number }, orderId?: string) => {
    const orderNameLower = orderData.name.toLowerCase();
    const orderExists = todaysOrders.some(
        order => order.name.toLowerCase() === orderNameLower && order.id !== orderId
    );

    if (orderExists) {
        toast({
            variant: 'destructive',
            title: t.errors.title,
            description: t.bakeryOrders.orderExists,
        });
        throw new Error(t.bakeryOrders.orderExists);
    }
    
    if (orderId) {
        await updateBakeryOrder(orderId, orderData);
        toast({ title: t.bakeryOrders.orderUpdated });
    } else {
        const newOrderData = {
          ...orderData,
          date: new Date().toISOString(),
          paid: false,
          received: false,
          isRecurring: false,
        };
        await addBakeryOrder(newOrderData);
        toast({ title: t.bakeryOrders.orderAdded });
    }
  };

  const handleToggleStatus = (orderId: string, field: 'paid' | 'received') => {
      const order = bakeryOrders.find(o => o.id === orderId);
      if (order) {
          updateBakeryOrder(orderId, { [field]: !order[field] });
          toast({ title: t.bakeryOrders.orderUpdated });
      }
  };

  const handleToggleRecurring = async (orderId: string) => {
    const orderToToggle = bakeryOrders.find(o => o.id === orderId);
    if (!orderToToggle) return;
    
    const orderName = orderToToggle.name;
    const isNowRecurring = !orderToToggle.isRecurring;
    
    // If we are pinning a new recurring order
    if (isNowRecurring) {
        // Check if an instance for today already exists using the latest bakeryOrders state
        const instanceExists = bakeryOrders.some(o => o.name === orderName && isToday(new Date(o.date)));
        
        // If not, create one for today based on the one being pinned
        if (!instanceExists) {
            const { id, ...restOfTemplate } = orderToToggle;
            const newOrderData = {
              ...restOfTemplate,
              date: new Date().toISOString(),
              paid: false, 
              received: false,
              isRecurring: true, // Explicitly set new instance as recurring
            };
            await addBakeryOrder(newOrderData);
        }
    }

    await setRecurringStatusForOrderName(orderName, isNowRecurring);
    
    toast({ title: isNowRecurring ? t.bakeryOrders.orderPinned : t.bakeryOrders.orderUnpinned });
  };

  const handleOpenDeleteDialog = (order: BakeryOrder) => {
    setOrderToDelete(order);
  };

  const handleCloseDeleteDialog = () => {
    setOrderToDelete(null);
  };

  const handleDeleteOrder = () => {
    if (!orderToDelete) return;

    // If deleting a recurring order for today, remember it so it's not recreated on reload.
    if (orderToDelete.isRecurring && isToday(new Date(orderToDelete.date))) {
      addDeletedRecurringForToday(orderToDelete.name);
    }
    
    deleteBakeryOrder(orderToDelete.id);
    toast({
        title: t.bakeryOrders.orderDeleted,
    });
    handleCloseDeleteDialog();
  };
  
  const handleConfirmUnpin = () => {
    if (!orderToUnpin) return;
    handleToggleRecurring(orderToUnpin.id);
    setOrderToUnpin(null);
  };

  if (isLoading) {
      return <Loading />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-headline">{t.bakeryOrders.title}</h1>
          <Button onClick={handleOpenAddDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t.bakeryOrders.addOrder}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.bakeryOrders.todaysOrders}</CardTitle>
            <CardDescription>{t.bakeryOrders.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.bakeryOrders.date}</TableHead>
                  <TableHead>{t.bakeryOrders.name}</TableHead>
                  <TableHead className="text-center">{t.bakeryOrders.quantity}</TableHead>
                  <TableHead className="text-center">{t.bakeryOrders.status}</TableHead>
                  <TableHead className="text-center">{t.bakeryOrders.received}</TableHead>
                  <TableHead className="text-right">{t.bakeryOrders.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrders.map((order) => (
                  <TableRow key={order.id} className={order.received ? 'bg-muted/50 text-muted-foreground' : ''}>
                    <TableCell>{format(new Date(order.date), 'PP')}</TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                       {order.isRecurring && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                       {order.name}
                    </TableCell>
                    <TableCell className="text-center">{order.quantity}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={order.paid ? 'success' : 'destructive'}>
                        {order.paid ? t.bakeryOrders.paid : t.bakeryOrders.unpaid}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                       <Badge variant={order.received ? 'success' : 'outline'}>
                        {order.received ? t.bakeryOrders.received : t.bakeryOrders.notReceived}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-1">
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         title={order.isRecurring ? t.bakeryOrders.unpin : t.bakeryOrders.pin}
                         onClick={() => {
                            if (order.isRecurring) {
                                setOrderToUnpin(order);
                            } else {
                                handleToggleRecurring(order.id);
                            }
                         }}
                       >
                         <Star className={cn("h-4 w-4", order.isRecurring ? "text-yellow-500 fill-current" : "text-muted-foreground")} />
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         title={t.bakeryOrders.togglePaidStatus} 
                         onClick={() => handleToggleStatus(order.id, 'paid')}
                       >
                         {order.paid ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-success" />}
                       </Button>
                       <Button
                        variant="ghost"
                        size="icon"
                        title={t.bakeryOrders.toggleReceivedStatus}
                        onClick={() => handleToggleStatus(order.id, 'received')}
                       >
                        {order.received ? <Package className="h-4 w-4" /> : <PackageCheck className="h-4 w-4 text-success" />}
                       </Button>
                       <Button variant="ghost" size="icon" title={t.bakeryOrders.editOrder} onClick={() => handleOpenEditDialog(order)}>
                        <Pencil className="h-4 w-4" />
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         title={t.products.delete} 
                         onClick={() => handleOpenDeleteDialog(order)}
                       >
                         <Trash2 className="h-4 w-4 text-destructive" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-end bg-muted/50 py-4 px-6 rounded-b-lg">
             <div className="text-lg font-bold">
              <span>{t.bakeryOrders.totalBread}: </span>
              <span>{totalBreadRequired}</span>
            </div>
          </CardFooter>
        </Card>
      </div>
      <AddBakeryOrderDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveOrder}
        orderToEdit={orderToEdit}
      />
      <ConfirmDialog
        isOpen={!!orderToUnpin}
        onClose={() => setOrderToUnpin(null)}
        onConfirm={handleConfirmUnpin}
        title={t.bakeryOrders.unpinConfirmationTitle}
        description={t.bakeryOrders.unpinConfirmationMessage}
        confirmText={t.bakeryOrders.unpinButton}
        confirmVariant="default"
      />
      <ConfirmDialog
        isOpen={!!orderToDelete}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteOrder}
        title={t.bakeryOrders.deleteConfirmationTitle}
        description={
            orderToDelete?.isRecurring
            ? t.bakeryOrders.deleteRecurringConfirmationMessage
            : t.bakeryOrders.deleteConfirmationMessage
        }
      />
    </>
  );
}

    
