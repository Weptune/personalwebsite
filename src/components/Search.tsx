import { useState, useEffect } from 'react'
import { Search as SearchIcon, X } from 'lucide-react'

interface SearchResult {
  id: string
  title: string
  type?: string
  url: string
  description?: string
}

interface SearchProps {
  items: SearchResult[]
  placeholder?: string
}

export default function Search({ items, placeholder = 'Search...' }: SearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const q = query.toLowerCase()
    const filtered = items.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q)
    )
    setResults(filtered.slice(0, 8))
    setIsOpen(true)
  }, [query, items])

  return (
    <div className="relative w-full">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setIsOpen(true)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setResults([])
              setIsOpen(false)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50">
          <ul className="max-h-96 overflow-y-auto">
            {results.map((result) => (
              <li key={`${result.type}-${result.id}`}>
                <a
                  href={result.url}
                  onClick={() => {
                    setQuery('')
                    setResults([])
                    setIsOpen(false)
                  }}
                  className="block px-4 py-3 hover:bg-muted/50 border-b border-border/50 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {result.title}
                      </p>
                      {result.description && (
                        <p className="text-muted-foreground text-xs truncate">
                          {result.description}
                        </p>
                      )}
                    </div>
                    {result.type && (
                      <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded whitespace-nowrap">
                        {result.type}
                      </span>
                    )}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg p-4 text-center shadow-lg z-50">
          <p className="text-muted-foreground text-sm">No results found</p>
        </div>
      )}
    </div>
  )
}
