'use client';

import { useData } from '@/contexts/data-context';
import { useUser } from '@/firebase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/language-context';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

export function AdminUserSwitcher() {
  const { isAdmin, allUsers, selectedUserId, setSelectedUserId } = useData();
  const { user: currentUser } = useUser();
  const { t } = useLanguage();

  if (!isAdmin || !currentUser) {
    return null;
  }

  // The value for the select should be the current user's ID if no user is selected by the admin
  const selectValue = selectedUserId || currentUser.uid;

  const handleValueChange = (value: string) => {
    // When the admin selects their own account, we should reset the selectedUserId to null
    // so the context defaults to the current user's UID.
    if (value === currentUser.uid) {
      setSelectedUserId(null);
    } else {
      setSelectedUserId(value);
    }
  };
  
  const sortedUsers = [...allUsers].sort((a, b) => (a.email > b.email ? 1 : -1));


  return (
    <div className="px-2 group-data-[collapsible=icon]:px-0">
        <div className="group-data-[collapsible=icon]:hidden">
            <label className="text-xs text-muted-foreground">{t.auth.viewingAs}</label>
        </div>
        <Select value={selectValue} onValueChange={handleValueChange}>
            <SelectTrigger className="mt-1 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:border-0">
                <div className="group-data-[collapsible=icon]:hidden">
                    <SelectValue placeholder={t.auth.selectUser} />
                </div>
                <div className="hidden group-data-[collapsible=icon]:block text-lg">
                    {allUsers.find(u => u.id === selectValue)?.email.charAt(0).toUpperCase() || 'A'}
                </div>
            </SelectTrigger>
            <SelectContent>
                {/* Add current admin user at the top */}
                <SelectItem value={currentUser.uid}>
                    <div className="flex items-center gap-2">
                        <span>{currentUser.email} ({t.auth.you})</span>
                    </div>
                </SelectItem>
                {/* List other users */}
                {sortedUsers
                .filter(u => u.id !== currentUser.uid) // Exclude current admin from the rest of the list
                .map(u => (
                    <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center justify-between w-full">
                            <span>{u.email}</span>
                            <Badge variant={u.approved ? 'success' : 'destructive'} className={cn('ml-2', t.nav.pos === "Caisse" ? 'font-normal' : '')}>
                                {u.approved ? t.users.approved : t.users.pending}
                            </Badge>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
  );
}
