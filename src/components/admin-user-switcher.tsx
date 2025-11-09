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
                    {currentUser.email} ({t.auth.you})
                </SelectItem>
                {/* List other users */}
                {allUsers
                .filter(u => u.id !== currentUser.uid) // Exclude current admin from the rest of the list
                .map(u => (
                    <SelectItem key={u.id} value={u.id}>
                    {u.email}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
  );
}
