
'use client';
import { useState } from 'react';
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
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

export default function ProfilePage() {
  const { t } = useLanguage();
  const { user, userProfile } = useUser();
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

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold font-headline">{t.nav.profile}</h1>
        <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
                <Card>
                    <CardHeader className="items-center text-center">
                        <Avatar className="h-24 w-24 mb-4">
                            <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || user?.email || ''} />
                            <AvatarFallback>{userInitial}</AvatarFallback>
                        </Avatar>
                        <CardTitle>{user?.displayName || user?.email}</CardTitle>
                        <CardDescription>{user?.email}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-center">
                             {userProfile?.status === 'approved' && (
                                <Badge variant="success" className="gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    {t.users.approved}
                                </Badge>
                             )}
                              {userProfile?.status === 'pending' && (
                                <Badge variant="destructive" className="gap-2">
                                    {t.users.pending}
                                </Badge>
                             )}
                        </div>
                    </CardContent>
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
