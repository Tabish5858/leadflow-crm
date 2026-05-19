# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest release | ✅ |
| Previous release | ✅ |
| Older versions | ❌ |

## Reporting a Vulnerability

We take the security of LeadFlow seriously. If you discover a security vulnerability, please follow these steps:

1. **DO NOT** open a public issue
2. Email us at **[security@leadflow.app](mailto:security@leadflow.app)** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. We will acknowledge receipt within **48 hours**
4. We will provide a detailed response within **7 days**
5. We will work on a fix and coordinate disclosure

## Security Best Practices for Contributors

- Never commit secrets, API keys, or credentials
- Use environment variables for all sensitive configuration
- Keep dependencies up to date (`npm audit` regularly)
- Validate all user inputs with Zod schemas
- Follow Firestore security rules as defined in the PRD
- Use parameterized queries — never concatenate user input into queries

## Responsible Disclosure

We appreciate responsible disclosure and will credit reporters in our release notes (unless anonymity is requested).
