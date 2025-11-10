
'use client';
import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { useUser } from '@/firebase';

export default function UsersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { userProfiles, updateUserProfile, isLoading, userProfile } = useData();
  const { user } = useUser();

  const sortedUsers = useMemo(() => {
    if (!userProfiles) return [];
    return [...userProfiles].sort((a, b) => {
        if (a.id === user?.uid) return -1;
        if (b.id === user?.uid) return 1;
        return a.email.localeCompare(b.email);
    });
  }, [userProfiles, user?.uid]);

  const handleToggleApproval = (profile: UserProfile) => {
    if (profile.id === user?.uid) {
        toast({ variant: 'destructive', title: t.errors.title, description: "You cannot change your own status." });
        return;
    }
    const newStatus = profile.status === 'approved' ? 'pending' : 'approved';
    updateUserProfile(profile.id, { status: newStatus });
    toast({ title: t.users.approvalUpdated });
  };
  
  if (isLoading || !userProfile) {
    return <Loading />;
  }

  if (!userProfile?.isAdmin) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
                <p>You do not have permission to view this page.</p>
            </CardContent>
        </Card>
    );
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
              {sortedUsers.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.email} {profile.id === user?.uid && `(${t.auth.you})`}</TableCell>
                  <TableCell>
                    <Badge variant={profile.status === 'approved' ? 'success' : 'destructive'}>
                      {t.users[profile.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleApproval(profile)}
                      disabled={profile.id === user?.uid}
                      title={profile.status === 'approved' ? t.users.revoke : t.users.approve}
                    >
                        {profile.status === 'approved' ? <ShieldOff className="h-4 w-4 mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                      {profile.status === 'approved' ? t.users.revoke : t.users.approve}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
