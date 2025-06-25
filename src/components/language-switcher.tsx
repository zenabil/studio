'use client';

import { useLanguage, Language } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-5 w-5" />
      <div className="flex items-center rounded-md bg-secondary p-1">
        <Button
          variant={language === 'fr' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleLanguageChange('fr')}
          className={`px-3 py-1 text-sm ${language === 'fr' ? 'bg-primary text-primary-foreground' : ''}`}
        >
          FR
        </Button>
        <Button
          variant={language === 'ar' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleLanguageChange('ar')}
          className={`px-3 py-1 text-sm ${language === 'ar' ? 'bg-primary text-primary-foreground' : ''}`}
        >
          AR
        </Button>
      </div>
    </div>
  );
}
