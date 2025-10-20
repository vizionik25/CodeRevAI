# Migration Guide: Railway PostgreSQL → Neon

This guide will walk you through migrating your CodeRevAI database from Railway to Neon PostgreSQL.

## Overview

**Current State:**
- Railway PostgreSQL: `gondola.proxy.rlwy.net:30260` (unreliable connection)
- Database: CodeRevAI with tables: UserSubscription, ReviewHistory, ReviewFeedback, ApiUsage

**Target State:**
- Neon PostgreSQL: Serverless, reliable, optimized for modern apps
- Same schema, migrated data
- Updated connection strings

## Step 1: Create Neon Account & Project

### 1.1 Sign Up for Neon
1. Go to [console.neon.tech](https://console.neon.tech)
2. Sign up with GitHub (recommended) or email
3. Verify your account if needed

### 1.2 Create New Project
1. Click **"Create Project"**
2. Fill in project details:
   - **Project Name**: `coderevai-prod`
   - **Database Name**: `coderevai` (match your current database)
   - **Region**: Choose closest to your users (e.g., `US East (Ohio)` for better latency)
   - **PostgreSQL Version**: `16` (latest stable)
3. Click **"Create Project"**

### 1.3 Get Connection Details
After project creation, you'll see connection details:
```
Host: ep-xxxxx-xxxxx.us-east-2.aws.neon.tech
Database: coderevai
Username: coderevai_owner
Password: [generated-password]
```

## Step 2: Prepare Connection String

### 2.1 Copy the Connection String
Neon provides the connection string in this format:
```
postgresql://username:password@hostname/database?sslmode=require
```

Example:
```
postgresql://coderevai_owner:abc123xyz@ep-cool-sunset-12345678.us-east-2.aws.neon.tech/coderevai?sslmode=require
```

### 2.2 Test Connection Locally
Before proceeding, test the connection:

```bash
# Install psql if not already installed (Ubuntu/Debian)
sudo apt-get install postgresql-client

# Test connection (replace with your actual connection string)
psql "postgresql://username:password@hostname/database?sslmode=require"
```

You should see:
```
psql (14.x, server 16.x)
SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, bits: 256, compression: off)
Type "help" for help.

coderevai=>
```

Type `\q` to exit.

## Step 3: Update Environment Variables

### 3.1 Update Local Environment Files
Update both `.env` and `.env.local` with your new Neon connection string:

```bash
# .env (for Prisma CLI)
DATABASE_URL="postgresql://username:password@hostname/database?sslmode=require"

# .env.local (for Next.js)
DATABASE_URL="postgresql://username:password@hostname/database?sslmode=require"
```

### 3.2 Update Google Cloud Secrets
Update the secret in Google Cloud Secret Manager:

```bash
# Navigate to your project directory
cd /home/vizionik/CodeRevAI

# Update the DATABASE_URL secret
echo "postgresql://username:password@hostname/database?sslmode=require" | \
  gcloud secrets versions add DATABASE_URL --data-file=-

# Verify the secret was updated
gcloud secrets versions list DATABASE_URL
```

## Step 4: Initialize Database Schema

### 4.1 Push Prisma Schema to Neon
```bash
# Generate Prisma client with new connection
npx prisma generate

# Push your existing schema to the new Neon database
npx prisma db push

# Verify tables were created
npx prisma studio
```

This should create all your tables:
- `UserSubscription`
- `ReviewHistory` 
- `ReviewFeedback`
- `ApiUsage`

### 4.2 Verify Schema
Open Prisma Studio and confirm all tables exist with correct structure:
```bash
npx prisma studio
```

## Step 5: Data Migration (Optional)

### 5.1 Export Data from Railway (if accessible)
If your Railway database is still accessible, export the data:

```bash
# Export all data (replace with Railway connection string)
pg_dump "postgresql://postgres:password@gondola.proxy.rlwy.net:30260/railway" \
  --data-only --inserts > railway_data.sql
```

### 5.2 Import Data to Neon
```bash
# Import to Neon (replace with your Neon connection string)
psql "postgresql://username:password@hostname/database?sslmode=require" < railway_data.sql
```

**Note:** Since your Railway database has been unreliable, you may choose to start fresh. The retry queue will handle any lost history data.

## Step 6: Update Application Configuration

### 6.1 Test Local Connection
```bash
# Test the connection with your app
npm run dev

# Check health endpoint
curl http://localhost:3000/api/health
```

You should see:
```json
{
  "status": "healthy",
  "checks": {
    "database": {
      "status": "up",
      "latency": 150
    }
  }
}
```

### 6.2 Deploy to Production
```bash
# Build and deploy
npm run build
./scripts/deploy.sh
```

### 6.3 Verify Production Health
```bash
# Check production health
curl https://coderevai-sfd77weu7a-vp.a.run.app/api/health
```

## Step 7: Neon Configuration Optimization

### 7.1 Configure Connection Pooling
In Neon Console:
1. Go to **Settings** → **Compute**
2. Enable **Connection Pooling**
3. Set **Pool Mode**: `Transaction` (recommended for Prisma)
4. **Pool Size**: `20-30` connections

### 7.2 Set Up Autoscaling
1. Go to **Settings** → **Compute**
2. Configure **Autoscaling**:
   - **Min Compute**: `0.25 vCPU` (cost-effective)
   - **Max Compute**: `1 vCPU` (sufficient for your app)
   - **Auto-suspend**: `5 minutes` (save costs)

### 7.3 Enable Point-in-Time Recovery
1. Go to **Settings** → **Storage**
2. **Backup Retention**: `7 days` (or longer based on needs)
3. This allows restore to any point in time

## Step 8: Monitoring & Maintenance

### 8.1 Set Up Monitoring
1. In Neon Console, go to **Monitoring**
2. Set up alerts for:
   - **High CPU usage** (>80%)
   - **Connection count** (approaching limits)
   - **Storage usage** (approaching quota)

### 8.2 Connection String Security
- Never commit connection strings to Git
- Use environment variables in all environments
- Rotate passwords periodically (Neon allows easy password reset)

### 8.3 Monitor Performance
Use Neon's built-in monitoring:
- **Query Performance**: Track slow queries
- **Connection Analytics**: Monitor connection patterns
- **Resource Usage**: CPU, memory, storage trends

## Step 9: Clean Up Railway

### 9.1 Verify Migration Success
Before removing Railway:
1. Test all app functionality with Neon
2. Verify data integrity (if migrated)
3. Run tests to ensure everything works
4. Monitor for 24-48 hours

### 9.2 Remove Railway Service (Optional)
Once confident in Neon:
1. Log into Railway dashboard
2. Navigate to your PostgreSQL service
3. Delete the service to stop billing

## Troubleshooting

### Common Issues

**Connection Timeout:**
- Check if IP is whitelisted in Neon (shouldn't be needed)
- Verify SSL mode in connection string
- Ensure proper escaping of special characters in password

**Migration Errors:**
- Check PostgreSQL version compatibility
- Verify schema matches between old and new database
- Use `--force` flag with `prisma db push` if needed

**Performance Issues:**
- Enable connection pooling
- Adjust compute settings in Neon
- Review query performance in Neon console

### Support Resources
- **Neon Documentation**: [neon.tech/docs](https://neon.tech/docs)
- **Neon Discord**: Community support and real-time help
- **GitHub Issues**: For bugs or feature requests

## Expected Benefits

After migration to Neon:
- ✅ **Reliable Connections**: No more "Can't reach database" errors
- ✅ **Better Performance**: Optimized for serverless apps like yours
- ✅ **Automatic Scaling**: Scales up/down based on demand
- ✅ **Cost Efficiency**: Pay only for compute time used
- ✅ **Modern Features**: Point-in-time recovery, branching, etc.
- ✅ **Excellent Uptime**: Much more reliable than Railway PostgreSQL

## Next Steps After Migration

1. **Update Documentation**: Update any docs referencing Railway
2. **Monitor Health**: Keep an eye on `/api/health` endpoint
3. **Test Retry Queue**: Verify it works correctly with stable DB
4. **Performance Tuning**: Optimize queries based on Neon analytics
5. **Set Up Alerts**: Configure monitoring for proactive issue detection

---

**Estimated Time**: 30-60 minutes
**Downtime**: ~5-10 minutes during deployment
**Risk Level**: Low (can always rollback to Railway if needed)