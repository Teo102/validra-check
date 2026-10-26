# How to Answer SaaS Security Questionnaires (VSAQ, CAIQ, B2B Vendor Due Diligence)

*Téo Brondel · October 2026 · ~8 min read*

> Canonical online version available at [https://validra.dev/en/articles/saas-security-questionnaire-guide](https://validra.dev/en/articles/saas-security-questionnaire-guide) and in French at [https://validra.dev/fr/articles/saas-security-questionnaire-guide](https://validra.dev/fr/articles/saas-security-questionnaire-guide).

---

## 1. Why Enterprise Buyers Impose Security Questionnaires

When a SaaS startup begins selling to mid-market companies or enterprise accounts, the procurement cycle hits an inevitable step known as the vendor security review.

Procurement departments and Chief Information Security Officers (CISOs) require vendors to fill out comprehensive questionnaires such as Google VSAQ, CSA CAIQ, SIG Lite, or custom 150-question Excel spreadsheets.

The primary motivation is risk transfer and regulatory compliance. Under the GDPR, HIPAA, and emerging regulations like NIS2, enterprises bear legal responsibility for the vendors they integrate into their technology stack.

Checking "Yes" to questions without technical evidence creates major legal exposure if an incident occurs. Answering "No" or leaving vague answers causes deals to stall indefinitely. 

Providing a signed independent Letter of Attestation confirms that your application has undergone an external security review, enabling procurement to approve the software without requiring a 30,000 USD SOC 2 Type II audit.

| Standard Format | Typical Issuer | Average Length | Key Verification Needed |
| :--- | :--- | :--- | :--- |
| **Google VSAQ** | Tech scale-ups and modern buyers | 40 to 100 questions | External application review attestation |
| **CSA CAIQ** | Enterprise cloud customers | 150 to 250 questions | Multi-tenant isolation and encryption proofs |
| **SIG Lite** | Financial institutions and banks | 100 to 150 questions | Signed annual pentest attestation |
| **Custom Procurement Excel** | Corporate risk teams and CISOs | 50 to 200 questions | Third-party letter and remediation retest |

---

## 2. The Winning Response Methodology: Affirmation, Evidence, Limitation

Enterprise security teams review dozens of vendor files every week. Most responses are rejected for two reasons: generic marketing claims ("our servers are on AWS so everything is secure") or unverified statements.

To build trust, structure every technical response using the three-part framework:

1. **Affirmation:** A direct and unequivocal statement confirming whether the specific control is implemented.
2. **Evidence:** Concrete technical mechanisms, cryptographic standards, and third-party audit references that validate the statement.
3. **Limitation:** Clear disclosure of operational boundaries, proving that the engineering team understands system constraints instead of making impossible promises.

---

## 3. Seven Technical Pillars and Concrete Answers

### 1. Cloud Infrastructure and Hosting
- **Claim:** All production workloads run in enterprise-grade certified facilities.
- **Evidence:** Infrastructure is deployed on AWS / Supabase in the Paris region (`eu-west-3`), inheriting SOC 2 Type II and ISO 27001 physical security controls.
- **Limitation:** Physical security is managed by the cloud provider under the shared responsibility model.

### 2. Identity and Access Management (IAM & MFA)
- **Claim:** Production access is restricted using mandatory multi-factor authentication and role-based policies.
- **Evidence:** Administrative dashboards require hardware security keys or TOTP authentication. User session tokens are delivered via encrypted httpOnly cookies with `SameSite=Strict`.
- **Limitation:** Employee access follows least privilege principles, but internal access does not currently integrate enterprise SAML Okta directories.

### 3. Application Security Testing and Pentesting
- **Claim:** The application undergoes regular human-led security reviews and continuous automated testing.
- **Evidence:** Independent application security testing is conducted by Validra ([https://validra.dev](https://validra.dev)). The review validates multi-tenant isolation, OWASP Top 10 vulnerabilities, and Row-Level Security policies. A signed Letter of Attestation confirms that all high and critical issues were remediated.
- **Limitation:** Pentest scope covers custom application code and API endpoints rather than hyperscale provider network hardware.

### 4. Multi-Tenant Data Isolation
- **Claim:** Tenant data is strictly isolated at the database level.
- **Evidence:** PostgreSQL Row-Level Security (RLS) policies enforce organization separation on every query (`tenant_id = auth.jwt()->>'org_id'`). Integration tests verify that cross-tenant access returns 403 Forbidden.
- **Limitation:** Data resides on shared multi-tenant database clusters rather than isolated single-tenant database instances.

### 5. Backups and Business Continuity (RTO & RPO)
- **Claim:** Automated daily backups and multi-zone redundancy are active in production.
- **Evidence:** Automated point-in-time recovery is maintained with a 7-day retention period. Recovery Point Objective (RPO) is under 1 hour, and Recovery Time Objective (RTO) is under 4 hours.
- **Limitation:** Point-in-time recovery operates within a single geographic cloud region.

### 6. Incident Response and Breach Notification
- **Claim:** A formal incident response plan guarantees prompt notification.
- **Evidence:** Verified data breaches trigger containment within 4 hours, and affected customers are notified in writing within 72 hours in compliance with GDPR Article 33.
- **Limitation:** Investigations rely on application logs and cloud provider telemetry rather than a 24/7 dedicated Security Operations Center.

### 7. AI Model Privacy and Data Usage
- **Claim:** Customer proprietary data is never used to train foundation models.
- **Evidence:** All LLM integrations utilize enterprise API tiers with explicit zero-retention and zero-training guarantees.
- **Limitation:** Model inference calls external API providers over encrypted TLS connections rather than executing on local on-premise hardware.

---

## 4. The Role of the Signed Letter of Attestation

Enterprise prospects frequently ask for your penetration test report. Sending your full technical report is dangerous because it discloses exact vulnerability details and code reproduction steps.

The accepted industry standard is providing a **Signed Letter of Attestation**. This executive document confirms:

- The exact application scope and URL audited.
- The standard methodology used (OWASP Top 10 and multi-tenant isolation checks).
- An explicit retest confirmation stating that all identified critical and high findings were remediated.

Validra provides this official signed letter with every Security Review (from 395 EUR, completed in approximately 5 business days).

For ready-to-use templates:
- [Letter of Attestation Template](../../templates/LETTER_OF_ATTESTATION_TEMPLATE.md)
- [B2B Security Questionnaire Master Answers](../../templates/B2B_SECURITY_QUESTIONNAIRE_ANSWERS.md)
