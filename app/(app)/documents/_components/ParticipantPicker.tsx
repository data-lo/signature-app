'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SelectableUser } from '../_requests';

interface ParticipantPickerProps {
  label: string;
  placeholder: string;
  users: SelectableUser[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  showOrder?: boolean;
  error?: string;
}

export default function ParticipantPicker({
  label,
  placeholder,
  users,
  selectedIds,
  onChange,
  showOrder,
  error,
}: ParticipantPickerProps) {
  const availableUsers = users.filter((user) => !selectedIds.includes(user.id));
  const selectedUsers = selectedIds
    .map((id) => users.find((user) => user.id === id))
    .filter((user): user is SelectableUser => Boolean(user));

  function handleAdd(userId: string | null) {
    if (!userId) return;
    onChange([...selectedIds, userId]);
  }

  function handleRemove(userId: string) {
    onChange(selectedIds.filter((id) => id !== userId));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select
        value={null}
        onValueChange={handleAdd}
        disabled={availableUsers.length === 0}
      >
        <SelectTrigger className="w-full" aria-invalid={Boolean(error)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {availableUsers.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.firstName} {user.lastName} ({user.email})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedUsers.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {selectedUsers.map((user, index) => (
            <li
              key={user.id}
              className="flex items-center justify-between rounded border border-input bg-background px-3 py-1.5 text-sm"
            >
              <span>
                {showOrder && (
                  <span className="mr-2 font-semibold text-emerald-600">
                    {index + 1}.
                  </span>
                )}
                {user.firstName} {user.lastName} ({user.email})
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => handleRemove(user.id)}
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
