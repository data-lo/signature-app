'use client';

import { useState, type ReactNode } from 'react';
import { BookUser, Eye, Search, SearchX, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { DirectoryContact } from '../_requests';
import { useDirectoryContactSearch } from '../_hooks/useDirectoryContactSearch';

interface DirectoryContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** El contacto elegido con el botón "Firmante" de su resultado. */
  onSelectSigner: (contact: DirectoryContact) => void;
  /** El contacto elegido con el botón "Testigo" de su resultado. */
  onSelectWitness: (contact: DirectoryContact) => void;
}

/**
 * Modal del Directorio en el paso de participantes: busca por correo en el Directorio de la cuenta
 * activa (`GET /api/v1/directory-contacts`) y, por cada contacto, ofrece sumarlo como firmante o
 * como testigo.
 *
 * Elegir un contacto cierra el modal y lo entrega a `onSelectSigner`/`onSelectWitness`; qué
 * tarjeta se arma con él lo decide quien lo abre (`collaboratorFromDirectoryContact`). Un contacto
 * sin usuario de la plataforma se marca como "Sin cuenta": se puede elegir igual, pero se agrega
 * como captura manual porque no hay usuario al que el backend pueda resolver. El texto escrito se
 * limpia al cerrar.
 *
 * @param props - Apertura del modal y acciones por resultado.
 * @returns El modal del Directorio.
 *
 * @throws Nada: los fallos de la búsqueda se muestran dentro del modal.
 *
 * @example
 * ```tsx
 * <DirectoryContactsDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onSelectSigner={(contact) => append(collaboratorFromDirectoryContact(contact, 'SIGNER'))}
 *   onSelectWitness={(contact) => append(collaboratorFromDirectoryContact(contact, 'WITNESS'))}
 * />
 * ```
 */
export default function DirectoryContactsDialog({
  open,
  onOpenChange,
  onSelectSigner,
  onSelectWitness,
}: DirectoryContactsDialogProps) {
  const [input, setInput] = useState('');
  const { query, term } = useDirectoryContactSearch(input);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setInput('');
    onOpenChange(nextOpen);
  }

  function select(
    contact: DirectoryContact,
    onSelect: (contact: DirectoryContact) => void,
  ) {
    onSelect(contact);
    handleOpenChange(false);
  }

  let results: ReactNode;
  if (!term) {
    results = (
      <DirectoryEmptyState
        icon={<BookUser className="size-6" />}
        title="Busca en tu directorio"
        description="Escribe parte del correo de un contacto para encontrarlo."
      />
    );
  } else if (query.isPending) {
    results = (
      <div className="flex flex-col gap-3 py-2" aria-label="Buscando contactos">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-44" />
      </div>
    );
  } else if (query.isError) {
    results = (
      <p className="py-6 text-center text-sm text-destructive">
        No pudimos consultar el directorio. Inténtalo de nuevo.
      </p>
    );
  } else if (query.data.length === 0) {
    results = (
      <DirectoryEmptyState
        icon={<SearchX className="size-6" />}
        title="Sin resultados"
        description="No encontramos contactos que coincidan con tu búsqueda."
      />
    );
  } else {
    results = (
      <ul className="flex flex-col" aria-label="Resultados del directorio">
        {query.data.map((contact) => (
          <DirectoryContactRow
            key={contact.id}
            contact={contact}
            onSelectSigner={() => select(contact, onSelectSigner)}
            onSelectWitness={() => select(contact, onSelectWitness)}
          />
        ))}
      </ul>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Directorio</DialogTitle>
          <DialogDescription>
            Busca un contacto y agrégalo como firmante o testigo.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            type="search"
            aria-label="Buscar contacto por correo"
            placeholder="Buscar por correo"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </div>

        <div className="max-h-80 min-h-40 overflow-y-auto">{results}</div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Un resultado del Directorio: nombre, apellido y correo, con las acciones Testigo y Firmante.
 *
 * @param props - Contacto a pintar y sus dos acciones.
 * @returns La fila del resultado.
 *
 * @throws Nada.
 *
 * @example
 * ```tsx
 * <DirectoryContactRow contact={contact} onSelectSigner={…} onSelectWitness={…} />
 * ```
 */
function DirectoryContactRow({
  contact,
  onSelectSigner,
  onSelectWitness,
}: {
  contact: DirectoryContact;
  onSelectSigner: () => void;
  onSelectWitness: () => void;
}) {
  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <li className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-foreground">{fullName}</span>
        <span className="truncate text-xs text-muted-foreground">
          {contact.email}
          {!contact.linkedUserId && ' · Sin cuenta'}
        </span>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Agregar a ${fullName} como testigo`}
          onClick={onSelectWitness}
        >
          <Eye className="size-3.5" />
          Testigo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Agregar a ${fullName} como firmante`}
          onClick={onSelectSigner}
        >
          <UserPlus className="size-3.5" />
          Firmante
        </Button>
      </div>
    </li>
  );
}

/**
 * Estado sin contenido del área de resultados (sin búsqueda iniciada o sin coincidencias).
 *
 * @param props - Icono, título y texto de apoyo.
 * @returns El bloque centrado del estado vacío.
 *
 * @throws Nada.
 *
 * @example
 * ```tsx
 * <DirectoryEmptyState icon={<SearchX />} title="Sin resultados" description="…" />
 * ```
 */
function DirectoryEmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
