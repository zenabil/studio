'use client';
import React, { useEffect, useRef } from 'react';
import { useSettings } from '@/contexts/settings-context';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBackupData } from '@/lib/data-actions';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function SettingsPage() {
  const { settings, setSettings, colorPresets } = useSettings();
  const { t } = useLanguage();
  const { restoreData } = useData();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { control, handleSubmit, reset, watch } = useForm({
    defaultValues: settings,
  });
  
  const watchedSettings = watch();

  useEffect(() => {
    reset(settings);
  }, [settings, reset]);

  const onSubmit = (data: any) => {
    setSettings(data);
    toast({ title: t.settings.settingsSaved });
  };
  
  const handleBackup = async () => {
    try {
      const { products, customers, salesHistory } = await getBackupData();
      const dataToBackup = {
        products,
        customers,
        salesHistory,
        settings: watchedSettings,
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(dataToBackup, null, 2)
      )}`;
      const link = document.createElement('a');
      link.href = jsonString;
      link.download = `mercurio-pos-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      toast({ title: t.settings.backupSuccess });
    } catch (error) {
      console.error("Backup failed:", error);
      toast({ variant: 'destructive', title: t.settings.restoreErrorTitle, description: "Failed to fetch data for backup." });
    }
  };
  
  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('File could not be read');
        }
        const data = JSON.parse(text);

        if (data.products && data.customers && data.salesHistory) {
          await restoreData({
            products: data.products,
            customers: data.customers,
            salesHistory: data.salesHistory,
          });
          if (data.settings) {
            setSettings(data.settings);
            reset(data.settings);
          }
          toast({ title: t.settings.restoreSuccess });
        } else {
          throw new Error(t.settings.restoreErrorInvalidFile);
        }
      } catch (error) {
        console.error('Failed to restore data:', error);
        toast({
          variant: 'destructive',
          title: t.settings.restoreErrorTitle,
          description: error instanceof Error ? error.message : t.settings.restoreErrorGeneric,
        });
      } finally {
        if (event.target) {
          event.target.value = '';
        }
      }
    };
    reader.onerror = () => {
      toast({
        variant: 'destructive',
        title: t.settings.restoreErrorTitle,
        description: t.settings.restoreErrorGeneric,
      });
    };
    reader.readAsText(file);
  };


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline">{t.settings.title}</h1>
        <Button type="submit">{t.settings.save}</Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">{t.settings.companyInfo}</TabsTrigger>
          <TabsTrigger value="appearance">{t.settings.appearance}</TabsTrigger>
          <TabsTrigger value="data">{t.settings.dataManagement}</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.companyInfo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">{t.settings.companyName}</Label>
                    <Controller name="companyInfo.name" control={control} render={({ field }) => <Input id="companyName" {...field} />} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">{t.settings.companyPhone}</Label>
                    <Controller name="companyInfo.phone" control={control} render={({ field }) => <Input id="companyPhone" {...field} />} />
                  </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">{t.settings.companyAddress}</Label>
                <Controller name="companyInfo.address" control={control} render={({ field }) => <Input id="companyAddress" {...field} />} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="companyEmail">{t.settings.companyEmail}</Label>
                <Controller name="companyInfo.email" control={control} render={({ field }) => <Input id="companyEmail" type="email" {...field} />} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="paymentTerms">{t.settings.paymentTerms}</Label>
                <Controller name="paymentTermsDays" control={control} render={({ field }) => <Input id="paymentTerms" type="number" min="0" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} />} />
                <p className="text-sm text-muted-foreground">{t.settings.paymentTermsDescription}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="appearance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.appearance}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>{t.settings.currency}</Label>
                    <Controller name="currency" control={control} render={({ field }) => <Input className="w-24" {...field} />} />
                </div>
                 <div className="space-y-2">
                  <Label>{t.settings.theme}</Label>
                  <Controller
                    name="theme"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                        <Label className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="light" /> Light
                        </Label>
                        <Label className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="dark" /> Dark
                        </Label>
                         <Label className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="system" /> System
                        </Label>
                      </RadioGroup>
                    )}
                  />
                </div>
                <div className="space-y-2">
                    <Label>{t.settings.colors}</Label>
                     <Controller
                        name="colorPreset"
                        control={control}
                        render={({ field }) => (
                           <div className="flex flex-wrap gap-3">
                            {colorPresets.map((preset) => (
                                <button
                                type="button"
                                key={preset.name}
                                onClick={() => field.onChange(preset.name)}
                                className={cn(
                                    'flex h-12 w-20 items-center justify-center rounded-lg border-2',
                                    field.value === preset.name ? 'border-primary' : 'border-transparent'
                                )}
                                style={{ backgroundColor: `hsl(${preset.primary.dark})`}}
                                >
                                <div className="flex gap-2">
                                    <span className="h-6 w-6 rounded-full" style={{ backgroundColor: `hsl(${preset.accent.dark})` }} />
                                </div>
                                </button>
                            ))}
                            </div>
                        )}
                        />
                </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="data" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.dataManagement}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row">
                <Button type="button" onClick={handleBackup}>{t.settings.backupData}</Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                />
                <Button type="button" variant="outline" onClick={handleRestoreClick}>
                  {t.settings.restoreData}
                </Button>
            </CardContent>
          </Card>
           <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t.settings.activation}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-end">
                <div className="space-y-2 flex-grow">
                    <Label htmlFor="licenseKey">{t.settings.licenseKey}</Label>
                    <Input id="licenseKey" placeholder="XXXX-XXXX-XXXX-XXXX" />
                </div>
                <Button type="button">{t.settings.activate}</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  );
}
