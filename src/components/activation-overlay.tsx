'use client';

import { useState } from 'react';
import { useSettings } from '@/contexts/settings-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/language-context';
import { ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

export function ActivationOverlay() {
  const { t } = useLanguage();
  const { activateLicense } = useSettings();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  const handleActivate = async () => {
    setError('');
    setIsActivating(true);
    const success = await activateLicense(key);
    if (!success) {
      setError(t.activation.invalidKey);
    }
    // On success, the provider will unmount this component anyway
    setIsActivating(false);
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-muted/40">
      <Card className="w-[400px] shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
            <ShieldAlert className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="mt-4 text-2xl">{t.activation.title}</CardTitle>
          <CardDescription>{t.activation.trialExpired} {t.activation.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           {error && (
             <Alert variant="destructive">
               <AlertDescription>{error}</AlertDescription>
             </Alert>
           )}
          <div className="space-y-2">
            <label htmlFor="licenseKey" className="text-sm font-medium">{t.settings.licenseKey}</label>
            <Input 
              id="licenseKey" 
              placeholder={t.activation.placeholder}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={isActivating}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleActivate();
              }}
            />
          </div>
          <Button onClick={handleActivate} disabled={isActivating || !key} className="w-full">
            {isActivating ? t.activation.activating : t.activation.button}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
