import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CurrentUser } from '../_requests';

interface UserInfoCardProps {
  user: CurrentUser;
}

export default function UserInfoCard({ user }: UserInfoCardProps) {
  return (
    <Card className="max-w-xl w-full">
      <CardHeader>
        <CardTitle>Mi información</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Nombre</dt>
          <dd className="font-medium">
            {user.firstName} {user.lastName}
          </dd>

          <dt className="text-muted-foreground">Correo</dt>
          <dd className="font-medium">{user.email}</dd>

          <dt className="text-muted-foreground">Puesto</dt>
          <dd className="font-medium">{user.position ?? '—'}</dd>

          <dt className="text-muted-foreground">CURP</dt>
          <dd className="font-medium">{user.nationalId}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}
