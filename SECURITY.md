# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of CodeCollab seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please DO NOT:

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it has been addressed
- Exploit the vulnerability beyond what is necessary to demonstrate it

### Please DO:

1. **Use GitHub Security Advisories** (Preferred): [Report via GitHub](https://github.com/mystichronicle/CodeCollab/security/advisories/new)
2. **Or Email**: Contact the repository maintainers directly

### Include the Following Information:

- Type of vulnerability (e.g., SQL injection, XSS, log injection, authentication bypass)
- Full paths of affected source files
- Location of the affected code (tag/branch/commit)
- Step-by-step instructions to reproduce the vulnerability
- Proof-of-concept or exploit code (if possible)
- Impact assessment
- Suggested fix (if you have one)

### Expected Response Timeline:

- **Initial Response:** Within 48 hours
- **Triage:** Within 5 business days
- **Fix Development:** Depends on severity (see below)
- **Public Disclosure:** After patch is released (coordinated disclosure)

### Severity Levels

We use the Common Vulnerability Scoring System (CVSS) to assess severity:

- **Critical (9.0-10.0)**: Immediate fix required
- **High (7.0-8.9)**: Fix within 7 days
- **Medium (4.0-6.9)**: Fix within 30 days
- **Low (0.1-3.9)**: Fix in next release cycle

## Current Security Measures

### ✅ Implemented:

**Authentication & Authorization:**
- JWT-based authentication with secure token management
- Role-based access control (RBAC)
- Bcrypt password hashing with salt
- Secure session management

**Input Validation & Protection:**
- All user inputs validated and sanitized
- Log injection prevention (newline/carriage return sanitization)
- MongoDB ODM (prevents NoSQL injection)
- XSS protection in frontend rendering
- CORS protection

**Code Execution Security:**
- Sandboxed execution in isolated Docker containers
- Resource constraints (CPU, memory limits)
- Timeout protection for long-running code
- No network access for executed code
- Temporary file cleanup after execution
- Supports 11 programming languages securely

**Data Protection:**
- Environment variable management for sensitive data
- Database connection encryption
- Secure credential storage

**Automated Security:**
- CodeQL automated code scanning
- Dependabot dependency updates
- GitHub secret scanning in CI
- Docker security scanning

### ⚠️ Planned/In Progress:

- API rate limiting
- Two-factor authentication (2FA)
- Enhanced session management
- Security headers (HSTS, CSP, X-Frame-Options)
- HTTPS enforcement in production
- Enhanced audit logging
- Regular penetration testing

## Security Best Practices for Contributors

### Code Review Requirements

- All code changes require review by at least one maintainer
- Security-sensitive changes require review by a security-focused maintainer
- Automated security scans (CodeQL) must pass before merging

### Secure Coding Guidelines

**1. Input Validation:**
- Validate and sanitize ALL user inputs
- Use parameterized queries (we use MongoDB ODM)
- Implement strict type checking
- Assume all user input is malicious

**2. Authentication & Authorization:**
- Use JWT tokens with appropriate expiration
- Implement proper password hashing (bcrypt with salt)
- Enforce role-based access control (RBAC)
- Follow principle of least privilege

**3. Data Protection:**
- Never log sensitive information (passwords, tokens, PII)
- Encrypt sensitive data at rest
- Use HTTPS/TLS for all communications in production
- Sanitize all log messages to prevent log injection

**4. Dependency Management:**
- Keep dependencies up to date
- Review Dependabot alerts weekly
- Use `npm audit`, `cargo audit`, `safety` for vulnerability scanning
- Avoid dependencies with known vulnerabilities

**5. Secrets Management:**
- NEVER commit secrets to version control
- Use environment variables for sensitive configuration
- Rotate secrets regularly
- Use `.gitignore` to exclude sensitive files

### Security Testing Checklist

Before submitting a PR, ensure:

- [ ] No hardcoded credentials or API keys
- [ ] All inputs are validated and sanitized
- [ ] Authentication and authorization work correctly
- [ ] No sensitive data in logs or error messages
- [ ] Dependencies are up to date and vulnerability-free
- [ ] CI security scans pass (CodeQL)

## Recent Security Fixes

### 2025-11-09: Log Injection Vulnerabilities (High Severity)

Fixed 4 high-severity log injection vulnerabilities in API Gateway:

- **Issue:** Unsanitized username and session_id parameters in logging allowed log forging
- **Fix:** Sanitized newline (`\n`) and carriage return (`\r`) characters before logging
- **Affected Files:**
  - `services/api-gateway/app/api/v1/sessions.py`
  - `services/api-gateway/app/api/v1/users.py`
- **CodeQL Alerts:** #137, #138, #139, #140
- **Status:** ✅ Fixed and deployed

## Known Security Considerations

### Development Environment

⚠️ **Note:** Development mode has relaxed security for ease of development:

- Uses HTTP instead of HTTPS
- Debug logging may expose sensitive information
- CORS configured for local development
- Detailed error messages displayed

### Production Recommendations

Before deploying to production:

1. ✅ Enable HTTPS with valid SSL certificates
2. ✅ Configure strict CORS policies
3. ✅ Use production-grade secret management (e.g., HashiCorp Vault, AWS Secrets Manager)
4. ✅ Enable API rate limiting
5. ✅ Set up proper logging and monitoring (without sensitive data)
6. ✅ Disable debug mode and detailed error messages
7. ✅ Implement DDoS protection
8. ✅ Regular security audits and penetration testing
9. ✅ Use a Web Application Firewall (WAF)

### Sandboxed Code Execution

**Important:** While we implement multiple security layers, executing untrusted user code always carries inherent risks:

- Rust-based execution service with strict timeout limits
- Resource constraints (CPU, memory) enforced per execution
- Network isolation for executed code
- Temporary file cleanup after execution
- Support for 11 programming languages in isolated environments

**Recommendation:** Deploy in controlled environments with proper monitoring.

## Vulnerability Disclosure Timeline

1. **Day 0:** Vulnerability reported privately
2. **Day 0-2:** Acknowledgment sent to reporter
3. **Day 0-7:** Vulnerability triaged and severity assessed
4. **Day 7-30:** Fix developed and tested (varies by severity)
5. **Day 30:** Security advisory published, patch released
6. **Day 37:** Public disclosure (7 days after patch release)

## Security Tools

We use the following tools to maintain security:

- **CodeQL**: Automated semantic code analysis for vulnerabilities
- **Dependabot**: Automated dependency updates and security alerts
- **Docker Security Scanning**: Container image vulnerability scanning
- **GitHub Secret Scanning**: Prevents credential leaks in commits
- **npm audit / cargo audit / safety**: Package vulnerability scanning

## Bug Bounty Program

Currently, we do not have a formal bug bounty program. However, we greatly appreciate security researchers who responsibly disclose vulnerabilities and will:

- Acknowledge your contribution in release notes (with your permission)
- List you in our Security Hall of Fame
- Consider establishing a bug bounty program as the project grows

## Contact

For security concerns, please contact:

- **GitHub Security Advisories:** [Report Here](https://github.com/mystichronicle/CodeCollab/security/advisories/new) (Preferred)
- **Email:** Repository maintainers via GitHub

## Security Hall of Fame

We thank the following security researchers who have responsibly disclosed vulnerabilities:

- *(To be added as vulnerabilities are reported and fixed)*

---

**Last Updated:** November 9, 2025
