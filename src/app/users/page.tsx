
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
import { ShieldCheck, ShieldOff, LoaderCircle, Lock, CalendarIcon, Search } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSettings } from '@/contexts/settings-context';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';


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

function UserSubscriptionCell({ profile }: { profile: UserProfile }) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const { updateUserSubscription } = useData();
    const [date, setDate] = useState<Date | undefined>(
        profile.subscriptionEndsAt ? new Date(profile.subscriptionEndsAt) : undefined
    );

    const handleUpdate = async () => {
        const newDate = date ? date.toISOString() : null;
        await updateUserSubscription(profile.id, newDate);
        toast({ title: t.users.subscriptionUpdated });
    };

    return (
        <div className="flex items-center gap-2 justify-end">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-[200px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>{t.users.noExpiration}</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            <Button size="sm" onClick={handleUpdate}>{t.users.update}</Button>
        </div>
    );
}

export default function UsersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { userProfiles, approveUser, revokeUser, isLoading, updateUserSubscription } = useData();
  const { user } = useUser();
  const { isAuthorized, setIsAuthorized } = useAdminAuth();
  const { settings, setSettings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');


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

  const sortedAndFilteredUsers = useMemo(() => {
    if (!userProfiles) return [];
    
    let filtered = [...userProfiles];

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(profile => 
        profile.email.toLowerCase().includes(lowerCaseSearchTerm) ||
        (profile as any).phone?.toLowerCase().includes(lowerCaseSearchTerm) ||
        (profile as any).name?.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
    
    return filtered.sort((a, b) => {
        if (a.id === user?.uid) return -1;
        if (b.id === user?.uid) return 1;
        return (a.createdAt && b.createdAt) ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : a.email.localeCompare(b.email);
    });
  }, [userProfiles, user?.uid, searchTerm]);

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
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold font-headline">{t.users.title}</h1>
            <p className="text-muted-foreground">{t.users.description}</p>
        </div>
        <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground rtl:left-auto rtl:right-3" />
            <Input 
                placeholder={t.users.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pr-10"
            />
        </div>
      </div>
       <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.users.email}</TableHead>
                <TableHead>{t.users.status}</TableHead>
                <TableHead>{t.users.subscriptionEnds}</TableHead>
                <TableHead className="text-right">{t.users.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredUsers.length > 0 ? (
                sortedAndFilteredUsers.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.email} {profile.id === user?.uid && `(${t.auth.you})`}</TableCell>
                    <TableCell>
                      <Badge variant={profile.status === 'approved' ? 'success' : 'destructive'}>
                        {t.users[profile.status]}
                      </Badge>
                    </TableCell>
                     <TableCell>
                        {profile.isAdmin ? (
                           <span>-</span>
                        ) : (
                          <UserSubscriptionCell profile={profile} />
                        )}
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
                    <TableCell colSpan={4} className="h-24 text-center">
                        {t.users.noUsers}
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

    