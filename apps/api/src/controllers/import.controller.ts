import type { Context } from 'hono'
import type { AppEnv } from '../types'
import { parseStandardBankCsv } from '../lib/csv-parser'
import { runImport } from '../services/import.service'

export async function createImport(c: Context<AppEnv>) {
  const user = c.get('user')

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Expected multipart/form-data with a CSV file' }, 400)
  }

  const file = formData.get('file')
  const bankAccountId = formData.get('bankAccountId')

  if (!file || typeof file === 'string') {
    return c.json({ error: 'Missing file field' }, 400)
  }
  if (!bankAccountId || typeof bankAccountId !== 'string') {
    return c.json({ error: 'Missing bankAccountId field' }, 400)
  }

  let csvText: string
  try {
    csvText = await (file as File).text()
  } catch {
    return c.json({ error: 'Could not read uploaded file' }, 400)
  }

  let parsedResult: ReturnType<typeof parseStandardBankCsv>
  try {
    parsedResult = parseStandardBankCsv(csvText)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'CSV parse error'
    return c.json({ error: `Invalid CSV: ${msg}` }, 422)
  }

  if (parsedResult.rows.length === 0) {
    return c.json({ error: 'CSV contains no transaction rows' }, 422)
  }

  try {
    const summary = await runImport({
      bankAccountId,
      importedById: user.id,
      tenantId: user.tenantId,
      fileName: (file as File).name,
      csvText,
      parsedResult,
    })
    return c.json(summary, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Import failed'
    return c.json({ error: msg }, 500)
  }
}
