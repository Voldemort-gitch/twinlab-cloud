import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SearchInput from '@/components/ui/SearchInput'

describe('SearchInput', () => {
  it('renders with the given placeholder', () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Search things" />)
    expect(screen.getByPlaceholderText('Search things')).toBeInTheDocument()
  })

  it('calls onChange when typing', () => {
    const onChange = vi.fn()
    render(<SearchInput value="" onChange={onChange} placeholder="Search" />)
    const input = screen.getByPlaceholderText('Search')
    fireEvent.change(input, { target: { value: 'lab' } })
    expect(onChange).toHaveBeenCalledWith('lab')
  })

  it('shows a clear button when there is a value and clears on click', () => {
    const onChange = vi.fn()
    render(<SearchInput value="term" onChange={onChange} placeholder="Search" />)
    const clear = screen.getByRole('button', { name: 'Clear search' })
    expect(clear).toBeInTheDocument()
    fireEvent.click(clear)
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('does not show a clear button when empty', () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Search" />)
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
  })
})
