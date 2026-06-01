import type { Product } from '@/lib/supabase/types'

const STATUS_STYLE = {
  available: 'bg-green-100 text-green-700',
  low:       'bg-yellow-100 text-yellow-700',
  sold_out:  'bg-red-100 text-red-500 line-through',
}

const STATUS_LABEL = {
  available: 'Available',
  low:       'Low Stock',
  sold_out:  'Sold Out',
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="min-w-0">
          <p className={`font-medium text-sm text-gray-900 truncate ${product.status === 'sold_out' ? 'opacity-50' : ''}`}>
            {product.name}
          </p>
          {product.bundle_description && (
            <p className="text-xs text-gray-400 truncate">{product.bundle_description}</p>
          )}
          {product.price != null && (
            <p className="text-xs text-gray-500">${product.price.toFixed(2)}</p>
          )}
        </div>
      </div>
      <span className={`ml-3 flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[product.status]}`}>
        {STATUS_LABEL[product.status]}
      </span>
    </div>
  )
}
