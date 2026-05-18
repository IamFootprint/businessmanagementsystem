import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { TransactionsClient } from './TransactionsClient'
import type { Category } from '@/components/ui/inline-category-picker'

type Transaction = {
  id: string
  transactionDate: string
  rawDescription: string
  amountCents: number
  reviewStatus: string
  direction: string
  category: { id: string; name: string; color?: string } | null
  supplier?: { id: string; name: string } | null
  receipt?: string | null
  confidence?: number
}

type TransactionsResponse = {
  data: Transaction[]
  meta: { total: number; page: number; pageSize: number; pages: number }
}

const STATUS_TABS = ['NEEDS_REVIEW', 'REVIEWED', 'UNCLEAR', 'LOCKED'] as const

async function getTransactions(reviewStatus: string, page: string, search?: string): Promise<TransactionsResponse> {
  try {
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : ''
    return await apiRequestAuthenticated<TransactionsResponse>(
      `/transactions?reviewStatus=${reviewStatus}&pageSize=50&page=${page}${searchParam}`
    )
  } catch {
    return { data: [], meta: { total: 0, page: 1, pageSize: 50, pages: 0 } }
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const result = await apiRequestAuthenticated<{ data: Category[] }>('/categories')
    return result.data
  } catch {
    return []
  }
}

type Business = { id: string; name: string; slug: string }
type Supplier = { id: string; name: string }

async function getBusinesses(): Promise<Business[]> {
  try {
    const result = await apiRequestAuthenticated<{ data: Business[] }>('/businesses')
    return result.data
  } catch {
    return []
  }
}

async function getSuppliers(): Promise<Supplier[]> {
  try {
    const result = await apiRequestAuthenticated<{ data: Supplier[] }>('/suppliers')
    return result.data
  } catch {
    return []
  }
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const reviewStatus = (STATUS_TABS as readonly string[]).includes(params.reviewStatus)
    ? params.reviewStatus
    : 'NEEDS_REVIEW'
  const page = /^\d+$/.test(params.page ?? '') ? params.page! : '1'
  const search = params.search?.trim() || undefined

  const [{ data: transactions, meta }, categories, businesses, suppliers] = await Promise.all([
    getTransactions(reviewStatus, page, search),
    getCategories(),
    getBusinesses(),
    getSuppliers(),
  ])

  return (
    <TransactionsClient
      transactions={transactions}
      meta={meta}
      categories={categories}
      businesses={businesses}
      suppliers={suppliers}
      reviewStatus={reviewStatus}
      page={Number(page)}
      searchQuery={search}
    />
  )
}
