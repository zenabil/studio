
'use client';
import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { useSettings } from '@/contexts/settings-context';
import Loading from '@/app/loading';
import { HandCoins, Info, Landmark, Coins, CircleDollarSign, Scale, Package } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ZakatPage() {
  const { t } = useLanguage();
  const { products, suppliers, customers, isLoading } = useData();
  const { settings } = useSettings();

  const [cash, setCash] = useState(0);
  const [goldValue, setGoldValue] = useState(0);
  const [silverValue, setSilverValue] = useState(0);
  const [debts, setDebts] = useState(0);
  const [goldPricePerGram, setGoldPricePerGram] = useState(65); // Default value as an example

  const inventoryValue = useMemo(() => {
    return products.reduce((total, product) => {
      if (!product || product.stock <= 0) return total;
      return total + ((product.purchasePrice || 0) * product.stock);
    }, 0);
  }, [products]);

  const accountsReceivable = useMemo(() => {
    // Collect debts owed TO the business from customers
    return customers.reduce((total, customer) => {
      if (!customer || customer.balance <= 0) return total;
      return total + customer.balance;
    }, 0);
  }, [customers]);

  const accountsPayable = useMemo(() => {
    // Collect debts owed BY the business to suppliers
    return suppliers.reduce((total, supplier) => {
      if (!supplier || supplier.balance <= 0) return total;
      return total + supplier.balance;
    }, 0);
  }, [suppliers]);


  const nisab = useMemo(() => goldPricePerGram * 85, [goldPricePerGram]);

  const totalZakatableAssets = useMemo(() => {
    return inventoryValue + accountsReceivable + cash + goldValue + silverValue;
  }, [inventoryValue, accountsReceivable, cash, goldValue, silverValue]);
  
  const totalLiabilities = accountsPayable + debts;

  const zakatBase = useMemo(() => {
    return totalZakatableAssets - totalLiabilities;
  }, [totalZakatableAssets, totalLiabilities]);

  const zakatDue = useMemo(() => {
    if (zakatBase >= nisab) {
      return zakatBase * 0.025;
    }
    return 0;
  }, [zakatBase, nisab]);

  if (isLoading) {
    return <Loading />;
  }

  const formatCurrency = (value: number) => `${settings.currency}${value.toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">{t.zakat.title}</h1>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>{t.zakat.assets}</CardTitle>
            <CardDescription>{t.zakat.assetsDescription}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className='flex items-center gap-3'>
                <Package className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="inventoryValue">{t.zakat.inventoryValue}</Label>
              </div>
              <p className="font-semibold">{formatCurrency(inventoryValue)}</p>
            </div>
             <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className='flex items-center gap-3'>
                    <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
                    <Label htmlFor="accountsReceivable">{t.zakat.accountsReceivable}</Label>
                </div>
              <p className="font-semibold">{formatCurrency(accountsReceivable)}</p>
            </div>
            <div className="space-y-2">
              <div className='flex items-center gap-3'>
                <Landmark className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="cash">{t.zakat.cash}</Label>
              </div>
              <Input
                id="cash"
                type="number"
                value={cash}
                onChange={(e) => setCash(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <div className='flex items-center gap-3'>
                <Coins className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="goldValue">{t.zakat.goldValue}</Label>
              </div>
              <Input
                id="goldValue"
                type="number"
                value={goldValue}
                onChange={(e) => setGoldValue(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <div className='flex items-center gap-3'>
                <Coins className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="silverValue">{t.zakat.silverValue}</Label>
              </div>
              <Input
                id="silverValue"
                type="number"
                value={silverValue}
                onChange={(e) => setSilverValue(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </CardContent>
          <CardFooter className="mt-auto bg-muted/30 p-4 rounded-b-lg">
             <div className="flex w-full justify-between items-center text-lg font-bold">
                <span>{t.zakat.totalAssets}</span>
                <span>{formatCurrency(totalZakatableAssets)}</span>
            </div>
          </CardFooter>
        </Card>

        <div>
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>{t.zakat.liabilities}</CardTitle>
                  <CardDescription>{t.zakat.liabilitiesDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className='flex items-center gap-3'>
                        <Scale className="h-5 w-5 text-muted-foreground" />
                        <Label htmlFor="accountsPayable">{t.zakat.accountsPayable}</Label>
                    </div>
                    <p className="font-semibold">{formatCurrency(accountsPayable)}</p>
                  </div>
                  <div className="space-y-2">
                    <div className='flex items-center gap-3'>
                        <Scale className="h-5 w-5 text-muted-foreground" />
                        <Label htmlFor="debts">{t.zakat.otherDebts}</Label>
                    </div>
                    <Input
                      id="debts"
                      type="number"
                      value={debts}
                      onChange={(e) => setDebts(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </CardContent>
                 <CardFooter className="mt-auto bg-muted/30 p-4 rounded-b-lg">
                    <div className="flex w-full justify-between items-center text-lg font-bold">
                        <span>{t.zakat.totalLiabilities}</span>
                        <span className="text-destructive">{formatCurrency(totalLiabilities)}</span>
                    </div>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t.zakat.calculation}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="goldPrice">{t.zakat.goldPricePerGram}</Label>
                    <Input
                      id="goldPrice"
                      type="number"
                      value={goldPricePerGram}
                      onChange={(e) => setGoldPricePerGram(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t.zakat.nisab}</span>
                    <span className="font-semibold">{formatCurrency(nisab)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>{t.zakat.zakatBase}</span>
                    <span>{formatCurrency(zakatBase)}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-4 bg-primary/10 p-4 rounded-b-lg">
                  <div className="flex w-full justify-between items-center text-2xl font-bold text-primary">
                    <span>{t.zakat.zakatDue}</span>
                    <span>{formatCurrency(zakatDue)}</span>
                  </div>
                  {zakatBase < nisab && (
                    <Alert variant="default" className="border-primary/50 bg-background">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        {t.zakat.nisabNotMet}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardFooter>
              </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
