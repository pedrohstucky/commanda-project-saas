import { Loader2 } from "lucide-react"

/**
 * Loading state para a página de pedidos
 * Aparece durante navegação ou carregamento inicial
 */
export default function OrdersLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div>
        <div className="h-9 w-48 bg-muted animate-pulse rounded" />
        <div className="h-5 w-96 bg-muted animate-pulse rounded mt-2" />
      </div>

      {/* Filters Skeleton */}
      <div className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-24 bg-muted animate-pulse rounded" />
          ))}
        </div>
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
      </div>

      {/* Loading Spinner */}
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  )
}