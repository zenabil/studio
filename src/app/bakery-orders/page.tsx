
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
import { PlusCircle, Trash2, CheckCircle, XCircle, Package, PackageCheck, Star, Pencil, Wallet } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { AddBakeryOrderDialog } from '@/components/add-bakery-order-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, startOfToday, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { useData } from '@/contexts/data-context';
import type { BakeryOrder } from '@/contexts/data-context';
import Loading from '@/app/loading';
import { DeleteRecurringOrderDialog } from '@/components/delete-recurring-order-dialog';

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
  const { 
    bakeryOrders, 
    addBakeryOrder, 
    updateBakeryOrder, 
    deleteBakeryOrder, 
    isLoading, 
    setAsRecurringTemplate, 
    deleteRecurringPattern,
  } = useData();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<BakeryOrder | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<BakeryOrder | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [isDeleteRecurringDialogOpen, setIsDeleteRecurringDialogOpen] = useState(false);

  useEffect(() => {
    // This effect runs once on mount to clean up old localStorage entries.
    if (typeof window !== 'undefined') {
        const todaysKey = getTodaysDeletedRecurringKey();
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('deletedRecurringOrders_') && key !== todaysKey) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !isInitialized) {
        const initializeDailyOrders = async () => {
            const deletedForToday = getDeletedRecurringForToday();
            const recurringTemplates = bakeryOrders.filter(o => o.isRecurring);
            const addPromises: Promise<void>[] = [];

            recurringTemplates.forEach(template => {
                if (deletedForToday.includes(template.name)) return;

                const instanceExists = bakeryOrders.some(o => o.name === template.name && isToday(new Date(o.date)));
                
                if (!instanceExists) {
                    const { id, ...restOfTemplate } = template;
                    const newOrderData = {
                        ...restOfTemplate,
                        date: new Date().toISOString(),
                        paid: false,
                        received: false,
                        isRecurring: false,
                    };
                    addPromises.push(addBakeryOrder(newOrderData));
                }
            });

            if (addPromises.length > 0) {
                await Promise.all(addPromises);
            }
            
            setIsInitialized(true);
        };

        initializeDailyOrders();
    }
  }, [isLoading, isInitialized, bakeryOrders, addBakeryOrder]);


  const todaysOrders = useMemo(() => {
    return bakeryOrders
      .filter(o => isToday(new Date(o.date)))
      .sort((a, b) => {
        if (a.received !== b.received) return Number(a.received) - Number(b.received);
        if (a.isRecurring !== b.isRecurring) return Number(b.isRecurring) - Number(a.isRecurring);
        return a.name.localeCompare(b.name);
      });
  }, [bakeryOrders]);
  
  const unpaidOldOrders = useMemo(() => {
      const today = startOfToday();
      return bakeryOrders
          .filter(o => !o.paid && isBefore(new Date(o.date), today))
          .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [bakeryOrders]);


  const totalBreadRequired = useMemo(() => {
    return todaysOrders
      .filter(order => !order.received)
      .reduce((total, order) => total + order.quantity, 0);
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

    if (orderExists && !orderId) { // Only check for new orders, allow editing name for existing.
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

  const handleToggleRecurring = async (order: BakeryOrder) => {
    const isCurrentlyRecurring = order.isRecurring;
    await setAsRecurringTemplate(order.id, !isCurrentlyRecurring);
    toast({ title: !isCurrentlyRecurring ? t.bakeryOrders.orderPinned : t.bakeryOrders.orderUnpinned });
  };

  const handleOpenDeleteDialog = (order: BakeryOrder) => {
    setOrderToDelete(order);
    const templateExistsForThisName = bakeryOrders.some(o => o.name === order.name && o.isRecurring);
    // Open the special dialog if the order itself is the template OR if a template for its name exists.
    if (order.isRecurring || templateExistsForThisName) {
      setIsDeleteRecurringDialogOpen(true);
    } else {
      setIsConfirmDeleteDialogOpen(true);
    }
  };

  const handleCloseDeleteDialog = () => {
    setOrderToDelete(null);
    setIsConfirmDeleteDialogOpen(false);
    setIsDeleteRecurringDialogOpen(false);
  };
  
  const handleDeleteInstance = (orderId?: string) => {
    const idToDelete = orderId || orderToDelete?.id;
    if (!idToDelete) return;
    
    const order = bakeryOrders.find(o => o.id === idToDelete);
    // If we're deleting an instance of a recurring order for today, remember it so it's not recreated on reload.
    const isPattern = bakeryOrders.some(o => o.name === order?.name && o.isRecurring);
    if (order && isPattern && isToday(new Date(order.date))) {
      addDeletedRecurringForToday(order.name);
    }
    
    deleteBakeryOrder(idToDelete);
    toast({
        title: t.bakeryOrders.orderDeleted,
    });
    handleCloseDeleteDialog();
  };
  
  const handleDeletePattern = (orderName?: string) => {
    const nameToDelete = orderName || orderToDelete?.name;
    if (!nameToDelete) return;
    // This now just deletes the template, which is safer.
    deleteRecurringPattern(nameToDelete);
    handleCloseDeleteDialog();
  };
  
  const handleMarkAsPaid = (orderId: string) => {
      updateBakeryOrder(orderId, { paid: true });
      toast({ title: t.bakeryOrders.orderUpdated });
  }

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
                  <TableHead>{t.bakeryOrders.name}</TableHead>
                  <TableHead className="text-center">{t.bakeryOrders.quantity}</TableHead>
                  <TableHead className="text-center">{t.bakeryOrders.status}</TableHead>
                  <TableHead className="text-center">{t.bakeryOrders.received}</TableHead>
                  <TableHead className="text-right">{t.bakeryOrders.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todaysOrders.length > 0 ? todaysOrders.map((order) => (
                  <TableRow key={order.id} className={order.received ? 'bg-muted/50 text-muted-foreground' : ''}>
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
                         onClick={() => handleToggleRecurring(order)}
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
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{t.bakeryOrders.noOrdersToday}</TableCell>
                  </TableRow>
                )}
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
        
        {unpaidOldOrders.length > 0 && (
          <Card>
            <CardHeader>
                <CardTitle>{t.bakeryOrders.oldUnpaidOrders}</CardTitle>
                <CardDescription>{t.bakeryOrders.oldUnpaidOrdersDescription}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.bakeryOrders.date}</TableHead>
                            <TableHead>{t.bakeryOrders.name}</TableHead>
                            <TableHead className="text-center">{t.bakeryOrders.quantity}</TableHead>
                            <TableHead className="text-right">{t.bakeryOrders.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {unpaidOldOrders.map((order) => (
                             <TableRow key={order.id} className="bg-destructive/10">
                                <TableCell>{format(new Date(order.date), 'PP')}</TableCell>
                                <TableCell className="font-medium">{order.name}</TableCell>
                                <TableCell className="text-center">{order.quantity}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => handleMarkAsPaid(order.id)}>
                                        <Wallet className="mr-2 h-4 w-4"/>
                                        {t.bakeryOrders.markAsPaid}
                                    </Button>
                                </TableCell>
                             </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
        )}
      </div>
      <AddBakeryOrderDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveOrder}
        orderToEdit={orderToEdit}
      />
      <DeleteRecurringOrderDialog
        isOpen={isDeleteRecurringDialogOpen}
        onClose={handleCloseDeleteDialog}
        order={orderToDelete}
        onDeleteInstance={() => orderToDelete && handleDeleteInstance(orderToDelete.id)}
        onDeletePattern={() => orderToDelete && handleDeletePattern(orderToDelete.name)}
      />
      <ConfirmDialog
        isOpen={isConfirmDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={() => handleDeleteInstance()}
        title={t.bakeryOrders.deleteConfirmationTitle}
        description={t.bakeryOrders.deleteConfirmationMessage}
      />
    </>
  );
}
