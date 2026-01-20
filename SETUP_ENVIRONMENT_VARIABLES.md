# Setting Up Environment Variables for Production

## Required Environment Variables

Your SprintScope application requires the following environment variables:

### 1. `ANTHROPIC_API_KEY` (Required)
- **Purpose**: Authenticates with Anthropic's Claude API for SQL generation
- **Where to get it**: https://console.anthropic.com/ → API Keys
- **Format**: Starts with `sk-ant-`
- **Security**: Keep this secret! Never commit to git.

### 2. Supabase Variables (Required)
- `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` - Your Supabase API key

## Platform-Specific Instructions

### Vercel

1. Go to your project on Vercel
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: Your API key (starts with `sk-ant-`)
   - **Environment**: Select `Production`, `Preview`, and/or `Development`
4. Click **Save**
5. **Redeploy** your application:
   - Go to **Deployments**
   - Click the three dots on the latest deployment
   - Select **Redeploy**

**Important**: After adding environment variables, you MUST redeploy for changes to take effect.

### Netlify

1. Go to your site on Netlify
2. Click **Site settings** → **Environment variables**
3. Click **Add a variable**
4. Add each variable:
   - **Key**: `ANTHROPIC_API_KEY`
   - **Value**: Your API key
   - **Scopes**: Select `Production`, `Deploy previews`, and/or `Branch deploys`
5. Click **Save**
6. **Redeploy** your site:
   - Go to **Deploys**
   - Click **Trigger deploy** → **Deploy site**

### Railway

1. Go to your project on Railway
2. Click on your service
3. Go to the **Variables** tab
4. Click **New Variable**
5. Add:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: Your API key
6. Click **Add**
7. Railway will automatically restart your service

### Docker / Docker Compose

**Option 1: Using .env file**
```bash
# Create or edit .env file in your project root
echo "ANTHROPIC_API_KEY=your-api-key-here" >> .env
```

**Option 2: Using docker-compose.yml**
```yaml
services:
  app:
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    # ... rest of config
```

Then set the variable:
```bash
export ANTHROPIC_API_KEY=your-api-key-here
docker-compose up -d
```

### Manual Server Deployment

If you're deploying manually (SSH, etc.):

1. Create or edit `.env.local` or `.env.production` in your project root
2. Add:
   ```env
   ANTHROPIC_API_KEY=your-api-key-here
   ```
3. Restart your application:
   ```bash
   pm2 restart your-app
   # or
   systemctl restart your-app
   # or whatever process manager you use
   ```

## Verification

After setting the environment variables:

1. **Check the health endpoint**:
   ```
   https://your-production-url.com/api/health
   ```
   
   You should see:
   ```json
   {
     "status": "healthy",
     "checks": {
       "anthropic": {
         "configured": true,
         "keyLength": 50,  // or similar
         "keyPrefix": "sk-ant-api0"
       }
     }
   }
   ```

2. **Test the application**:
   - Try asking a question like "What issues are in QA status for Team ACCEL?"
   - You should no longer see the authentication error

## Troubleshooting

### Still getting authentication error?

1. **Verify the key is set**:
   - Check `/api/health` endpoint
   - Look for `anthropic.configured: true`

2. **Check for typos**:
   - Variable name must be exactly: `ANTHROPIC_API_KEY`
   - No spaces, correct capitalization

3. **Verify the API key is valid**:
   - Go to https://console.anthropic.com/
   - Check if the key is active
   - Try creating a new key if needed

4. **Check if you redeployed**:
   - Environment variable changes require a redeploy
   - Old deployments won't have the new variables

5. **Check environment scope**:
   - Make sure the variable is set for the correct environment (Production, Preview, etc.)

6. **Check server logs**:
   - Look for "ANTHROPIC_API_KEY is not set" in logs
   - This confirms the variable isn't being read

### Key format issues

- Valid Anthropic API keys start with `sk-ant-`
- They're typically 50+ characters long
- Make sure you copied the entire key (no truncation)

### Multiple environments

If you have multiple environments (staging, production):
- Set the variable for each environment separately
- Or use the same key for all (less secure but simpler)

## Security Best Practices

1. **Never commit API keys to git**
   - Add `.env` and `.env.local` to `.gitignore`
   - Use environment variables in production

2. **Rotate keys regularly**
   - Generate new keys periodically
   - Revoke old keys that are no longer used

3. **Use different keys for different environments**
   - Production key should be separate from development
   - This limits blast radius if a key is compromised

4. **Monitor usage**
   - Check Anthropic dashboard for unexpected usage
   - Set up alerts for unusual activity

## Getting Help

If you're still having issues:

1. Check the health endpoint output
2. Review server logs for detailed error messages
3. Verify the API key works by testing it directly:
   ```bash
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: YOUR_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
   ```
