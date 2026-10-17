'use client';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import { DataTableCard } from '@/components/data-table/data-table-card';
import {
  DataTableActionsHead,
  DataTableHeader,
} from '@/components/data-table/data-table-header';
import {
  DataTableLoadingRows,
  DataTableStateRow,
  resolveDataTableBodyState,
} from '@/components/data-table/data-table-body-state';
import { DataTableDate } from '@/components/data-table/data-table-date';
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions';
import type { DirectoryContact } from '../_requests';
import {
  DIRECTORY_PAGE_SIZES,
  isDirectoryPageSize,
  type DirectoryPageSize,
} from '../_hooks/useDirectoryContacts';

interface DirectoryContactsTableProps {
  contacts: DirectoryContact[];
  /** Página actual (base 1); con `pageSize` numera las filas de forma continua entre páginas. */
  page: number;
  pageSize: DirectoryPageSize;
  /** `pagination.totalPages` del backend; 0 cuando nada coincide. */
  totalPages: number;
  /** `pagination.total`: contactos que coinciden con la búsqueda, en todas las páginas. */
  total: number;
  /** Recibe siempre una página dentro de `[1, totalPages]`: los botones no piden otra. */
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: DirectoryPageSize) => void;
  /** Búsqueda aplicada; con ella, el estado vacío dice que nada coincide en vez de "no hay contactos". */
  search?: string;
  /** `DIRECTORY.UPDATE`: ofrece "Actualizar" en el menú de cada fila. */
  canUpdate: boolean;
  /** `DIRECTORY.DELETE`: ofrece "Eliminar" en el menú de cada fila. */
  canDelete: boolean;
  onEdit: (contact: DirectoryContact) => void;
  onDelete: (contact: DirectoryContact) => void;
  /** La consulta todavía no tiene datos: se dibuja el esqueleto dentro de la tarjeta. */
  isLoading?: boolean;
  /** Mensaje si la consulta falló; tiene prioridad sobre la lista y sobre el estado vacío. */
  errorMessage?: string;
}

/** Lo que dice la tabla cuando el directorio no tiene contactos. */
export const EMPTY_DIRECTORY_MESSAGE =
  'Todavía no hay contactos en el directorio.';

/**
 * Lo que dice la tabla cuando la búsqueda no encuentra nada.
 *
 * @param search - Búsqueda aplicada, tal como la escribió el usuario.
 * @returns El mensaje con la búsqueda recortada entre comillas.
 *
 * @example
 * ```ts
 * noDirectoryMatchesMessage(' garcia '); // 'Ningún contacto coincide con “garcia”.'
 * ```
 */
export function noDirectoryMatchesMessage(search: string): string {
  return `Ningún contacto coincide con “${search.trim()}”.`;
}

/** En pantallas angostas el correo y la fecha de registro dejan su columna y pasan bajo el nombre. */
export const DIRECTORY_SECONDARY_COLUMN_CLASS = 'hidden md:table-cell';

/**
 * Número de fila continuo entre páginas: la primera fila de la página 2 con 25 por página es la 26.
 *
 * @param page - Página actual, base 1.
 * @param pageSize - Filas por página.
 * @param rowIndex - Posición de la fila dentro de la página, base 0.
 * @returns El índice que se muestra, base 1.
 *
 * @example
 * ```ts
 * directoryRowNumber(2, 25, 0); // 26
 * ```
 */
export function directoryRowNumber(
  page: number,
  pageSize: number,
  rowIndex: number,
): number {
  return (page - 1) * pageSize + rowIndex + 1;
}

/**
 * Tabla del Directorio: índice, nombre completo, correo, fecha de registro y menú de acciones,
 * con la estructura de Roles y Documentos (tarjeta, esqueleto de carga, error y vacío dentro de
 * la tarjeta, paginación en el pie).
 *
 * El pie es el de Documentos: selector "Contactos por página" (10, 25, 50), total de contactos,
 * primera/anterior/siguiente/última y el indicador "página de total". Se oculta sólo con error.
 *
 * El menú de tres puntos sólo ofrece lo que el permiso deja: "Actualizar" con `canUpdate` y
 * "Eliminar" con `canDelete`. Sin ninguno de los dos no hay columna de acciones, en vez de un
 * menú vacío.
 *
 * @param props - Contactos, paginación, permisos, acciones y estado de la consulta.
 * @returns La tabla dentro de su tarjeta.
 *
 * @example
 * ```tsx
 * <DirectoryContactsTable
 *   contacts={items}
 *   page={1}
 *   pageSize={25}
 *   totalPages={1}
 *   total={2}
 *   onPageChange={setPage}
 *   onPageSizeChange={setPageSize}
 *   canUpdate
 *   canDelete={false}
 *   onEdit={openEdit}
 *   onDelete={setDeletingContact}
 * />
 * ```
 */
