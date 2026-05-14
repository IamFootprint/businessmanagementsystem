import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { CategoriesClient } from './CategoriesClient'

type Category = {
  id: string
  name: string
  categoryType: string
  receiptRequired: boolean
  active: boolean
}

async function getCategories(): Promise<Category[]> {
  try {
    const res = await apiRequestAuthenticated<{ data: Category[] }>('/categories')
    return res.data ?? []
  } catch {
    return []
  }
}

export default async function CategoriesPage() {
  const categories = await getCategories()

  const grouped: Record<string, Category[]> = {}
  for (const cat of categories) {
    if (!grouped[cat.categoryType]) grouped[cat.categoryType] = []
    grouped[cat.categoryType].push(cat)
  }

  return <CategoriesClient grouped={grouped} />
}
