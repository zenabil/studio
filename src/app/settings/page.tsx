
'use client';
import React, { useEffect, useRef } from 'react';
import { useSettings } from '@/contexts/settings-context';
import type { Settings, Theme } from '@/contexts/settings-context';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBackupData } from '@/lib/data-actions';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';


type CompanyInfoFormData = Pick<Settings, 'companyInfo' | 'paymentTermsDays'>;

export default function SettingsPage() {
  const { settings, setSettings, colorPresets } = useSettings();
  const { t } = useLanguage();
  const { user } = useUser();
  const { restoreData } = useData();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { control, handleSubmit, reset } = useForm<CompanyInfoFormData>({
    defaultValues: {
      companyInfo: settings.companyInfo,
      paymentTermsDays: settings.paymentTermsDays,
    },
  });
  
  useEffect(() => {
    reset({
      companyInfo: settings.companyInfo,
      paymentTermsDays: settings.paymentTermsDays,
    });
  }, [settings.companyInfo, settings.paymentTermsDays, reset]);

  const onCompanyInfoSubmit = (data: CompanyInfoFormData) => {
    setSettings(data);
    toast({ title: t.settings.settingsSaved });
  };
  
  const handleBackup = async () => {
    if (!user?.uid) {
        toast({ variant: 'destructive', title: t.errors.title, description: "You must be logged in to perform a backup." });
        return;
    }
    try {
      const backupData = await getBackupData(user.uid);
      const dataToBackup = {
        ...backupData,
        settings: settings,
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

        const requiredCollections = ['products', 'customers', 'sales', 'bakeryOrders', 'suppliers', 'supplierInvoices', 'expenses'];
        const hasAllData = requiredCollections.every(collection => data[collection] && Array.isArray(data[collection]));

        if (hasAllData) {
          await restoreData(data);
          
          if (data.settings) {
            setSettings(data.settings);
            reset({
              companyInfo: data.settings.companyInfo,
              paymentTermsDays: data.settings.paymentTermsDays,
            });
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline">{t.settings.title}</h1>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">{t.settings.companyInfo}</TabsTrigger>
          <TabsTrigger value="appearance">{t.settings.appearance}</TabsTrigger>
          <TabsTrigger value="data">{t.settings.dataManagement}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-4">
          <form onSubmit={handleSubmit(onCompanyInfoSubmit)}>
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
                  <Label htmlFor="logoUrl">{t.settings.logoUrl}</Label>
                  <Controller name="companyInfo.logoUrl" control={control} render={({ field }) => <Input id="logoUrl" placeholder="https://example.com/logo.png" {...field} value={field.value || ''} />} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="additionalInfo">{t.settings.additionalInfo}</Label>
                  <Controller name="companyInfo.additionalInfo" control={control} render={({ field }) => <Textarea id="additionalInfo" {...field} value={field.value || ''} />} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="paymentTerms">{t.settings.paymentTerms}</Label>
                  <Controller name="paymentTermsDays" control={control} render={({ field }) => <Input id="paymentTerms" type="number" min="0" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} />} />
                  <p className="text-sm text-muted-foreground">{t.settings.paymentTermsDescription}</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit">{t.settings.save}</Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>
        
        <TabsContent value="appearance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.appearance}</CardTitle>
              <CardDescription>{t.settings.changesSavedAutomatically}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>{t.settings.currency}</Label>
                    <Input
                      className="w-24"
                      value={settings.currency}
                      onChange={(e) => setSettings({ currency: e.target.value })}
                    />
                </div>
                 <div className="space-y-2">
                  <Label>{t.settings.theme}</Label>
                  <RadioGroup 
                    onValueChange={(value: Theme) => setSettings({ theme: value })} 
                    value={settings.theme} 
                    className="flex gap-4"
                  >
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
                </div>
                <div className="space-y-2">
                    <Label>{t.settings.colors}</Label>
                     <div className="flex flex-wrap gap-3">
                      {colorPresets.map((preset) => (
                          <button
                          type="button"
                          key={preset.name}
                          onClick={() => setSettings({ colorPreset: preset.name })}
                          className={cn(
                              'flex h-12 w-20 items-center justify-center rounded-lg border-2',
                              settings.colorPreset === preset.name ? 'border-primary' : 'border-transparent'
                          )}
                          style={{ backgroundColor: `hsl(${preset.primary.dark})`}}
                          >
                          <div className="flex gap-2">
                              <span className="h-6 w-6 rounded-full" style={{ backgroundColor: `hsl(${preset.accent.dark})` }} />
                          </div>
                          </button>
                      ))}
                      </div>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
