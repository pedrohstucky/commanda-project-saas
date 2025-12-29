import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "./animations";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <FadeIn>
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 px-4 text-center",
          className
        )}
      >
        <div className="rounded-full bg-muted p-6 mb-4">
          <Icon className="h-12 w-12 text-muted-foreground" />
        </div>

        <h3 className="text-lg font-semibold mb-2">{title}</h3>

        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>

        {action && (
          <Button onClick={action.onClick} className="gap-2">
            {action.label}
          </Button>
        )}
      </div>
    </FadeIn>
  );
}

/**
 * Variação compacta para uso em dialogs e cards
 */
export function EmptyStateCompact({
  icon: Icon,
  title,
  description,
  className,
}: Omit<EmptyStateProps, "action">) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8 px-4 text-center",
        className
      )}
    >
      <Icon className="h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-sm font-medium mb-1">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

/**
 * Estado de "nenhum resultado" para buscas
 */
export function NoResultsState({
  searchQuery,
  onClear,
}: {
  searchQuery: string;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <svg
          className="h-12 w-12 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold mb-2">
        Nenhum resultado encontrado
      </h3>

      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Não encontramos nada para{" "}
        <span className="font-medium text-foreground">&ldquo;{searchQuery}&rdquo;</span>
        <br />
        Tente ajustar sua busca ou limpar os filtros.
      </p>

      <Button variant="outline" onClick={onClear}>
        Limpar busca
      </Button>
    </div>
  );
}