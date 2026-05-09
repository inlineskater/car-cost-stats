const configuredEmails = import.meta.env.VITE_ALLOWED_AUTH_EMAILS

export const ALLOWED_AUTH_EMAILS = (configuredEmails
  ? configuredEmails.split(',')
  : ['yuriy.shavlov@gmail.com']
).map((email) => email.trim().toLowerCase()).filter(Boolean)

export function isAllowedAuthEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return ALLOWED_AUTH_EMAILS.includes(normalized)
}
