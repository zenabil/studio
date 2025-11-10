
'use client';
import { useState, useMemo, FormEvent } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import Loading from '@/app/loading';
import { UserProfile } from '@/contexts/data-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, ShieldOff, LoaderCircle, Lock } from 'lucide-react';
import { useUser } from '@/firebase';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSettings } from '@/contexts/settings-context';


function AdminPasswordPrompt({ onCorrectPassword }: { onCorrectPassword: () => void }) {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { checkPassword } = useAdminAuth();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (checkPassword(password)) {
      onCorrectPassword();
    } else {
      setError('Incorrect password.');
      setPassword('');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Admin Access Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Admin Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Unlock
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UsersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { userProfiles, approveUser, revokeUser, isLoading } = useData();
  const { user } = useUser();
  const { isAuthorized, setIsAuthorized } = useAdminAuth();
  const { settings, setSettings } = useSettings();


  const passwordFormSchema = z.object({
      currentPassword: z.string().min(1, { message: t.settings.currentPasswordRequired }),
      newPassword: z.string().min(4, { message: t.settings.newPasswordMinLength }),
      confirmPassword: z.string()
  }).refine(data => data.newPassword === data.confirmPassword, {
      message: t.auth.passwordsDoNotMatch,
      path: ['confirmPassword']
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
      resolver: zodResolver(passwordFormSchema),
      mode: 'onChange'
  });

  const onPasswordSubmit = (data: z.infer<typeof passwordFormSchema>) => {
      if (data.currentPassword !== (settings.adminPassword || 'admin')) {
          passwordForm.setError('currentPassword', {
              type: 'manual',
              message: t.settings.currentPasswordIncorrect
          });
          return;
      }
      setSettings({ adminPassword: data.newPassword });
      toast({ title: t.settings.passwordChangedSuccess });
      passwordForm.reset({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
      });
  };

  const sortedUsers = useMemo(() => {
    if (!userProfiles) return [];
    return [...userProfiles].sort((a, b) => {
        if (a.id === user?.uid) return -1;
        if (b.id === user?.uid) return 1;
        return (a.createdAt && b.createdAt) ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : a.email.localeCompare(b.email);
    });
  }, [userProfiles, user?.uid]);

  const handleApprove = async (profile: UserProfile) => {
    try {
        await approveUser(profile.id);
        toast({ title: t.users.approvalUpdated });
    } catch (error) {
        console.error("Approval failed:", error);
        toast({ variant: 'destructive', title: t.errors.title, description: t.errors.unknownError });
    }
  };
  
  const handleRevoke = async (profile: UserProfile) => {
    if (profile.id === user?.uid) {
        toast({ variant: 'destructive', title: t.errors.title, description: "You cannot change your own status." });
        return;
    }
    try {
        await revokeUser(profile.id);
        toast({ title: t.users.approvalUpdated });
    } catch (error) {
        console.error("Revocation failed:", error);
        toast({ variant: 'destructive', title: t.errors.title, description: t.errors.unknownError });
    }
  };
  
  if (!isAuthorized) {
    return <AdminPasswordPrompt onCorrectPassword={() => setIsAuthorized(true)} />;
  }

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold font-headline">{t.users.title}</h1>
            <p className="text-muted-foreground">{t.users.description}</p>
        </div>
      </div>
       <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.users.email}</TableHead>
                <TableHead>{t.users.status}</TableHead>
                <TableHead className="text-right">{t.users.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.length > 0 ? (
                sortedUsers.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.email} {profile.id === user?.uid && `(${t.auth.you})`}</TableCell>
                    <TableCell>
                      <Badge variant={profile.status === 'approved' ? 'success' : 'destructive'}>
                        {t.users[profile.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {profile.status === 'pending' ? (
                          <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(profile)}
                              disabled={isLoading}
                          >
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              {t.users.approve}
                          </Button>
                      ) : (
                          <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevoke(profile)}
                              disabled={profile.id === user?.uid || isLoading}
                              title={profile.id === user?.uid ? "You cannot change your own status." : t.users.revoke}
                          >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              {t.users.revoke}
                          </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        No users yet.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
        <Card>
            <CardHeader>
                <CardTitle>{t.settings.adminPasswordTitle}</CardTitle>
                <CardDescription>{t.settings.adminPasswordDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="currentPassword">{t.settings.currentPassword}</Label>
                    <Input id="currentPassword" type="password" {...passwordForm.register('currentPassword')} />
                      {passwordForm.formState.errors.currentPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>}
                </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t.settings.newPassword}</Label>
                    <Input id="newPassword" type="password" {...passwordForm.register('newPassword')} />
                    {passwordForm.formState.errors.newPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>}
                </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
                    <Input id="confirmPassword" type="password" {...passwordForm.register('confirmPassword')} />
                    {passwordForm.formState.errors.confirmPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>}
                </div>
            </CardContent>
            <CardFooter>
                <Button type="submit" disabled={!passwordForm.formState.isValid}>{t.settings.changePassword}</Button>
            </CardFooter>
        </Card>
      </form>
    </div>
  );
}
