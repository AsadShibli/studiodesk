export function ArchitectureContent() {
  return (
    <article>
      <h1>Decisions</h1>
      <p className="muted">Two files to open in an interview: the Prisma tenant extension and authorize().</p>
      <div className="card">
        <h2>1. Next.js never talks to Postgres</h2>
        <p>
          The UI lives in <code>apps/web</code>. Express in <code>apps/api</code> is the only data plane.
          Next rewrites <code>/api/*</code> to Express so cookies stay first-party. Curl the API directly if you want.
        </p>
      </div>
      <div className="card">
        <h2>2. Sessions in Postgres, not JWTs in localStorage</h2>
        <p>
          Cookie is httpOnly + SameSite=Lax. Switching studio updates <code>session.activeOrgId</code>.
          Logout deletes the row — that is revocation.
        </p>
      </div>
      <div className="card">
        <h2>3. Tenant isolation in Prisma</h2>
        <p>
          <code>prismaForOrg(orgId)</code> injects <code>orgId</code> on Client, Booking, Invoice, and imports.
          Unique finds are rewritten to findFirst so a missing WHERE cannot leak another studio.
        </p>
      </div>
      <div className="card">
        <h2>4. One authorize() function</h2>
        <p>
          Roles are permission bundles. Plans are flag sets. Routes ask{" "}
          <code>authorize(&#123; permission: &quot;invoice:write&quot;, flag: &quot;invoicing&quot; &#125;)</code> — never{" "}
          <code>if (role === &quot;admin&quot;)</code>.
        </p>
      </div>
      <div className="card">
        <h2>5. Contact vs User</h2>
        <p>
          Importing a Calendly CSV creates Client rows, not passwords. A portal user is an optional link later.
        </p>
      </div>
      <div className="card">
        <h2>6. Imports are reversible</h2>
        <p>
          Dry-run stores row errors. Commit tags writes with <code>importBatchId</code>. Rollback is{" "}
          <code>DELETE WHERE importBatchId = ?</code>.
        </p>
      </div>
      <div className="card">
        <h2>7. Webhooks are idempotent</h2>
        <p>
          Stripe event ids go into <code>ProcessedEvent</code> first. A retry is a no-op.
        </p>
      </div>
    </article>
  );
}
