export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function matchesQuery(field: string | null | undefined, query: string): boolean {
  if (!query) return true
  const q = normalizeQuery(query)
  if (!field) return false
  const value = field.toLowerCase()
  const terms = q.split(/\s+/).filter(Boolean)
  return terms.every((term) => value.includes(term))
}

export function matchesAnyQuery(fields: (string | null | undefined)[], query: string): boolean {
  if (!query) return true
  const terms = normalizeQuery(query).split(/\s+/).filter(Boolean)
  return terms.every((term) => fields.some((f) => f && f.toLowerCase().includes(term)))
}
