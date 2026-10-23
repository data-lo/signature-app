'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Usar configuración del sistema', icon: Monitor },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Antes de montar no hay tema resuelto por el cliente (evita el mismatch de hidratación que
  // tenía el toggle binario original): el icono cae a Sun y el radio group cae a "system" hasta
  // que next-themes confirme el valor real en el cliente.
  const CurrentIcon = mounted && resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              type="button"
              aria-label="Cambiar tema"
              className={
                className ??
                'flex items-center gap-1 text-muted-foreground hover:text-foreground'
              }
            />
          }
        >
          <CurrentIcon className="size-4" />
        </TooltipTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuRadioGroup
            value={mounted ? (theme ?? 'system') : 'system'}
            onValueChange={setTheme}
          >
            {THEME_OPTIONS.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                <option.icon className="size-4" />
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent side="top">Cambiar tema</TooltipContent>
    </Tooltip>
  );
}
