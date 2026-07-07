'use client';

import { Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function FilterLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold tracking-wide text-gray-700">{children}</p>;
}

export default function DocumentsFilterSidebar() {
  return (
    <aside className="w-72 shrink-0">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Filtrar documentos</h2>

      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-2">
          <FilterLabel>Requiere mi firma o revisión</FilterLabel>
          <Switch />
        </div>

        <div>
          <FilterLabel>Nombre del documento</FilterLabel>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Ingresa una palabra o frase" className="pl-8" />
          </div>
        </div>

        <div>
          <FilterLabel>Firmantes y revisores</FilterLabel>
          <div className="relative">
            <Users className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Buscar" className="pl-8" />
          </div>
        </div>

        <div>
          <FilterLabel>Etiquetas</FilterLabel>
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtrar por etiquetas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgente">Urgente</SelectItem>
              <SelectItem value="interno">Interno</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <FilterLabel>Estado del documento</FilterLabel>
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona uno" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en-progreso">En progreso</SelectItem>
              <SelectItem value="firmado">Firmado por todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <FilterLabel>Fecha de firma</FilterLabel>
          <div className="flex items-center gap-2">
            <Input type="date" placeholder="Desde" />
            <span className="text-gray-400">→</span>
            <Input type="date" placeholder="Hasta" />
          </div>
        </div>

        <div>
          <FilterLabel>Fecha de creación</FilterLabel>
          <div className="flex items-center gap-2">
            <Input type="date" placeholder="Desde" />
            <span className="text-gray-400">→</span>
            <Input type="date" placeholder="Hasta" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <FilterLabel>Ver documentos archivados</FilterLabel>
          <Switch />
        </div>
      </div>
    </aside>
  );
}
