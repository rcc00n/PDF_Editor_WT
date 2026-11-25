import { describe, expect, it } from 'vitest'
import { read, utils, write } from 'xlsx'

// The employee screen imports uploaded workbooks and exports records with the
// same SheetJS API. Keep compatibility explicit when changing its distribution.
describe('synthetic employee spreadsheet', () => {
  it('round-trips XLSX headers, strings and boolean-like values', () => {
    const rows = [{ name: 'Synthetic Reviewer', email: 'reviewer@example.invalid', active: 'true' }]
    const workbook = utils.book_new()
    utils.book_append_sheet(workbook, utils.json_to_sheet(rows), 'Employees')
    const bytes = write(workbook, { bookType: 'xlsx', type: 'array' })
    const loaded = read(bytes, { type: 'array' })
    expect(utils.sheet_to_json(loaded.Sheets[loaded.SheetNames[0]])).toEqual(rows)
  })
  it('parses CSV input without requiring a file-system or provider connection', () => {
    const loaded = read('name,email,active\nSynthetic Reviewer,reviewer@example.invalid,true', { type: 'string' })
    const rows = utils.sheet_to_json(loaded.Sheets[loaded.SheetNames[0]], { raw: false })
    expect(rows).toEqual([{ name: 'Synthetic Reviewer', email: 'reviewer@example.invalid', active: 'true' }])
  })
})
