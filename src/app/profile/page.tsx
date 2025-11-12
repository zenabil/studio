

'use client';
import { useState, useMemo, useEffect } from 'react';
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
import { LoaderCircle, ShieldCheck, Clock, AlertTriangle, Mail, Phone, Save } from 'lucide-react';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { differenceInDays, format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

export default function ProfilePage() {
  const { t } = useLanguage();
  const { user, userProfile, userProfiles } = useUser();
  const { updateUserProfile, isLoading: isDataLoading } = useData();
  const { toast } = useToast();
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const auth = useAuth();
  
  const profileFormSchema = z.object({
    name: z.string().min(2, { message: t.customers.nameMinLength }),
    phone: z.string().optional(),
  });

  const passwordFormSchema = z.object({
    currentPassword: z.string().min(1, { message: t.settings.currentPasswordRequired }),
    newPassword: z.string().min(6, { message: t.auth.weakPassword }),
    confirmPassword: z.string()
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: t.auth.passwordsDoNotMatch,
    path: ['confirmPassword']
  });

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    mode: 'onChange'
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    mode: 'onChange'
  });
  
  useEffect(() => {
    if (userProfile) {
      profileForm.reset({
        name: userProfile.name || '',
        phone: userProfile.phone || '',
      });
    }
  }, [userProfile, profileForm]);

  const adminContact = useMemo(() => {
    if (!userProfiles || userProfiles.length === 0) {
      return null;
    }
    const adminProfile = userProfiles.find(p => p.isAdmin);
    if (!adminProfile) return null;

    return {
      name: adminProfile.name || adminProfile.email.split('@')[0], 
      email: adminProfile.email,
      phone: adminProfile.phone || null,
    };
  }, [userProfiles]);


  const onPasswordSubmit = async (data: z.infer<typeof passwordFormSchema>) => {
    if (!user) return;
    setIsSavingPassword(true);
    
    try {
        const credential = EmailAuthProvider.credential(user.email!, data.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, data.newPassword);

        toast({ title: t.settings.passwordChangedSuccess });
        passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
        console.error("Password change failed:", error);
        if (error.code === 'auth/wrong-password') {
            passwordForm.setError('currentPassword', { type: 'manual', message: t.settings.currentPasswordIncorrect });
        } else {
            toast({
                variant: 'destructive',
                title: t.errors.title,
                description: t.errors.unknownError,
            });
        }
    } finally {
        setIsSavingPassword(false);
    }
  };

  const onProfileSubmit = async (data: z.infer<typeof profileFormSchema>) => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await updateUserProfile(user.uid, data);
      toast({ title: t.profile.profileUpdated });
    } catch (error) {
       toast({
          variant: 'destructive',
          title: t.errors.title,
          description: t.errors.unknownError,
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const userInitial = userProfile?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?';

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

  const isSaving = isSavingPassword || isSavingProfile || isDataLoading;

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold font-headline">{t.nav.profile}</h1>
        <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
                <Card className="flex flex-col h-full">
                    <CardHeader className="items-center text-center">
                        <Avatar className="h-24 w-24 mb-4">
                            <AvatarImage src={user?.photoURL || ''} alt={userProfile?.name || user?.email || ''} />
                            <AvatarFallback>{userInitial}</AvatarFallback>
                        </Avatar>
                        <CardTitle className="flex items-center gap-2">
                            {userProfile?.name || user?.email}
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
            <div className="md:col-span-2 space-y-8">
                 <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                        <Card>
                             <CardHeader>
                                <CardTitle>{t.profile.yourProfile}</CardTitle>
                                <CardDescription>{t.profile.profileDescription}</CardDescription>
                            </CardHeader>
                             <CardContent className="space-y-4">
                               <FormField
                                    control={profileForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t.profile.name}</FormLabel>
                                            <FormControl>
                                                <Input {...field} disabled={isSaving} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={profileForm.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t.profile.phone}</FormLabel>
                                            <FormControl>
                                                <Input type="tel" {...field} disabled={isSaving} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                            <CardFooter>
                               <Button type="submit" disabled={isSaving || !profileForm.formState.isDirty}>
                                    {isSavingProfile && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                    {isSavingProfile ? t.settings.saving : t.settings.save}
                                </Button>
                            </CardFooter>
                        </Card>
                    </form>
                 </Form>

                <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                        <Card>
                            <CardHeader>
                                <CardTitle>{t.settings.changePassword}</CardTitle>
                                <CardDescription>{t.auth.changePasswordDescription}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={passwordForm.control}
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
                                    control={passwordForm.control}
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
                                    control={passwordForm.control}
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
                                <Button type="submit" disabled={isSaving || !passwordForm.formState.isValid}>
                                    {isSavingPassword && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                    {isSavingPassword ? t.settings.saving : t.settings.changePassword}
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
