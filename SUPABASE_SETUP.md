# LexVault - Supabase Database Setup Guide

## Overview

LexVault uses Supabase to track all login attempts and user sessions in a secure, auditable database. This ensures complete transparency and security for all authentication activities.

## What Supabase Does

1. **Login History Tracking**: Every login attempt (successful or failed) is recorded with:
   - User details (ID, email, user code)
   - Timestamp
   - IP address
   - Device information
   - Location
   - Status (SUCCESS/FAILED/LOCKED/LOGOUT)
   - Failure reason (if applicable)

2. **Session Management**: Tracks active user sessions with expiration times

3. **Security Auditing**: Provides complete audit trail for compliance and security reviews

4. **Failed Login Detection**: Automatically counts failed attempts to prevent brute force attacks

## Setup Instructions

### Step 1: Create the Database Schema

1. Open your Supabase dashboard: https://supabase.com/dashboard/
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `schema.sql` file
6. Paste it into the SQL Editor
7. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

This will create:
- `users` table - stores all user accounts
- `login_history` table - tracks all login attempts
- `user_sessions` table - manages active sessions
- Helper functions for recording and querying data
- Row Level Security (RLS) policies for data protection
- Useful views for quick access to recent activity

### Step 2: Verify the Setup

After running the schema, verify the tables were created:

1. Go to **Table Editor** in Supabase dashboard
2. You should see three tables:
   - `users`
   - `login_history`
   - `user_sessions`

### Step 3: Test Login Tracking

1. Try logging in to your LexVault application
2. Go back to Supabase → SQL Editor
3. Run this query to see your login:

```sql
SELECT * FROM login_history ORDER BY login_time DESC LIMIT 10;
```

You should see your login attempt recorded!

## Database Schema Overview

### users table
Stores all user accounts with authentication details:
- `id` - Unique user identifier
- `user_code` - Login ID (e.g., USR-XXXXX)
- `email` - User email (unique)
- `name` - Full name
- `role` - User role (ADMIN, JUDGE, POLICE, etc.)
- `phone` - Phone number
- `person_code` - Unique person code (e.g., LVC-XXXX-XXXX)
- `password_hash` - Hashed password
- `totp_secret` - 2FA secret
- `recovery_codes_hashed` - Recovery codes for 2FA
- `status` - ACTIVE or SUSPENDED
- `court_ids` - Array of court IDs (for judges)
- `station_id` - Police station ID (for police)
- `created_by` - Who created this account
- `created_at` / `updated_at` - Timestamps

### login_history table
Tracks every login attempt:
- `id` - Unique login record ID
- `user_id` - Reference to users table
- `user_code` - User's login code
- `email` - Email used for login
- `login_time` - When the login attempt occurred
- `ip_address` - IP address of the attempt
- `user_agent` - Browser/device information
- `device_info` - Detailed device information
- `location` - Geographic location (if available)
- `status` - SUCCESS, FAILED, LOCKED, or LOGOUT
- `failure_reason` - Why it failed (wrong password, locked, etc.)
- `attempt_number` - Consecutive failed attempt number
- `session_token` - Session token if successful

### user_sessions table
Manages active sessions:
- `id` - Session ID
- `user_id` - Reference to users table
- `session_token` - Unique session token
- `device_info` - Device information
- `ip_address` - IP address
- `expires_at` - When session expires
- `created_at` - When session was created
- `last_activity` - Last activity timestamp
- `is_active` - Whether session is active

## Useful Queries

### View all login attempts
```sql
SELECT * FROM login_history ORDER BY login_time DESC;
```

### View failed login attempts
```sql
SELECT * FROM login_history 
WHERE status = 'FAILED' 
ORDER BY login_time DESC;
```

### View login history for a specific user
```sql
SELECT * FROM login_history 
WHERE email = 'user@example.com' 
ORDER BY login_time DESC;
```

### View active sessions
```sql
SELECT * FROM active_sessions;
```

### Count failed attempts in last hour
```sql
SELECT email, COUNT(*) as failed_count
FROM login_history
WHERE status = 'FAILED' 
  AND login_time > NOW() - INTERVAL '1 hour'
GROUP BY email
HAVING COUNT(*) >= 3;
```

## Security Features

1. **Row Level Security (RLS)**: Users can only view their own data
2. **Service Role Access**: Backend operations have full access
3. **Automatic Timestamps**: All records are automatically timestamped
4. **Cascade Deletes**: When a user is deleted, their sessions are cleaned up
5. **Audit Trail**: Complete history of all authentication events

## Integration with LexVault

The application automatically:
- Records every login attempt (success or failure)
- Tracks failed attempts for lockout detection
- Creates sessions on successful login
- Logs logout events
- Provides login history in the admin panel

## Troubleshooting

### Tables not created
- Make sure you're logged into the correct Supabase project
- Check that you have the necessary permissions
- Try running the schema.sql file again

### Login attempts not being recorded
- Verify the environment variables are set correctly:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Check the browser console for errors
- Verify the functions were created successfully

### Can't view login history
- Check RLS policies are applied correctly
- Verify you're logged in as the correct user
- Try using the service role key for testing

## Next Steps

After setting up the database:
1. Test login functionality
2. Verify login history is being recorded
3. Check the admin panel shows login history
4. Test failed login detection and lockout

## Support

For issues with Supabase setup:
- Check Supabase documentation: https://supabase.com/docs
- Review the SQL Editor logs in your dashboard
- Verify your environment variables are correct
