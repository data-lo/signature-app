'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUsers } from '../_hooks/useUsers';

interface SignerSelectProps {
  value: string | undefined;
  error?: string;
  onChange: (signerId: string) => void;
}

export default function SignerSelect({ value, error, onChange }: SignerSelectProps) {
  const { data: users, isLoading } = useUsers();

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="signerId">Firmante</Label>
      <Select
        value={value}
        onValueChange={(nextValue) => nextValue && onChange(nextValue)}
        disabled={isLoading}
      >
        <SelectTrigger id="signerId" className="w-full" aria-invalid={Boolean(error)}>
          <SelectValue placeholder={isLoading ? 'Cargando usuarios...' : 'Selecciona un firmante'} />
        </SelectTrigger>
        <SelectContent>
          {users?.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.firstName} {user.lastName} ({user.email})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
