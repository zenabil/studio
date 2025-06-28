
'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useSettings, type Settings, type Theme } from '@/contexts/settings-context';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBackupData } from '@/lib/data-actions';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { differenceInCalendarDays } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';

type CompanyInfoFormData = Pick<Settings, 'companyInfo' | 'paymentTermsDays'>;

export default function SettingsPage() {
  const { settings, setSettings, colorPresets, activateLicense } = useSettings();
  const { t } = useLanguage();
  const { restoreData } = useData();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [isActivating, setIsActivating] = useState(false);

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
    try {
      const backupData = await getBackupData();
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

        if (data.products && data.customers && data.salesHistory) {
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
  
  const handleActivate = async () => {
    if (!licenseKeyInput) return;
    setIsActivating(true);
    await activateLicense(licenseKeyInput);
    setIsActivating(false);
  };

  const getActivationStatus = () => {
    if (settings.isActivated) {
      return (
        <div className="flex items-center gap-2 text-green-600">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-medium">{t.settings.activated}</span>
        </div>
      )
    }
    const firstLaunch = settings.firstLaunchDate ? new Date(settings.firstLaunchDate) : new Date();
    const daysSinceFirstLaunch = differenceInCalendarDays(new Date(), firstLaunch);
    const trialDaysLeft = Math.max(0, 7 - daysSinceFirstLaunch);
    return (
        <p className="text-sm text-muted-foreground">
            {t.settings.trialEnds.replace('{days}', trialDaysLeft)}
        </p>
    );
  }


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
           <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t.settings.activation}</CardTitle>
              <CardDescription>{getActivationStatus()}</CardDescription>
            </CardHeader>
            {!settings.isActivated && (
              <CardContent className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-end">
                  <div className="space-y-2 flex-grow">
                      <Label htmlFor="licenseKey">{t.settings.licenseKey}</Label>
                      <Input 
                        id="licenseKey" 
                        placeholder={t.activation.placeholder}
                        value={licenseKeyInput}
                        onChange={(e) => setLicenseKeyInput(e.target.value)}
                        disabled={isActivating}
                      />
                  </div>
                  <Button type="button" onClick={handleActivate} disabled={isActivating || !licenseKeyInput}>
                    {isActivating ? t.activation.activating : t.settings.activate}
                  </Button>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
