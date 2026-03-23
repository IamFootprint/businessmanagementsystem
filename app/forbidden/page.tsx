export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center">
        <h1 className="font-display font-bold text-foreground text-lg mb-2">403 · Access forbidden</h1>
        <p className="text-sm text-foreground mb-1">You do not have permission to access this resource.</p>
        <p className="text-sm text-muted-foreground mb-4">If you believe this is incorrect, contact the shop owner.</p>
        <a
          className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
          href="/"
        >
          Return home
        </a>
      </div>
    </div>
  );
}
