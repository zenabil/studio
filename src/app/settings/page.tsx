'use client';
import React from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
  const { settings, setSettings, colorPresets } = useSettings();
  const { t } = useLanguage();
  const { products, customers, salesHistory } = useData();
  const { toast } = useToast();

  const { control, handleSubmit, setValue } = useForm({
    values: settings,
  });

  const onSubmit = (data: any) => {
    setSettings(data);
    toast({ title: t.settings.settingsSaved });
  };
  
  const handleBackup = () => {
    const dataToBackup = {
      products,
      customers,
      salesHistory,
      settings,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(dataToBackup, null, 2)
    )}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `mercurio-pos-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    toast({ title: t.settings.backupSuccess });
  };
  
  const handleRestore = () => {
      toast({ title: "Restore functionality is not yet implemented." });
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
                                    'flex h-12 w-20 items-center justify-center rounded-md border-2',
                                    field.value === preset.name ? 'border-primary' : 'border-transparent'
                                )}
                                >
                                <div className="flex gap-2">
                                    <span className="h-6 w-6 rounded-full" style={{ background: `linear-gradient(to right, hsl(${preset.primary.light}) 50%, hsl(${preset.accent.light}) 50%)` }} />
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
            <CardContent className="flex gap-4">
                <Button type="button" onClick={handleBackup}>{t.settings.backupData}</Button>
                <Button type="button" variant="outline" onClick={handleRestore} disabled>{t.settings.restoreData}</Button>
            </CardContent>
          </Card>
           <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t.settings.activation}</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4 items-end">
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
