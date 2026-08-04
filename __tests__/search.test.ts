import { describe, it, expect } from 'vitest'
import { matchesQuery, matchesAnyQuery, normalizeQuery } from '@/lib/search'

describe('normalizeQuery', () => {
  it('trims and lowercases', () => {
    expect(normalizeQuery('  Hello  World ')).toBe('hello world')
  })
})

describe('matchesQuery', () => {
  it('matches everything when query is empty', () => {
    expect(matchesQuery('anything', '')).toBe(true)
    expect(matchesQuery(undefined, '')).toBe(true)
  })

  it('matches case-insensitively', () => {
    expect(matchesQuery('Workstation-04', 'workstation-04')).toBe(true)
    expect(matchesQuery('workstation-04', 'WORKSTATION')).toBe(true)
  })

  it('requires all space-separated terms to match (AND)', () => {
    expect(matchesQuery('Workstation Alpha Lab', 'workstation alpha')).toBe(true)
    expect(matchesQuery('Workstation Alpha', 'workstation beta')).toBe(false)
  })

  it('returns false for null/undefined fields with a query', () => {
    expect(matchesQuery(null, 'lab')).toBe(false)
    expect(matchesQuery(undefined, 'lab')).toBe(false)
  })
})

describe('matchesAnyQuery', () => {
  it('matches across multiple fields', () => {
    const fields = ['PC-0001', '10.0.0.21', null]
    expect(matchesAnyQuery(fields, '10.0.0.21')).toBe(true)
    expect(matchesAnyQuery(fields, 'pc-0001')).toBe(true)
    expect(matchesAnyQuery(fields, 'missing')).toBe(false)
  })

  it('matches empty query always', () => {
    expect(matchesAnyQuery(['a', 'b'], '')).toBe(true)
    expect(matchesAnyQuery([], '')).toBe(true)
  })

  it('requires every term to be present in some field', () => {
    const fields = ['Workstation Alpha', 'Building 2']
    expect(matchesAnyQuery(fields, 'workstation 2')).toBe(true)
    expect(matchesAnyQuery(fields, 'workstation gamma')).toBe(false)
  })
})
