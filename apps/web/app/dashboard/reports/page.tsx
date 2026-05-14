import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { ReportsClient } from './ReportsClient'

type Period = {
  id: string
  businessId: string
  year: number
  month: number
  status: string
  lockedAt: string | null
}

export default async function ReportsPage() {
  let periods: Period[] = []
  let loadError = false

  try {
    const res = await apiRequestAuthenticated<{ periods: Period[] }>('/periods')
    periods = res.periods
  } catch {
    loadError = true
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-4 p-8">
        <h1
          className="text-[26px] font-semibold tracking-[-0.02em]"
          style={{ color: 'var(--color-ink)' }}
        >
          Reports
        </h1>
        <div
          role="alert"
          className="rounded-[10px] border px-4 py-3 text-[13px]"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-bad) 25%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--color-bad) 8%, transparent)',
            color: 'var(--color-bad)',
          }}
        >
          Unable to load periods. Please try again.
        </div>
      </div>
    )
  }

  return <ReportsClient periods={periods} />
}
