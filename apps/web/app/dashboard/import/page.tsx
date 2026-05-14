// apps/web/app/dashboard/import/page.tsx
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import ImportClient from './ImportClient'

type ImportRecord = {
  id: string
  fileName: string
  rowCount: number
  importedCount: number
  duplicateCount: number
  errorCount: number
  status: string
  createdAt: string
  bankAccount: { nickname: string; bankName: string }
  importedBy: { name: string }
}

async function getImportHistory(): Promise<ImportRecord[]> {
  try {
    const res = await apiRequestAuthenticated<{ data: ImportRecord[] }>('/imports')
    return res.data ?? []
  } catch {
    return []
  }
}

export default async function ImportPage() {
  const history = await getImportHistory()
  return <ImportClient history={history} />
}
