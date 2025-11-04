# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of this project seriously. If you discover a security vulnerability, please follow these steps:

### Do NOT

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it has been addressed

### Do

1. **Email the maintainer** at security@example.com with:
   - A description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Any suggested fixes (optional)

2. **Wait for acknowledgment** - We aim to respond within 48 hours

3. **Coordinate disclosure** - We will work with you to understand and address the issue

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Status Updates**: Regular updates on the progress
- **Resolution**: Depends on severity and complexity
- **Credit**: We will credit you in the security advisory (unless you prefer to remain anonymous)

## Security Best Practices

### For Contributors

- Never commit sensitive data (API keys, passwords, tokens, OAuth credentials)
- Use environment variables for configuration
- Follow secure coding practices
- Keep dependencies up to date
- Run security audits regularly:
  ```bash
  npm audit
  npm audit fix
  ```

### For Users

- Keep the extension updated to the latest version
- Review extension permissions before installation
- Use strong, unique passwords for YouTube accounts
- Protect your Google OAuth credentials
- Be cautious about granting extension permissions
- Review chrome extension policies regularly

## Known Security Considerations

### Chrome Extension Permissions

This extension requires specific permissions for functionality:

**Critical Permissions:**
- `activeTab` - Access current tab for content script execution
- `storage` - Store user preferences and cached data
- `scripting` - Inject and execute scripts in YouTube pages
- `cookies` - Access authentication cookies for API requests
- `identity` - OAuth 2.0 authentication with Google

**Host Permissions:**
- `https://music.youtube.com/*` - YouTube Music service
- `https://www.youtube.com/*` - YouTube main service
- `https://www.googleapis.com/*` - Google API access

**Risk Mitigation:**
- Permissions are limited to necessary scopes only
- No excessive host permissions requested
- All scripts run with Content Security Policy restrictions
- User consent is required for sensitive operations

### YouTube Music InnerTube API Authentication

This extension accesses YouTube Music through the InnerTube API:

- **SAPISID Authentication**: Uses HTTP-only cookies for secure authentication
- **No OAuth Client Secrets**: Client ID only is used (safe to expose)
- **Session Management**: Relies on browser session cookies
- **API Key**: API key is not required for InnerTube access

**Security Measures:**
- Credentials are never stored in extension storage
- All API requests use HTTPS
- Requests include proper User-Agent headers
- API responses are validated before processing

### OAuth 2.0 Security (YouTube Data API v3)

When using YouTube Data API v3 for extended functionality:

- **Redirect URIs**: Must be explicitly registered in Google Console
- **State Parameter**: Used to prevent CSRF attacks
- **Token Storage**: Access tokens are stored in chrome.storage
- **Token Refresh**: Refresh tokens are securely managed
- **Client ID**: Keep client ID configuration in manifest.json (non-sensitive)

**Token Security:**
- Never hardcode OAuth client secrets in code
- Store tokens using Chrome's secure storage
- Implement token refresh mechanisms
- Clear tokens on logout or permission revocation

### Content Security Policy

The extension enforces strict CSP:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

- Only allows scripts from the extension itself
- Prevents inline script execution
- Prevents external script injection
- Disallows object/embed resources

### Data Privacy

- No user data is sent to third-party servers (except Google APIs)
- Playlists are created directly to user's YouTube account
- Cached data is stored locally in chrome.storage
- All data transmission uses HTTPS

### Development Security

- Use separate API credentials for development and production
- Never commit credentials to version control
- Review manifest.json changes carefully
- Test permissions thoroughly before release
- Keep manifest version updated

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed. Users will be notified through:

- GitHub Security Advisories
- Chrome Web Store release notes
- Extension update notifications
- Email notifications (for critical issues)

## Responsible Disclosure

We practice responsible disclosure:
- Vulnerabilities are fixed before public disclosure
- We provide credit to security researchers
- We coordinate with affected parties
- We release security advisories when appropriate

## Contact

For security concerns, please contact:
- Email: security@example.com
- GitHub: @charg

For general questions, please use GitHub issues instead.

---

Thank you for helping keep this project secure!
