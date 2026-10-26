# B2B SaaS Security Questionnaire Master Answers (VSAQ, CAIQ, SIG Lite)

> **Context:** When selling your SaaS to enterprise buyers, procurement teams send questionnaires containing 50 to 200 questions. 
> 
> Most enterprise rejections happen because founders give vague one-word answers or claim their cloud provider handles everything.
> 
> Use this master template based on the **Affirmation + Evidence + Limitation** framework. You can copy and adapt these answers directly into vendor spreadsheets.
>
> Source: Validra ([https://validra.dev](https://validra.dev)).

---

## The 3-Part Answer Framework

Whenever a security questionnaire asks about a security control, structure your response in three parts:

| Element | Purpose | Example |
| :--- | :--- | :--- |
| **1. Affirmation** | Clear yes or no statement confirming whether the control exists | "Yes, customer data is strictly isolated at the database level." |
| **2. Evidence** | Exact technical mechanism and third-party verification proving the claim | "Isolation is enforced via PostgreSQL Row-Level Security on every query and verified by an external security review from Validra." |
| **3. Limitation** | Transparent operational boundary showing maturity and compliance honesty | "Tenants share the same physical database cluster through logical row isolation rather than dedicated single-tenant hardware." |

---

## 7 Core Pillars (Pre-Filled Answers for Modern Web Stacks)

### Pillar 1: Infrastructure and Cloud Hosting

**Question:** *Where is customer data hosted and how is physical security managed?*

- **Affirmation:** Yes, all application workloads and customer databases run exclusively in certified cloud datacenters.
- **Evidence:** Our production infrastructure is hosted in AWS / Supabase in the `eu-west-3` (Paris) region. The underlying datacenter facilities maintain SOC 2 Type II, ISO/IEC 27001, and PCI-DSS Level 1 compliance. Physical security and environmental controls are audited annually by independent certifying bodies.
- **Limitation:** As a cloud SaaS vendor, we do not operate physical facilities or server rooms directly. Physical security controls are inherited from our certified infrastructure provider under the shared responsibility model.

---

### Pillar 2: Access Control, IAM, and Multi-Factor Authentication

**Question:** *How do you control access to production systems and do you enforce MFA?*

- **Affirmation:** Yes, multi-factor authentication and role-based access control are enforced across all administrative and production access points.
- **Evidence:** Production infrastructure access requires hardware security keys or TOTP multi-factor authentication. Zero administrative access is allowed over unencrypted protocols. Passwords for end-users are hashed using bcrypt or Argon2id with unique salts, and session tokens are stored in secure httpOnly cookies with `SameSite=Strict` and TLS 1.3 encryption.
- **Limitation:** Team members have access granted based on the principle of least privilege, but our seed-stage team does not currently use an enterprise SAML Okta integration for internal employee management.

---

### Pillar 3: Application Security, Pentesting, and Vulnerability Management

**Question:** *Do you conduct third-party penetration testing and regular vulnerability assessments?*

- **Affirmation:** Yes, our application had an external security review and uses automated vulnerability scanning. [Adapt to what is true for your company.]
- **Evidence:** An external manual security review was carried out by Validra ([https://validra.dev](https://validra.dev)) on [date]. It covered OWASP Top 10 categories, multi-tenant isolation, and PostgreSQL Row-Level Security checks. A review confirmation letter states the fix status at retest. Automated dependency scanning runs on every pull request via GitHub Dependabot.
- **Limitation:** The review is focused on our application layer, public APIs, and database policies rather than testing the underlying hyperscale cloud provider network.

---

### Pillar 4: Multi-Tenant Data Isolation and Cryptographic Protection

**Question:** *How do you prevent Tenant A from accessing data belonging to Tenant B?*

- **Affirmation:** Yes, customer data is strictly isolated logically at the database query level.
- **Evidence:** Data isolation is enforced using PostgreSQL Row-Level Security (RLS) policies. Every database query checks the authenticated user identity and organization identifier (`tenant_id = auth.jwt()->>'org_id'`). Cross-account authorization is actively tested using automated integration tests and verified by independent grey-box testing. All data at rest is encrypted using AES-256 via provider-managed KMS, and data in transit requires TLS 1.3 with mandatory HSTS.
- **Limitation:** Customer data resides in a shared multi-tenant database schema with logical isolation rather than isolated single-tenant database instances.

---

### Pillar 5: Backups, Disaster Recovery, RTO, and RPO

**Question:** *What are your Recovery Time Objective (RTO) and Recovery Point Objective (RPO)?*

- **Affirmation:** Yes, automated daily backups and multi-availability zone failover are active in production.
- **Evidence:** Automated point-in-time database backups run continuously with a 7-day retention window. Snapshots are encrypted with AES-256 and replicated across distinct availability zones. Our defined target Recovery Point Objective (RPO) is under 1 hour, and target Recovery Time Objective (RTO) is under 4 hours. Restoration drills are conducted periodically to verify snapshot integrity.
- **Limitation:** While automated snapshots run continuously, complete regional failover across distinct geographic continents is not configured in our base deployment.

---

### Pillar 6: Incident Response and Breach Notification SLAs

**Question:** *Do you have a documented incident response plan and what is your notification timeframe?*

- **Affirmation:** Yes, we maintain a documented incident response procedure with strict legal notification commitments.
- **Evidence:** In the event of a verified security incident affecting customer data, our incident team initiates containment, forensic preservation, and remediation within 4 hours. Customers and relevant supervisory authorities are notified in writing without undue delay, and at the latest within 72 hours of becoming aware of a personal data breach, pursuant to Article 33 of the GDPR.
- **Limitation:** Forensic investigations are performed using application audit logs and cloud provider access telemetry rather than a 24/7 internal Security Operations Center (SOC).

---

### Pillar 7: AI Data Privacy and Subprocessor Management

**Question:** *Do you use customer data to train artificial intelligence or machine learning models?*

- **Affirmation:** No, customer data is never used to train public or proprietary foundation models.
- **Evidence:** All third-party AI processing agreements include zero-retention or zero-training addendums. Any LLM interaction is ephemeral and conducted through enterprise API agreements that prohibit model training on customer inputs. A public list of approved subprocessors and their processing locations is maintained in our Data Processing Addendum (DPA).
- **Limitation:** AI features pass user prompts through external enterprise LLM providers over encrypted TLS connections, rather than executing locally on on-premise hardware.

---

## Summary Checklist Before Submitting

1. Ensure every "Yes" response includes a tangible technical proof or audit reference.
2. Attach your review confirmation letter as Annex A, if you have one.
3. Attach your Data Processing Addendum (DPA) and Subprocessor List as Annex B.
4. Avoid unverified promises of future SOC 2 dates unless a formal audit window is already booked.
