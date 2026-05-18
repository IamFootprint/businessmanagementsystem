import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { CaptureClient } from './CaptureClient'

type Business = { id: string; name: string }
type Category = { id: string; name: string }

async function getBusinesses(): Promise<Business[]> {
  try {
    const r = await apiRequestAuthenticated<{ data: Business[] }>('/businesses')
    return r.data
  } catch {
    return []
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const r = await apiRequestAuthenticated<{ data: Category[] }>('/categories')
    return r.data
  } catch {
    return []
  }
}

export default async function CapturePage() {
  const [businesses, categories] = await Promise.all([getBusinesses(), getCategories()])
  return <CaptureClient businesses={businesses} categories={categories} />
}
