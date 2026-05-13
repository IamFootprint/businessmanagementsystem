import { Receipt } from 'lucide-react'
import { GpsCapture } from './GpsCapture'
import { UploadReceiptForm } from './UploadReceiptForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function UploadReceiptPage() {
  return (
    <div
      className="flex min-h-screen items-start justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--color-muted)' }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div
            className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, white)' }}
          >
            <Receipt className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
          </div>
          <CardTitle>Submit a Receipt</CardTitle>
          <CardDescription>
            Upload your receipt and we&apos;ll match it to the right transaction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GpsCapture />
          <UploadReceiptForm />
        </CardContent>
      </Card>
    </div>
  )
}
