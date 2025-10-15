# Security Checklist for CodeRevAI

## ✅ Files Properly Gitignored

All sensitive data files are excluded from version control via `.gitignore`:

### Environment Variables
- ✅ `.env`
- ✅ `.env.local`
- ✅ `.env.development.local`
- ✅ `.env.test.local`
- ✅ `.env.production.local`
- ✅ `.env*.local` (all variations)

### Certificates and Keys
- ✅ `*.pem` (Private keys)
- ✅ `*.key` (Key files)
- ✅ `*.cert` (Certificates)
- ✅ `*.crt` (Certificate files)

### Credentials
- ✅ `secrets/` directory
- ✅ `secret.json`
- ✅ `credentials.json`
- ✅ `serviceAccountKey.json`

### Zone Identifier Files
- ✅ `*.Zone.Identifier` (Windows WSL artifacts)

## 🔐 Sensitive Files in This Project

### Current Sensitive Files (DO NOT COMMIT)
1. **`.env.local`** - Contains all API keys and secrets
   - Gemini API Key
   - Clerk Authentication Keys
   - Stripe API Keys
   - Webhook Secrets

### Safe to Commit
1. **`.env.example`** - Template without actual secrets ✅
2. **`setup-secrets.sh`** - Script to configure secrets (no secrets inside) ✅
3. **`deploy.sh`** - Deployment script (no secrets inside) ✅

## 🚨 Before Committing Code

### Pre-Commit Checklist

```bash
# 1. Verify .env.local is gitignored
git status | grep -q ".env.local" && echo "⚠️  WARNING: .env.local is being tracked!" || echo "✅ .env.local is properly ignored"

# 2. Check for accidentally staged secrets
git diff --cached | grep -i "api[_-]key\|secret\|password\|token" && echo "⚠️  WARNING: Possible secrets in staged changes!" || echo "✅ No obvious secrets found"

# 3. Search for hardcoded API keys in code
grep -r "AIzaSy" --include="*.ts" --include="*.tsx" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v ".next" && echo "⚠️  WARNING: Possible Gemini API key found!" || echo "✅ No hardcoded Gemini keys"
grep -r "pk_live\|sk_live\|pk_test\|sk_test" --include="*.ts" --include="*.tsx" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v ".next" && echo "⚠️  WARNING: Possible Stripe key found!" || echo "✅ No hardcoded Stripe keys"
grep -r "whsec_" --include="*.ts" --include="*.tsx" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v ".next" && echo "⚠️  WARNING: Possible webhook secret found!" || echo "✅ No hardcoded webhook secrets"
```

## 🔍 If Secrets Were Accidentally Committed

If you've already committed secrets to git, follow these steps:

### 1. Remove from Current Commit
```bash
# Remove file from staging
git reset HEAD .env.local

# Or amend last commit
git commit --amend
```

### 2. Remove from History (if pushed)
```bash
# Using git-filter-repo (recommended)
git filter-repo --path .env.local --invert-paths

# Or using BFG Repo-Cleaner
bfg --delete-files .env.local

# Force push (⚠️ Be careful!)
git push origin --force --all
```

### 3. Rotate All Compromised Secrets
- **Gemini API Key**: Create new key at https://aistudio.google.com/app/apikey
- **Clerk Keys**: Rotate in https://dashboard.clerk.com/
- **Stripe Keys**: Rotate in https://dashboard.stripe.com/
- **Update** `.env.local` with new keys
- **Update** Google Cloud Secret Manager if deployed

## 🛡️ Security Best Practices

### For Development
1. ✅ Never hardcode API keys in source code
2. ✅ Use environment variables for all secrets
3. ✅ Keep `.env.local` out of version control
4. ✅ Use `.env.example` as a template for team members
5. ✅ Add secrets to `.gitignore` before initializing git

### For Production (Cloud Run)
1. ✅ Use Google Cloud Secret Manager (not environment variables)
2. ✅ Enable VPC Service Controls for additional security
3. ✅ Restrict IAM permissions (principle of least privilege)
4. ✅ Enable Cloud Armor for DDoS protection
5. ✅ Monitor secret access with Cloud Audit Logs

### For Team Collaboration
1. Share `.env.example` file (no actual secrets)
2. Document how to obtain API keys
3. Use separate keys for each developer (if possible)
4. Never send secrets via email/Slack
5. Use secure secret sharing tools (1Password, LastPass, etc.)

## 📋 Environment Variable Security Levels

| Variable | Security Level | Exposed to Browser? | Git Safe? |
|----------|----------------|---------------------|-----------|
| `NEXT_PUBLIC_GEMINI_API_KEY` | ⚠️ Medium | Yes (NEXT_PUBLIC_*) | ❌ No |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Low | Yes (Public key) | ⚠️ Caution |
| `CLERK_SECRET_KEY` | 🔴 High | No | ❌ No |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ Low | Yes (Public key) | ⚠️ Caution |
| `STRIPE_SECRET_KEY` | 🔴 High | No | ❌ No |
| `STRIPE_WEBHOOK_SECRET` | 🔴 High | No | ❌ No |

**Note:** Even "public" keys should not be committed to version control as a best practice.

## 🔐 API Key Security

### If API Key is Exposed
1. **Immediately revoke** the exposed key
2. **Generate new key** from the provider
3. **Update** `.env.local` and Secret Manager
4. **Redeploy** application
5. **Monitor** for unauthorized usage

### Stripe Specific
- Use test keys (`pk_test_`, `sk_test_`) for development
- Use live keys (`pk_live_`, `sk_live_`) only in production
- Enable Stripe Dashboard notifications for suspicious activity

### Clerk Specific
- Publishable keys are safe to expose (but still avoid it)
- Secret keys must NEVER be exposed to browser/frontend
- Rotate keys if compromised

## 🎯 Quick Security Audit

Run this command before committing:

```bash
# Check for common secrets in staged files
git diff --cached | grep -E "(api[_-]?key|secret|password|token|private[_-]?key)" -i
```

## 📚 Additional Resources

- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Stripe Security](https://stripe.com/docs/security)
- [Clerk Security](https://clerk.com/docs/security)

---

**Remember:** Security is not a one-time setup, it's an ongoing practice! 🔐
