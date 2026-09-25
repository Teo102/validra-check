// Secret patterns searched for in the HTML and JavaScript a browser receives.
// Anything matched here is, by definition, public: every visitor downloads it.
// `severity` is how bad it is to find it in a client bundle.

export const SECRET_PATTERNS = [
  {
    id: "supabase-secret-key",
    name: "Supabase secret key (sb_secret_)",
    severity: "critical",
    regex: /\bsb_secret_[A-Za-z0-9_-]{20,}/g,
    why: "Bypasses Row-Level Security entirely: full read/write access to the database.",
  },
  {
    id: "stripe-secret-key",
    name: "Stripe secret key",
    severity: "critical",
    regex: /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}/g,
    why: "Can create charges, refunds, and read customer data on your Stripe account.",
  },
  {
    id: "openai-key",
    name: "OpenAI API key",
    severity: "high",
    regex: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{40,}/g,
    why: "Anyone can run requests billed to your OpenAI account.",
  },
  {
    id: "anthropic-key",
    name: "Anthropic API key",
    severity: "high",
    regex: /\bsk-ant-[A-Za-z0-9_-]{40,}/g,
    why: "Anyone can run requests billed to your Anthropic account.",
  },
  {
    id: "github-token",
    name: "GitHub token",
    severity: "critical",
    regex: /\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{30,}/g,
    why: "May give access to your repositories and source code.",
  },
  {
    id: "aws-access-key",
    name: "AWS access key ID",
    severity: "high",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    why: "Usually shipped with a secret key; together they give access to AWS resources.",
  },
  {
    id: "resend-key",
    name: "Resend API key",
    severity: "high",
    regex: /\bre_[A-Za-z0-9]{8}_[A-Za-z0-9]{16,}/g,
    why: "Anyone can send email from your domain.",
  },
];

// Column names that suggest personal or sensitive data. Used only to flag
// exposed tables — the tool never prints row values.
export const SENSITIVE_COLUMN_HINTS = [
  "email", "phone", "password", "passwd", "token", "secret", "api_key", "apikey",
  "address", "iban", "card", "stripe", "ssn", "birth", "salary", "ip_address",
  "first_name", "last_name", "full_name", "siret", "tax",
];

// Tried when the database does not publish its table list.
export const COMMON_TABLES = [
  "profiles", "users", "user_profiles", "accounts", "customers", "clients",
  "organizations", "teams", "members", "memberships", "subscriptions",
  "payments", "orders", "invoices", "transactions", "products", "projects",
  "documents", "files", "messages", "conversations", "chats", "notes",
  "posts", "comments", "leads", "contacts", "bookings", "appointments",
  "tasks", "events", "notifications", "settings", "api_keys", "waitlist",
];

export function redact(value) {
  if (value.length <= 12) return value.slice(0, 4) + "…";
  return value.slice(0, 10) + "…" + value.slice(-4);
}
