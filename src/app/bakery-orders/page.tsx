'use client';
import { useState, useMemo } from 'react';
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
import { PlusCircle, Trash2, CheckCircle, XCircle, Package, PackageCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { AddBakeryOrderDialog } from '@/components/add-bakery-order-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useToast } from '@/hooks/use-toast';

export interface BakeryOrder {
  id: string;
  name: string;
  quantity: number;
  paid: boolean;
  received: boolean;
}

export default function BakeryOrdersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [orders, setOrders] = useState<BakeryOrder[]>([
    { id: '1', name: 'Boulangerie Al-Amal', quantity: 50, paid: true, received: false },
    { id: '2', name: 'Patisserie Dupont', quantity: 75, paid: false, received: true },
    { id: '3', name: 'Le Fournil de la Gare', quantity: 30, paid: false, received: false },
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<BakeryOrder | null>(null);

  const totalBreadRequired = useMemo(() => {
    return orders
      .filter(order => !order.received)
      .reduce((total, order) => total + order.quantity, 0);
  }, [orders]);

  const handleSaveOrder = (orderData: Omit<BakeryOrder, 'id' | 'paid' | 'received'>) => {
    const newOrder: BakeryOrder = {
      id: `order-${new Date().getTime()}`,
      paid: false,
      received: false,
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
            <CardTitle>{t.bakeryOrders.title}</CardTitle>
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
                {orders.map((order) => (
                  <TableRow key={order.id} className={order.received ? 'bg-muted/50 text-muted-foreground' : ''}>
                    <TableCell className="font-medium">{order.name}</TableCell>
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
                    <TableCell className="flex justify-end gap-2">
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
