# Manual Security Review vs Automated Scanners: Why Scanners Miss SaaS Authorization Flaws

*Téo Brondel · October 2026 · ~10 min read*

> Canonical online version available at [https://validra.dev/en/articles/manual-audit-vs-automated-scanner](https://validra.dev/en/articles/manual-audit-vs-automated-scanner) and in French at [https://validra.dev/fr/articles/manual-audit-vs-automated-scanner](https://validra.dev/fr/articles/manual-audit-vs-automated-scanner).

---

## 1. The 5 Structural Reasons Automated Scanners Miss SaaS Business Logic Flaws

1. **The Exploited Requests Are Technically Valid:** An IDOR or BOLA request contains clean, parameterized types and valid tokens. The server returns HTTP 200 OK. Scanners flag zero anomalies.
2. **Scanners Lack Context of Intended Resource Ownership:** Changing `/invoices/1042` to `/invoices/1043` returns valid JSON. Without business context, scanners cannot know the record belongs to another customer.
3. **Inability to Track Multi-Step Workflows:** Automated tools fuzz single endpoints. They cannot discover workflow skips, such as bypassing a payment step to trigger fulfillment.
4. **Blind Trust in Client-Side Parameters:** Modifying hidden prices or user role parameters in unsigned payloads goes unnoticed by generic linters.
5. **Domain-Specific Multi-Tenant Rules:** Proprietary data models require human semantic reasoning to test cross-tenant boundaries.

---

## 2. Tool Family Comparison Matrix

| Security Check | SCA Linters (Snyk, Dependabot) | Static SAST (SonarQube) | Dynamic DAST (OWASP ZAP) | Validra Manual Security Review |
| :--- | :---: | :---: | :---: | :---: |
| Known CVEs in npm dependencies | ✅ Detects | ⚠️ Partial | ❌ Blind | ✅ Covered |
| Cross-tenant data isolation | ❌ Blind | ❌ Blind | ❌ Blind | ✅ Verified via two-account offensive tests |
| Supabase RLS bypass detection | ❌ Blind | ❌ Blind | ❌ Blind | ✅ Deep inspection of SQL policies & Server Actions |
| Stripe webhook tampering & replay | ❌ Blind | ❌ Blind | ❌ Not tested | ✅ Tested with tampered signatures & payload replays |
| Client-side secret exposure | ❌ Blind | ⚠️ Basic regex | ❌ Not tested | ✅ In-depth inspection of production bundle chunks |
| False positive noise | ⚠️ High | ⚠️ High on dead code | ⚠️ High | 0 false positives because every flaw is proven |
| Buyer Due Diligence deliverable | ❌ Rejected | ❌ Rejected | ❌ Rejected | ✅ Report + review confirmation letter |

---

## 3. Code Example: Passes All Scanners with 0 Warnings, Yet Leaks All Data

```typescript
// Snyk, SonarQube, and GitHub Dependabot report 0 vulnerabilities here.
// Yet any authenticated user can read any competitor's invoices:
export async function getInvoice(invoiceId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  // Critical IDOR flaw: The scanner sees clean, parameterized ORM syntax,
  // but it does not enforce session tenant isolation:
  return await db.invoices.findUnique({
    where: { id: invoiceId } // Missing: organizationId: session.orgId
  });
}
```

---

## 4. Offensive Verification Test

```bash
# Query Tenant B invoice using Tenant A session token:
curl -s -X GET "https://api.your-saas.com/api/invoices/inv_tenant_b_9842" \
  -H "Authorization: Bearer $TOKEN_ACCOUNT_A"

# If server returns HTTP 200 instead of 403 Forbidden, your app has a critical IDOR flaw.
```

---

## Resources

- [How Much Does a SaaS Security Audit Cost in 2026?](saas-security-audit-cost.md)
- [SaaS Security Questionnaire Guide](saas-security-questionnaire-guide.md)
- [Validra Security Review](https://validra.dev/en/pricing)
