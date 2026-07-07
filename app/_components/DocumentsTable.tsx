'use client';

import { ArrowUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DocumentRow {
  id: string;
  name: string;
  participant: string;
  participantStatus: 'en-progreso' | 'firmado';
  createdAt: string;
  signedAt: string;
}

const documents: DocumentRow[] = [
  {
    id: '1',
    name: '18._NOMENCLATURA_EXPEDIENTES_CONTRATACION',
    participant: 'isaay.sosa@data-lo.com',
    participantStatus: 'firmado',
    createdAt: '04/07/2026',
    signedAt: '04/07/2026',
  },
];

function SortableHeader({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 cursor-pointer select-none">
      {children}
      <ArrowUp className="size-3.5 text-gray-400" />
    </span>
  );
}

export default function DocumentsTable() {
  return (
    <div className="flex-1 min-w-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortableHeader>Nombre del documento</SortableHeader>
            </TableHead>
            <TableHead>Participantes</TableHead>
            <TableHead>
              <SortableHeader>Creado</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader>Firmado</SortableHeader>
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="w-64 max-w-64 whitespace-normal text-emerald-700">
                <div className="flex items-start gap-1.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span className="min-w-0 flex-1 break-words">{doc.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${
                      doc.participantStatus === 'firmado' ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />
                  <span>{doc.participant}</span>
                </div>
              </TableCell>
              <TableCell>{doc.createdAt}</TableCell>
              <TableCell>{doc.signedAt}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="secondary" size="sm">
                    DESCARGAR
                    <ChevronDown className="size-3.5" />
                  </Button>
                  <Button variant="outline" size="icon-sm" className="border-emerald-500 text-emerald-600">
                    <ChevronDown className="size-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Documentos por página</span>
          <Select defaultValue="25">
            <SelectTrigger size="sm" className="w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 text-gray-500">
          <Button variant="ghost" size="icon-sm" disabled>
            <ChevronsLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" disabled>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="px-2 text-sm font-medium text-emerald-600">1</span>
          <Button variant="ghost" size="icon-sm" disabled>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" disabled>
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
