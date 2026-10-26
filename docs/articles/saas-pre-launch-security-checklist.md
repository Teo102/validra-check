# SaaS Security Checklist: 10 Technical Checks Every Founder Must Run Before Launch

*Téo Brondel · October 2026 · ~10 min read*

> Canonical online version available at [https://validra.dev/en/articles/saas-pre-launch-security-checklist](https://validra.dev/en/articles/saas-pre-launch-security-checklist) and in French at [https://validra.dev/fr/articles/saas-pre-launch-security-checklist](https://validra.dev/fr/articles/saas-pre-launch-security-checklist).

---

## 1. The 10-Point Pre-Launch SaaS Security Matrix

| Security Domain | Mandatory Technical Control | Failure Impact | Verification Test / Command |
| :--- | :--- | :--- | :--- |
| **1. Data & RLS** | Enable Row-Level Security on 100% of public database tables | Total database leak via public REST API | SQL query against pg_tables |
| **2. Client Secrets** | Ban private keys (Stripe, OpenAI) from client bundles | Drained API credits and hijacked billing | Client bundle inspection and npx validra-check |
| **3. Authentication** | Argon2id or bcrypt hashing with httpOnly cookies | Session hijacking via XSS injection | Inspect Set-Cookie response headers |
| **4. IDOR Authorization** | Filter by session tenant_id on every Server Action | Cross-tenant document theft | Manual two-account test harness |
| **5. Rate Limiting** | Strict rate limits on login and password reset routes | Automated credential stuffing attacks | 100-request curl benchmark |
| **6. Payment Webhooks** | Verify cryptographic Stripe webhook signatures | Spoofed subscriptions and free service access | stripe.webhooks.constructEvent |
| **7. Object Storage** | Private-by-default S3 and Supabase storage buckets | Anonymous public document downloads | Direct unauthenticated HTTP request |
| **8. HTTP Headers** | Enforce HSTS, CSP, and X-Content-Type-Options | Traffic sniffing and MIME confusion | curl -I on your production domain |
| **9. Input Validation** | Strict server-side schema validation using Zod | Injection of corrupted or unexpected payloads | Zod schemas on all mutation routes |
| **10. Backups & DR** | Automated daily encrypted snapshots with tested restore | Irreversible database loss upon failure | Staging restore drill |

---

## 2. Row-Level Security Verification Query

Run this query directly against your Supabase or PostgreSQL SQL console:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false;
```

If any application table returns with `rowsecurity = false`, anyone with your public anon API key can query and extract all records from that table.

---

## 3. Stripe Webhook Signature Verification Pattern (Next.js)

```typescript
import { headers } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

---

## 4. Run the Open-Source Verification Scanner

```bash
npx validra-check https://your-app.com
```

---

## Resources

- [SaaS Security Questionnaire Guide](saas-security-questionnaire-guide.md)
- [How Much Does a SaaS Security Audit Cost in 2026?](saas-security-audit-cost.md)
- [Validra Security Review](https://validra.dev/en/pricing)
