# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Craftus, please report it responsibly:

1. **DO NOT** open a public GitHub issue
2. Email security concerns to: [your-email@example.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and provide a timeline for fixes.

## Known Security Considerations

### Client-Side API Key Exposure

⚠️ **Current Limitation**: The Gemini API key is embedded in the client-side bundle and can be extracted by users.

**Mitigation Steps**:
- Rate limiting implemented client-side (not a security control)
- API key should be rotated regularly
- Monitor API usage for anomalies

**Recommended Production Architecture**:
```
User → Frontend → Backend API → Gemini API
                  (API key stored here)
```

### LocalStorage Security

- Projects are stored in browser LocalStorage (unencrypted)
- Vulnerable to XSS attacks
- No server-side backup
- Cleared when browser data is cleared

**Mitigations**:
- Input sanitization implemented
- CSP headers configured
- Data validation on load

### Third-Party Dependencies

- TailwindCSS loaded from CDN (potential supply chain risk)
- React Flow library (regularly updated)
- Gemini SDK (official Google library)

**Mitigations**:
- Consider self-hosting TailwindCSS
- Implement Subresource Integrity (SRI) checks
- Regular dependency audits with `npm audit`

## Security Best Practices for Users

1. **Don't share sensitive information** in craft prompts
2. **Use unique API keys** per environment
3. **Rotate API keys** regularly
4. **Monitor API usage** in Google Cloud Console
5. **Clear browser data** when using shared computers

## Security Features Implemented

- ✅ Input sanitization and validation
- ✅ XSS prevention (URL sanitization)
- ✅ Content Security Policy headers
- ✅ Rate limiting (client-side)
- ✅ Secure error handling
- ✅ Data size limits
- ✅ Soft delete with recovery

## Security Features Planned

- ⏳ Backend API proxy
- ⏳ User authentication
- ⏳ Server-side rate limiting
- ⏳ Audit logging
- ⏳ Data encryption at rest
- ⏳ CAPTCHA for abuse prevention

## Compliance

This is a hackathon/MVP project and is NOT compliant with:
- GDPR (no data processing agreements)
- HIPAA (not for healthcare data)
- PCI DSS (no payment processing)
- SOC 2 (no formal security controls)

**Do not use for**:
- Storing personal information
- Healthcare-related projects
- Financial data
- Any regulated industry use case

## Security Audit History

| Date | Auditor | Findings | Status |
|------|---------|----------|--------|
| 2024-11-23 | Internal | 8 findings (1 Critical, 2 High, 3 Medium, 2 Low) | Remediated |
| 2024-11-23 | Kiro AI | 10 findings (3 Critical, 4 High, 2 Medium, 1 Low) | In Progress |

### Latest Audit Findings (2024-11-23)

**Critical Issues:**
1. API Key Exposure - Client-side bundle contains Gemini API key (Documented, requires backend)
2. XSS Vulnerabilities - User input sanitization implemented in utils/security.ts
3. LocalStorage Injection - Validation added in utils/validation.ts

**High Priority:**
4. Missing CSP Headers - Needs implementation in index.html
5. Insufficient Input Validation - Validation utilities created
6. Missing Rate Limiting - Needs implementation
7. Insecure Image URL Handling - Sanitization implemented in utils/security.ts

**Medium Priority:**
8. TypeScript Type Safety - @types/react installed, remaining 'any' types need fixing
9. Error Information Disclosure - Needs error sanitization utility

**Low Priority:**
10. Missing HTTPS Enforcement - Needs vite.config.ts update

## Contact

For security questions: [your-email@example.com]
For general questions: [GitHub Issues](https://github.com/yourusername/craftus/issues)