export default function DirectoryContactsTable({
  contacts,
  page,
  pageSize,
  totalPages,
  total,
  onPageChange,
  onPageSizeChange,
  search = '',
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  isLoading = false,
  errorMessage,
}: DirectoryContactsTableProps) {
  const hasActions = canUpdate || canDelete;
  const columnCount = hasActions ? 5 : 4;
  const bodyState = resolveDataTableBodyState({
    errorMessage,
    isLoading,
    rowCount: contacts.length,
  });
  const visibleContacts = bodyState === 'rows' ? contacts : [];
  const lastPage = Math.max(1, totalPages);
  const hasPrevPage = page > 1;
  const hasNextPage = page < lastPage;
  const isSearching = search.trim() !== '';

  /**
   * Pide una página sólo si existe y es distinta de la actual: ningún botón puede sacar la tabla
   * del rango, aunque se pulse durante una carga o con un `totalPages` que acaba de cambiar.
   */
  function requestPage(nextPage: number) {
    const target = Math.min(Math.max(nextPage, 1), lastPage);
    if (target !== page) onPageChange(target);
  }

  return (
    <DataTableCard data-slot="directory-table-card">
      <Table aria-busy={bodyState === 'loading' || undefined}>
        <DataTableHeader>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Nombre completo</TableHead>
          <TableHead className={DIRECTORY_SECONDARY_COLUMN_CLASS}>
            Correo electrónico
          </TableHead>
          <TableHead className={DIRECTORY_SECONDARY_COLUMN_CLASS}>
            Fecha de registro
          </TableHead>
          {hasActions && <DataTableActionsHead />}
        </DataTableHeader>
        <TableBody>
          {bodyState === 'error' && (
            <DataTableStateRow
              columnCount={columnCount}
              className="text-destructive"
            >
              <span role="alert">{errorMessage}</span>
            </DataTableStateRow>
          )}
          {bodyState === 'loading' && (
            <DataTableLoadingRows
              columnCount={columnCount}
              label="Cargando contactos"
              rowSlot="directory-loading-row"
            />
          )}
          {bodyState === 'empty' && (
            <DataTableStateRow columnCount={columnCount}>
              {isSearching
                ? noDirectoryMatchesMessage(search)
                : EMPTY_DIRECTORY_MESSAGE}
            </DataTableStateRow>
          )}
          {visibleContacts.map((contact, rowIndex) => {
            const fullName = `${contact.firstName} ${contact.lastName}`;

            return (
              <TableRow key={contact.id} className="hover:bg-muted">
                <TableCell className="text-muted-foreground">
                  {directoryRowNumber(page, pageSize, rowIndex)}
                </TableCell>
                <TableCell>
                  <div className="flex min-w-0 flex-col">
                    <span>{fullName}</span>
                    <span
                      data-slot="directory-mobile-details"
                      className="break-all text-xs text-muted-foreground md:hidden"
                    >
                      {contact.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell className={DIRECTORY_SECONDARY_COLUMN_CLASS}>
                  {contact.email}
                </TableCell>
                <TableCell
                  className={`whitespace-nowrap ${DIRECTORY_SECONDARY_COLUMN_CLASS}`}
                >
                  <DataTableDate date={contact.createdAt} />
                </TableCell>
                {hasActions && (
                  <TableCell>
                    <div className="flex items-center justify-end">
                      <DataTableRowActions label={`Acciones de ${fullName}`}>
                        {canUpdate && (
                          <DropdownMenuItem onClick={() => onEdit(contact)}>
                            <Pencil className="size-4" />
                            Actualizar
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDelete(contact)}
                          >
                            <Trash2 className="size-4" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DataTableRowActions>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {bodyState !== 'error' && (
        <div
          data-slot="directory-table-pagination"
          className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span id="directory-page-size-label">Contactos por página</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                const nextPageSize = Number(value);
                if (isDirectoryPageSize(nextPageSize)) {
                  onPageSizeChange(nextPageSize);
                }
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-16"
                aria-labelledby="directory-page-size-label"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIRECTORY_PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span data-slot="directory-table-total">
              · {total} {total === 1 ? 'contacto' : 'contactos'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-muted-foreground">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Primera página"
              disabled={!hasPrevPage}
              onClick={() => requestPage(1)}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Página anterior"
              disabled={!hasPrevPage}
              onClick={() => requestPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span
              data-slot="directory-table-page-indicator"
              aria-live="polite"
              className="px-2 text-sm"
            >
              <span className="font-medium text-emerald-600">{page}</span>
              <span className="text-muted-foreground"> de {lastPage}</span>
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Página siguiente"
              disabled={!hasNextPage}
              onClick={() => requestPage(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Última página"
              disabled={!hasNextPage}
              onClick={() => requestPage(lastPage)}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </DataTableCard>
  );
}
