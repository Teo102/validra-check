# OWASP Top 10 for SaaS: A Practical Security Audit Checklist (2026)

*Téo Brondel · October 2026 · ~10 min read*

> Canonical online version available at [https://validra.dev/en/articles/owasp-top-10-saas-audit-checklist](https://validra.dev/en/articles/owasp-top-10-saas-audit-checklist) and in French at [https://validra.dev/fr/articles/owasp-top-10-saas-audit-checklist](https://validra.dev/fr/articles/owasp-top-10-saas-audit-checklist).

---

## 1. The OWASP Top 10 Mapping for Modern SaaS Architectures

The OWASP Top 10 lists the most critical web application security risks. In modern SaaS stacks relying on Next.js and Supabase, these risks translate directly into authorization bypasses, exposed secrets, or database policy misconfigurations.

| OWASP Risk | Real-World Impact in SaaS | Indispensable Technical Control |
| :--- | :--- | :--- |
| **A01 Broken Access Control** | Cross-tenant customer data leakage | Strict Supabase RLS and Server Action tenant checks |
| **A02 Cryptographic Failures** | Private keys exposed in client bundles | Secret environment variables never prefixed with `NEXT_PUBLIC_` |
| **A03 Injection** | XSS or database query manipulation | Parameterized ORM queries and strict Zod schema validation |
| **A04 Insecure Design** | Brute force or API abuse | Rate limiting on authentication routes via Upstash or edge WAF |
| **A05 Security Misconfiguration** | Public cloud storage buckets | Enforced private storage policies and strict HTTP security headers |
| **A06 Vulnerable Components** | Supply chain or npm package compromise | Continuous automated dependency audits in CI via Dependabot |
| **A07 Auth Failures** | Session hijacking or credential theft | HttpOnly SameSite cookies and modern password hashing |
| **A08 Data Integrity Failures** | Forged subscription payments | Cryptographic verification of Stripe webhook signatures |
| **A09 Logging Failures** | Undetected intrusion persisting for months | Centralized security error logging without logging PII |
| **A10 SSRF** | Internal cloud metadata service probing | Strict URL validation and host allowlisting on external fetch calls |

---

## 2. Testing Broken Access Control (A01:2021)

Broken Access Control represents the single most prevalent vulnerability in multi-tenant SaaS platforms. In modern web apps, this appears as IDOR (Insecure Direct Object Reference) flaws where an authenticated user requests records belonging to another tenant.

### Two-Account Verification Method

1. Create Account A and Account B within distinct workspaces.
2. Log in with Account A, locate a private resource ID (such as `invoice_982`).
3. Send an API request targeting `invoice_982` using the session cookie or bearer token of Account B.
4. If the server returns HTTP 200 OK with payload data, multi-tenant isolation has failed.

### Server-Side Tenant Validation (Next.js Server Action)

```typescript
// Vulnerable: trusts the client-provided ID without asserting ownership
export async function getInvoice(id: string) {
  return db.invoice.findUnique({ where: { id } });
}

// Secure: enforces tenant isolation based on authenticated session context
export async function getInvoice(id: string) {
  const session = await getSession();
  return db.invoice.findFirst({
    where: { id, organizationId: session.orgId }
  });
}
```

---

## 3. Cryptographic and Header Hardening (A02:2021 & A05:2021)

Ensure your production application enforces TLS via Strict-Transport-Security and injects defensive HTTP response headers.

```typescript
// next.config.ts: Enforcing OWASP-recommended HTTP security headers
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
];
```

---

## 4. Webhook Integrity and Payment Verification (A08:2021)

Payment fulfillment routes must verify cryptographic signatures before processing state changes to prevent forged subscription events.

```typescript
// Cryptographic Stripe webhook signature verification
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    return new Response(JSON.stringify({ received: true }));
  } catch (err) {
    return new Response("Invalid webhook signature", { status: 400 });
  }
}
```

---

## Resources

- [Official Letter of Attestation Template](../../templates/LETTER_OF_ATTESTATION_TEMPLATE.md)
- [B2B Security Questionnaire Master Answers](../../templates/B2B_SECURITY_QUESTIONNAIRE_ANSWERS.md)
- [Manual Security Audit vs Automated Scanner](./manual-audit-vs-automated-scanner.md)
- [Validra Security Review Scope](https://validra.dev/en/pricing)
