
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
import { ShieldCheck, ShieldOff, LoaderCircle } from 'lucide-react';
import { useUser } from '@/firebase';

export default function UsersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { userProfiles, approveUser, revokeUser, isLoading, userProfile } = useData();
  const { user } = useUser();

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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
