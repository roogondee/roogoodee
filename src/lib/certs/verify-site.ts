// cert.roogondee.com — the public verification site for certificates issued
// by W Medical (repo roogondee/medicalcertificate). Every printed certificate
// carries a per-person QR (HN + random token) that opens the full certificate
// there; typing only the 10-digit number shows a status-only preview
// (exists / expired / voided / confirmed). This constant is the single place
// the marketing site points at it.
export const CERT_VERIFY_URL = 'https://cert.roogondee.com'
