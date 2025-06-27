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
import { PlusCircle, Trash2, CheckCircle, XCircle, Package, PackageCheck, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { AddBakeryOrderDialog } from '@/components/add-bakery-order-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

export interface BakeryOrder {
  id: string;
  date: string;
  name: string;
  quantity: number;
  paid: boolean;
  received: boolean;
  isRecurring: boolean;
}

export default function BakeryOrdersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [orders, setOrders] = useState<BakeryOrder[]>([
    { id: '1', date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), name: 'Boulangerie Al-Amal', quantity: 50, paid: true, received: false, isRecurring: true },
    { id: '2', date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), name: 'Patisserie Dupont', quantity: 75, paid: false, received: true, isRecurring: false },
    { id: '3', date: new Date().toISOString(), name: 'Le Fournil de la Gare', quantity: 30, paid: false, received: false, isRecurring: false },
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<BakeryOrder | null>(null);

  useEffect(() => {
    const today = new Date();
    const todayISO = today.toISOString();

    setOrders(currentOrders => {
        // Keep all recurring orders (as templates) and any orders from today
        let relevantOrders = currentOrders.filter(o => o.isRecurring || isToday(new Date(o.date)));

        // Get unique recurring templates by name
        const templates = relevantOrders.filter(o => o.isRecurring);
        const uniqueTemplateNames = [...new Set(templates.map(t => t.name))];

        // Check if instances for today exist and create if not
        uniqueTemplateNames.forEach(name => {
            const instanceExists = relevantOrders.some(o => o.name === name && isToday(new Date(o.date)));
            if (!instanceExists) {
                const template = templates.find(t => t.name === name);
                if (template) {
                    relevantOrders.push({
                        ...template,
                        id: `order-${new Date().getTime()}-${Math.random()}`,
                        date: todayISO,
                        paid: false,
                        received: false,
                    });
                }
            }
        });
        return relevantOrders;
    });
  }, []);

  const todaysOrders = useMemo(() => orders.filter(o => isToday(new Date(o.date))), [orders]);

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
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [todaysOrders]);

  const handleSaveOrder = (orderData: Omit<BakeryOrder, 'id' | 'paid' | 'received' | 'date' | 'isRecurring'>) => {
    const newOrder: BakeryOrder = {
      id: `order-${new Date().getTime()}`,
      date: new Date().toISOString(),
      paid: false,
      received: false,
      isRecurring: false,
      ...orderData,
    };
    setOrders(prevOrders => [newOrder, ...prevOrders]);
    toast({
      title: t.bakeryOrders.orderAdded,
    });
  };

  const handleTogglePaidStatus = (orderId: string) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, paid: !order.paid } : order
      )
    );
  };
  
  const handleToggleReceivedStatus = (orderId: string) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, received: !order.received } : order
      )
    );
  };

  const handleToggleRecurring = (orderId: string) => {
    const orderToToggle = orders.find(o => o.id === orderId);
    if (!orderToToggle) return;
    
    const orderName = orderToToggle.name;
    const isNowRecurring = !orderToToggle.isRecurring;
    
    setOrders(prev => prev.map(o => 
      (o.name === orderName) ? { ...o, isRecurring: isNowRecurring } : o
    ));
    
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
    setOrders(prevOrders => prevOrders.filter(order => order.id !== orderToDelete.id));
    toast({
        title: t.bakeryOrders.orderDeleted,
    });
    handleCloseDeleteDialog();
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-headline">{t.bakeryOrders.title}</h1>
          <Button onClick={() => setIsDialogOpen(true)}>
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
                         onClick={() => handleToggleRecurring(order.id)}
                       >
                         <Star className={cn("h-4 w-4", order.isRecurring ? "text-yellow-500 fill-current" : "text-muted-foreground")} />
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         title={t.bakeryOrders.togglePaidStatus} 
                         onClick={() => handleTogglePaidStatus(order.id)}
                       >
                         {order.paid ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-success" />}
                       </Button>
                       <Button
                        variant="ghost"
                        size="icon"
                        title={t.bakeryOrders.toggleReceivedStatus}
                        onClick={() => handleToggleReceivedStatus(order.id)}
                       >
                        {order.received ? <Package className="h-4 w-4" /> : <PackageCheck className="h-4 w-4 text-success" />}
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
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveOrder}
      />
      <ConfirmDialog
        isOpen={!!orderToDelete}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteOrder}
        title={t.bakeryOrders.deleteConfirmationTitle}
        description={t.bakeryOrders.deleteConfirmationMessage}
      />
    </>
  );
}
