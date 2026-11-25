# Review limits — 2026-11-25

This branch improves reproducibility and makes the local simulation boundary
explicit. It is not a deployment-readiness certification.

- **Dependencies:** the initial lockfile had 11 npm advisories (3 critical,
  3 high, 5 moderate). This branch pins jsPDF 4.2.1, React Router 7.18.7 and
  Vitest 5.1.2, removes unused Zod, and replaces stale npm SheetJS 0.18.5 with
  the official 0.20.3 tarball. The lockfile records its URL and integrity hash;
  its Apache-2.0 third-party licence is unchanged. The fresh audit reports zero
  known npm advisories. npm advisory discovery is not complete assurance for a
  non-registry distribution and does not prove freedom from vulnerabilities. Django moved
  from 5.1.6 to 5.2.18. Synthetic tests exercise actual PDF generation and XLSX/CSV
  round trips after these changes. The downloaded tarball's SHA-512 was independently recomputed and matched the
  lockfile; its package manifest identifies `xlsx` 0.20.3 under Apache-2.0. That
  verifies byte consistency, not a signed security attestation. The exact source
  is `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, as documented by the
  publisher. Installation requires access to the official SheetJS CDN as well as npm; no tarball is bundled in this source repository.
  [SheetJS distribution guidance](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/).
- **Browser-state migration:** old builds shared `rf_store_v1` and
  `rf_offline_cache` between demo and connected mode. They are preserved but not
  automatically loaded into either new mode. The owner must inspect/export any
  unsent work in the old build before an existing installation is upgraded; do not
  clear browser storage first. This source pass does not perform that migration.
- **Delivery:** a connected queue has real API requests; the demo only simulates
  progress. End-to-end crash recovery, idempotent resubmission and multi-device
  conflicts are not established by these tests.
- **Operations:** production database/media, proxy header trust, backups, secure
  cookies and deployment ownership require a host-specific review. No service was
  restarted or deployed by this source pass.
- **Content:** existing branding remains unchanged. Rights to client names,
  screenshots and real operational examples require the owner's confirmation.
  Reviewers should use synthetic PDFs and form values.
- **Performance:** the production build reports a large PDF/export bundle. This
  is measured build output, not proof of acceptable field-device performance.

The new test configuration never points at an operational database. Generated
browser files, environment secrets and Windows download-origin sidecars are ignored.
