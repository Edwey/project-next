# Environment Variables Setup for Deployment

## Required Database Environment Variables

Add these environment variables in your Vercel/InfinityFree dashboard:

```bash
# Database Configuration
DB_HOST=your_database_host
DB_PORT=3306
DB_USER=your_database_user
DB_PASS=your_database_password
DB_NAME=university_management

# Next.js Configuration
NODE_ENV=production
```

## Steps to Fix 401 Unauthorized Error

### 1. Vercel Deployment
1. Go to your Vercel project dashboard
2. Click on "Settings" → "Environment Variables"
3. Add the database variables listed above
4. Redeploy your application

### 2. InfinityFree Deployment
1. Go to your InfinityFree control panel
2. Find environment variables section
3. Add the database variables
4. Restart your application

### 3. Local Development
Create a `.env.local` file in your project root:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=university_management
```

## Testing the Fix

After setting up environment variables:
1. The login API will return proper error messages (503 Service Unavailable) instead of 401
2. Check your deployment logs for database connection status
3. Test login with valid credentials

## Common Issues

- **DB_HOST**: Use IP address if hostname doesn't work
- **DB_PASS**: Make sure password is URL-encoded if it contains special characters
- **Firewall**: Ensure database allows connections from your deployment platform
