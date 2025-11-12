
'use client';
import { useState, useMemo } from 'react';
import { useUser, useAuth } from '@/firebase';
import { useData } from '@/contexts/data-context';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { LoaderCircle, ShieldCheck, Clock, AlertTriangle, Mail, Phone } from 'lucide-react';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { differenceInDays, format } from 'date-fns';

export default function ProfilePage() {
  const { t } = useLanguage();
  const { user, userProfile, userProfiles } = useUser();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const auth = useAuth();

  const passwordFormSchema = z.object({
    currentPassword: z.string().min(1, { message: t.settings.currentPasswordRequired }),
    newPassword: z.string().min(6, { message: t.auth.weakPassword }),
    confirmPassword: z.string()
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: t.auth.passwordsDoNotMatch,
    path: ['confirmPassword']
  });

  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    mode: 'onChange'
  });

  const adminContact = useMemo(() => {
    if (!userProfiles || userProfiles.length === 0) {
      return null;
    }
    const adminProfile = userProfiles.find(p => p.isAdmin);
    if (!adminProfile) return null;

    return {
      name: adminProfile.email.split('@')[0], 
      email: adminProfile.email,
      phone: (adminProfile as any)?.phone || null,
    };
  }, [userProfiles]);


  const onSubmit = async (data: z.infer<typeof passwordFormSchema>) => {
    if (!user) return;
    setIsSaving(true);
    
    try {
        const credential = EmailAuthProvider.credential(user.email!, data.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, data.newPassword);

        toast({ title: t.settings.passwordChangedSuccess });
        form.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
        console.error("Password change failed:", error);
        if (error.code === 'auth/wrong-password') {
            form.setError('currentPassword', { type: 'manual', message: t.settings.currentPasswordIncorrect });
        } else {
            toast({
                variant: 'destructive',
                title: t.errors.title,
                description: t.errors.unknownError,
            });
        }
    } finally {
        setIsSaving(false);
    }
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || '?';

  const SubscriptionStatus = () => {
    if (!userProfile?.subscriptionEndsAt) {
      return (
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t.profile.noSubscription}</p>
        </div>
      );
    }

    const endDate = new Date(userProfile.subscriptionEndsAt);
    const today = new Date();
    const daysRemaining = differenceInDays(endDate, today);

    if (daysRemaining < 0) {
      return (
        <Badge variant="destructive" className="gap-2">
          <AlertTriangle className="h-4 w-4" />
          {t.profile.expired}
        </Badge>
      );
    }

    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{t.profile.subscriptionExpiresOn.replace('{date}', format(endDate, 'PP'))}</p>
        <p className="text-sm text-muted-foreground">{t.profile.daysRemaining.replace('{days}', String(daysRemaining))}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold font-headline">{t.nav.profile}</h1>
        <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
                <Card className="flex flex-col h-full">
                    <CardHeader className="items-center text-center">
                        <Avatar className="h-24 w-24 mb-4">
                            <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || user?.email || ''} />
                            <AvatarFallback>{userInitial}</AvatarFallback>
                        </Avatar>
                        <CardTitle className="flex items-center gap-2">
                            {user?.displayName || user?.email}
                            {userProfile?.status === 'approved' && <ShieldCheck className="h-6 w-6 text-blue-500" />}
                        </CardTitle>
                        <CardDescription>{user?.email}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4 flex-grow">
                        <div className="flex justify-center">
                             {userProfile?.status === 'approved' && (
                                <Badge variant="success">
                                    {t.users.approved}
                                </Badge>
                             )}
                              {userProfile?.status === 'pending' && (
                                <Badge variant="destructive">
                                    {t.users.pending}
                                </Badge>
                             )}
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold">{t.profile.subscriptionStatus}</p>
                            <SubscriptionStatus />
                        </div>
                    </CardContent>
                     {adminContact && (adminContact.email || adminContact.phone) && (
                        <CardFooter className="flex-col items-start gap-4 pt-4 border-t mt-auto">
                           <h3 className="text-sm font-semibold text-foreground w-full text-center">{t.auth.adminContact}</h3>
                            {adminContact.email && (
                                <a href={`mailto:${adminContact.email}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors">
                                    <Mail className="h-4 w-4" />
                                    <span>{adminContact.email}</span>
                                </a>
                            )}
                            {adminContact.phone && (
                                <a href={`tel:${adminContact.phone}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors">
                                    <Phone className="h-4 w-4" />
                                    <span>{adminContact.phone}</span>
                                </a>
                            )}
                        </CardFooter>
                    )}
                </Card>
            </div>
            <div className="md:col-span-2">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <Card>
                            <CardHeader>
                                <CardTitle>{t.settings.changePassword}</CardTitle>
                                <CardDescription>{t.auth.changePasswordDescription}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="currentPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t.settings.currentPassword}</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} disabled={isSaving} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="newPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t.settings.newPassword}</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} disabled={isSaving} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t.auth.confirmPassword}</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} disabled={isSaving} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={isSaving || !form.formState.isValid}>
                                    {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                    {isSaving ? t.settings.saving : t.settings.changePassword}
                                </Button>
                            </CardFooter>
                        </Card>
                    </form>
                </Form>
            </div>
        </div>
    </div>
  );
}
