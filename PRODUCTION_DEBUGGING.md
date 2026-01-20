# Production Debugging Guide

Since the application works locally but fails in production, follow these steps to identify and fix the issue.

## Quick Health Check

Visit `/api/health` in your production environment to see a configuration status report:

```
https://your-production-url.com/api/health
```

This endpoint will show:
- Whether environment variables are configured
- Which services are missing (without exposing sensitive data)
- Overall health status

## Common Production Issues

### 1. Missing Environment Variables

**Most Common Issue**: Environment variables not set in production.

**Required Variables:**
- `ANTHROPIC_API_KEY` - Required for SQL generation
- `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL` - Required for database connection
- `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` - Required for database access

**How to Check:**
1. Visit `/api/health` endpoint
2. Check your deployment platform's environment variable settings:
   - **Vercel**: Project Settings → Environment Variables
   - **Netlify**: Site Settings → Environment Variables
   - **Railway**: Variables tab
   - **Docker**: Check `.env` file or docker-compose.yml

**How to Fix:**
1. Add missing environment variables in your deployment platform
2. Redeploy the application
3. Verify with `/api/health` endpoint

### 2. Environment Variable Naming Differences

**Issue**: Different variable names between local and production.

**Common Differences:**
- Local: `SUPABASE_URL` vs Production: `NEXT_PUBLIC_SUPABASE_URL`
- Local: `SUPABASE_ANON_KEY` vs Production: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

**How to Fix:**
- Ensure production uses the same variable names as your code expects
- Check `lib/tools.ts` and `lib/llm.ts` for expected variable names

### 3. API Key Issues

**Symptoms:**
- "Authentication error: Invalid API key"
- "Configuration error: AI service is not properly configured"

**How to Check:**
1. Verify `ANTHROPIC_API_KEY` is set correctly
2. Check if the key has expired or been revoked
3. Verify the key has proper permissions

**How to Fix:**
1. Generate a new API key from Anthropic dashboard
2. Update the environment variable
3. Redeploy

### 4. Network/Firewall Issues

**Symptoms:**
- "Network error: Unable to reach AI service"
- Timeout errors

**How to Check:**
1. Verify production server can reach `api.anthropic.com`
2. Check firewall rules
3. Check if your hosting provider blocks outbound requests

**How to Fix:**
1. Whitelist `api.anthropic.com` in firewall
2. Check hosting provider's network restrictions
3. Use a proxy if necessary

### 5. Rate Limiting

**Symptoms:**
- "Rate limit exceeded: Too many requests"

**How to Check:**
1. Check Anthropic API usage dashboard
2. Review production logs for 429 errors

**How to Fix:**
1. Wait for rate limit to reset
2. Upgrade Anthropic API plan if needed
3. Implement request throttling

### 6. Build/Deployment Issues

**Symptoms:**
- Application doesn't start
- Runtime errors on first request

**How to Check:**
1. Review build logs
2. Check if all dependencies are installed
3. Verify Node.js version matches local

**How to Fix:**
1. Check build logs for errors
2. Ensure `package.json` dependencies are correct
3. Verify Node.js version in production matches `.nvmrc` or `package.json` engines

## Debugging Steps

### Step 1: Check Health Endpoint

```bash
curl https://your-production-url.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "checks": {
    "anthropic": { "configured": true },
    "supabase": { "urlConfigured": true, "serviceKeyConfigured": true }
  }
}
```

### Step 2: Check Production Logs

Look for these log messages:
- `Environment check:` - Shows which variables are configured
- `Error generating SQL:` - Shows detailed error information
- `Error in chat API:` - Shows API-level errors

### Step 3: Test API Directly

```bash
curl -X POST https://your-production-url.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What issues are in QA status for Team ACCEL?"}'
```

### Step 4: Compare Local vs Production

| Check | Local | Production |
|-------|-------|------------|
| Environment variables set? | ✅ | ❓ |
| API keys valid? | ✅ | ❓ |
| Network access? | ✅ | ❓ |
| Node.js version | ✅ | ❓ |
| Dependencies installed? | ✅ | ❓ |

## Platform-Specific Notes

### Vercel
- Environment variables must be set in Project Settings
- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Redeploy after changing environment variables

### Netlify
- Environment variables in Site Settings → Environment Variables
- Build-time variables vs runtime variables
- May need to rebuild after changes

### Railway
- Variables in Variables tab
- Can set from `.env` file or UI
- Restart service after changes

### Docker
- Use `.env` file or docker-compose environment section
- Ensure `.env` file is not in `.dockerignore`
- Restart container after changes

## Next Steps

1. **Visit `/api/health`** to see what's missing
2. **Check production logs** for detailed error messages
3. **Compare environment variables** between local and production
4. **Test the API directly** to see the exact error
5. **Review the improved error messages** - they now provide more specific information

## Getting Help

If you're still stuck:
1. Check the production logs for the detailed error messages (now with status codes and error types)
2. Share the output from `/api/health` (it doesn't expose sensitive data)
3. Share the error message from the API response (it's now more descriptive)
