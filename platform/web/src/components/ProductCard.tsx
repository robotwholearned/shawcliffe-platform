import type { Product } from '@/lib/supabase/types'

const STATUS_STYLE = {
  available: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  low:       'bg-amber-50 text-amber-700 ring-amber-600/20',
  sold_out:  'bg-gray-100 text-gray-400 ring-gray-400/20',
}

const STATUS_LABEL = {
  available: 'Available',
  low:       'Low Stock',
  sold_out:  'Sold Out',
}

export default function ProductCard({ product }: { product: Product }) {
  const soldOut = product.status === 'sold_out'

  return (
    <div className={`flex items-center gap-3.5 px-4 py-3.5 ${soldOut ? 'opacity-60' : ''}`}>
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className={`h-12 w-12 flex-shrink-0 rounded-lg object-cover ring-1 ring-black/5 ${soldOut ? 'grayscale' : ''}`}
        />
      ) : (
        <div
          aria-hidden
          style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary, #2563eb) 10%, white)' }}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-[var(--brand-primary,#2563eb)]"
        >
          {product.name.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-semibold text-gray-900 ${soldOut ? 'line-through decoration-gray-400' : ''}`}>
          {product.name}
        </p>
        {product.bundle_description && (
          <p className="truncate text-xs text-gray-500">{product.bundle_description}</p>
        )}
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        {product.price != null && (
          <span className="text-sm font-semibold tabular-nums text-gray-900">
            ${product.price.toFixed(2)}
          </span>
        )}
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${STATUS_STYLE[product.status]}`}>
          {STATUS_LABEL[product.status]}
        </span>
      </div>
    </div>
  )
}
