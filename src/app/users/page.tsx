
'use client';
import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function UsersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { allUsers, isLoading, isAdmin, updateUserApproval } = useData();
  const { user: currentUser } = useUser();

  const sortedUsers = useMemo(() => {
    if (!allUsers) return [];
    return [...allUsers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allUsers]);

  if (isLoading) {
    return <Loading />;
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.errors.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t.errors.unauthorized}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">{t.users.title}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.users.title}</CardTitle>
          <CardDescription>{t.users.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.users.email}</TableHead>
                <TableHead>{t.users.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.email}
                    {user.id === currentUser?.uid && <Badge variant="secondary" className="ml-2">{t.auth.you}</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.approved ? 'success' : 'destructive'}>
                      {user.approved ? t.users.approved : t.users.pending}
                    </Badge>
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
