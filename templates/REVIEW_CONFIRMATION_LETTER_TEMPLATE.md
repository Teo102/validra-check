# Review confirmation letter: template

A short letter that confirms a security review took place, without exposing the technical report. Fill in the brackets only with what is true. If a field does not apply, delete the line rather than guess.

**What this letter is not.** It is not a certification (such as SOC 2 or ISO 27001), not a compliance audit, and not a guarantee that an application has no other vulnerability. Each buyer decides what it accepts as evidence, and some will require a certification regardless.

---

# SECURITY REVIEW CONFIRMATION LETTER
(This document is neither a certification nor a guarantee. See section 4.)

Issued by: [Reviewer name and company]
For: [Company name], product [Product name]
Date of this letter: [date]

## 1. What was reviewed
- Review period: [date] to [date]
- Scope agreed with the client: [web app, API, database access rules, storage...]
- Access used: [read-only repository, test environment, test accounts]

## 2. How
- Code review where source was available and targeted manual testing of the running application, using a method aligned with the OWASP Top 10
- Each finding is rated by severity and by certainty (observation, weakness, demonstrated vulnerability)

## 3. Result
- Findings: [N] in total ([n] critical, [n] high, [n] medium, [n] low)
- Status at retest on [date]: [n] fixed, [n] partially fixed, [n] open
- Open items are listed in the full report, which stays confidential

## 4. Limits
- This letter confirms that a review was carried out on the dates and scope above. It describes the situation at that time only.
- It is not a certification (such as SOC 2 or ISO 27001), not a compliance audit, and not a guarantee that no other vulnerabilities exist.
- Anything outside the agreed scope was not reviewed.

Done at [city], on [date]
[Name], [company]
