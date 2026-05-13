import { apiRequestAuthenticated } from '@/lib/api-client.server'

type Period = {
  id: string
  businessId: string
  year: number
  month: number
  status: string
  lockedAt: string | null
}
type PeriodsResponse = { periods: Period[] }

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>
}) {
  const params = await searchParams
  const businessId = params.businessId

  if (!businessId) {
    return (
      <div>
        <h1>Reports</h1>
        <p>Select a business: add <code>?businessId=&lt;id&gt;</code> to the URL.</p>
      </div>
    )
  }

  const { periods } = await apiRequestAuthenticated<PeriodsResponse>(
    `/periods?businessId=${businessId}`
  )

  return (
    <div>
      <h1>Reports</h1>
      {periods.length === 0 ? (
        <p>No periods yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Status</th>
              <th>Locked At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.id}>
                <td>{MONTH_NAMES[p.month - 1]} {p.year}</td>
                <td>{p.status}</td>
                <td>{p.lockedAt ? new Date(p.lockedAt).toLocaleDateString('en-ZA') : '—'}</td>
                <td>
                  <a href={`/dashboard/reports/${p.id}`}>View report</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
