"use client";

export default function GlobalError() {
  return (
    <html>
      <body>
        <main style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui, sans-serif", background: "#f8f9fa" }}>
          <section style={{ width: "100%", maxWidth: "24rem", borderRadius: "0.75rem", border: "1px solid #e5e7eb", background: "#fff", padding: "1.5rem", textAlign: "center" }}>
            <h1 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.5rem", color: "#111" }}>
              CycleDesk hit an unexpected error
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.25rem" }}>
              Something went wrong while loading the app. This is usually temporary.
            </p>
            <p style={{ fontSize: "0.75rem", color: "#999", marginBottom: "1.25rem" }}>
              Refresh this page to try again. If the problem continues, contact{" "}
              <a href="mailto:support@cycledesk.co.za" style={{ color: "#6366f1" }}>
                support@cycledesk.co.za
              </a>
            </p>
            <a
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: "2.5rem", padding: "0 1rem", borderRadius: "0.5rem", background: "#6366f1", color: "#fff", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none" }}
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.location.reload();
              }}
            >
              Refresh page
            </a>
          </section>
        </main>
      </body>
    </html>
  );
}
