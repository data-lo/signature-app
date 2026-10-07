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
import {
  DIRECTORY_PREVIEW_CONTACTS,
  filterDirectoryPreviewContacts,
  type DirectoryPreviewContact,
} from '../_config/directory-preview.config';

interface DirectoryContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Contactos a mostrar; por defecto, los simulados de `directory-preview.config.ts`. */
  contacts?: readonly DirectoryPreviewContact[];
  /** Acción del botón "Firmante" de cada resultado. Sin conectar mientras el modal sea sólo visual. */
  onSelectSigner?: (contact: DirectoryPreviewContact) => void;
  /** Acción del botón "Testigo" de cada resultado. Sin conectar mientras el modal sea sólo visual. */
  onSelectWitness?: (contact: DirectoryPreviewContact) => void;
}

/**
 * Modal del Directorio en el paso de participantes: buscador, resultados y, por cada contacto,
 * los botones para sumarlo como firmante o como testigo.
 *
 * Es SÓLO interfaz (historia "Crear componentes UI para selección y alta de contactos desde
 * Directorio"): no consulta la API ni agrega participantes. El buscador filtra en memoria los
 * contactos que recibe para enseñar los tres estados —sin búsqueda iniciada, con resultados y
 * sin resultados—, y los botones sólo llaman a `onSelectSigner`/`onSelectWitness` si alguien los
 * pasa. El texto escrito se limpia al cerrar el modal.
 *
 * @param props - Apertura del modal, contactos a mostrar y acciones opcionales por resultado.
 * @returns El modal del Directorio.
 *
 * @throws Nada: no hace peticiones ni valida datos.
 *
 * @example
 * ```tsx
 * <DirectoryContactsDialog open={isOpen} onOpenChange={setIsOpen} />
 * ```
 */
export default function DirectoryContactsDialog({
  open,
  onOpenChange,
  contacts = DIRECTORY_PREVIEW_CONTACTS,
  onSelectSigner,
  onSelectWitness,
}: DirectoryContactsDialogProps) {
  const [query, setQuery] = useState('');
  const hasQuery = query.trim() !== '';
  const results = hasQuery
    ? filterDirectoryPreviewContacts(contacts, query)
    : [];

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setQuery('');
    onOpenChange(nextOpen);
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
            aria-label="Buscar contacto por nombre o apellido"
            placeholder="Buscar por nombre o apellido"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="max-h-80 min-h-40 overflow-y-auto">
          {!hasQuery ? (
            <DirectoryEmptyState
              icon={<BookUser className="size-6" />}
              title="Busca en tu directorio"
              description="Escribe un nombre o apellido para ver tus contactos."
            />
          ) : results.length === 0 ? (
            <DirectoryEmptyState
              icon={<SearchX className="size-6" />}
              title="Sin resultados"
              description="No encontramos contactos que coincidan con tu búsqueda."
            />
          ) : (
            <ul
              className="flex flex-col"
              aria-label="Resultados del directorio"
            >
              {results.map((contact) => (
                <DirectoryContactRow
                  key={contact.id}
                  contact={contact}
                  onSelectSigner={onSelectSigner}
                  onSelectWitness={onSelectWitness}
                />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Un resultado del Directorio: nombre y apellido, con las acciones Testigo y Firmante.
 *
 * @param props - Contacto a pintar y acciones opcionales.
 * @returns La fila del resultado.
 *
 * @throws Nada.
 *
 * @example
 * ```tsx
 * <DirectoryContactRow contact={{ id: '1', firstName: 'Ana', lastName: 'García' }} />
 * ```
 */
function DirectoryContactRow({
  contact,
  onSelectSigner,
  onSelectWitness,
}: {
  contact: DirectoryPreviewContact;
  onSelectSigner?: (contact: DirectoryPreviewContact) => void;
  onSelectWitness?: (contact: DirectoryPreviewContact) => void;
}) {
  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <li className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
      <span className="min-w-0 truncate font-medium text-foreground">
        {fullName}
      </span>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Agregar a ${fullName} como testigo`}
          onClick={() => onSelectWitness?.(contact)}
        >
          <Eye className="size-3.5" />
          Testigo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Agregar a ${fullName} como firmante`}
          onClick={() => onSelectSigner?.(contact)}
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
