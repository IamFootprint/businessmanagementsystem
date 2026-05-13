import { GpsCapture } from './GpsCapture'
import { uploadReceiptAction } from './actions'
import { UploadReceiptForm } from './UploadReceiptForm'

export default function ReceiptUploadPage() {
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Upload Receipt</h1>
      <p>Attach a photo or PDF of your receipt. We will match it to your transaction.</p>
      <GpsCapture />
      <UploadReceiptForm action={uploadReceiptAction} />
    </main>
  )
}
