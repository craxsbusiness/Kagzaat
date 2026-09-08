-- ============================================================================
-- LexVault Database Schema
-- Run this in Supabase SQL Editor to set up the database
-- ============================================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS registry CASCADE;
DROP TABLE IF EXISTS login_history CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- REGISTRY TABLE
-- Stores all application data for cross-device sync
-- ============================================================================
CREATE TABLE registry (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE registry ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for sync (public read/write)
CREATE POLICY "Allow public read" ON registry FOR SELECT USING (true);
CREATE POLICY "Allow public write" ON registry FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON registry FOR UPDATE USING (true);

-- Index for faster lookups
CREATE INDEX idx_registry_updated_at ON registry(updated_at DESC);

-- Enable realtime for cross-device sync
ALTER PUBLICATION supabase_realtime ADD TABLE registry;

-- ============================================================================
-- USERS TABLE
-- Stores all user accounts
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_code TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'JUDGE', 'POLICE', 'LAWYER', 'VICTIM', 'ACCUSED', 'AUDITOR')),
  phone TEXT,
  person_code TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  totp_secret TEXT,
  recovery_codes_hashed TEXT[],
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  court_ids TEXT[] DEFAULT '{}',
  station_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_code ON users(user_code);
CREATE INDEX idx_users_person_code ON users(person_code);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ============================================================================
-- LOGIN HISTORY TABLE
-- Tracks all login attempts (successful and failed)
-- ============================================================================
CREATE TABLE login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_code TEXT,
  email TEXT,
  login_time TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT,
  location TEXT,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'LOCKED', 'LOGOUT')),
  failure_reason TEXT,
  attempt_number INTEGER DEFAULT 1,
  session_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for login history queries
CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_user_code ON login_history(user_code);
CREATE INDEX idx_login_history_email ON login_history(email);
CREATE INDEX idx_login_history_login_time ON login_history(login_time DESC);
CREATE INDEX idx_login_history_status ON login_history(status);
CREATE INDEX idx_login_history_ip_address ON login_history(ip_address);

-- ============================================================================
-- USER SESSIONS TABLE
-- Tracks active user sessions
-- ============================================================================
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Indexes for session management
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to record login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
  p_user_id UUID,
  p_user_code TEXT,
  p_email TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_device_info TEXT,
  p_location TEXT,
  p_status TEXT,
  p_failure_reason TEXT DEFAULT NULL,
  p_attempt_number INTEGER DEFAULT 1,
  p_session_token TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_login_id UUID;
BEGIN
  INSERT INTO login_history (
    user_id, user_code, email, ip_address, user_agent, device_info, 
    location, status, failure_reason, attempt_number, session_token
  ) VALUES (
    p_user_id, p_user_code, p_email, p_ip_address, p_user_agent, 
    p_device_info, p_location, p_status, p_failure_reason, 
    p_attempt_number, p_session_token
  )
  RETURNING id INTO v_login_id;
  
  RETURN v_login_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new session
CREATE OR REPLACE FUNCTION create_user_session(
  p_user_id UUID,
  p_session_token TEXT,
  p_device_info TEXT,
  p_ip_address TEXT,
  p_expires_at TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  INSERT INTO user_sessions (
    user_id, session_token, device_info, ip_address, expires_at
  ) VALUES (
    p_user_id, p_session_token, p_device_info, p_ip_address, p_expires_at
  )
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent login history for a user
CREATE OR REPLACE FUNCTION get_user_login_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  id UUID,
  login_time TIMESTAMPTZ,
  ip_address TEXT,
  device_info TEXT,
  location TEXT,
  status TEXT,
  failure_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lh.id,
    lh.login_time,
    lh.ip_address,
    lh.device_info,
    lh.location,
    lh.status,
    lh.failure_reason
  FROM login_history lh
  WHERE lh.user_id = p_user_id
  ORDER BY lh.login_time DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count failed login attempts in last hour
CREATE OR REPLACE FUNCTION count_recent_failed_logins(
  p_email TEXT,
  p_minutes INTEGER DEFAULT 60
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM login_history
  WHERE email = p_email
    AND status = 'FAILED'
    AND login_time > NOW() - (p_minutes || ' minutes')::INTERVAL;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Login history - users can view their own login history
CREATE POLICY "Users can view own login history" ON login_history
  FOR SELECT USING (auth.uid() = user_id);

-- Sessions - users can view their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access users" ON users
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access login_history" ON login_history
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access user_sessions" ON user_sessions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS (Optional - for easier querying)
-- ============================================================================

-- View for recent login activity
CREATE OR REPLACE VIEW recent_logins AS
SELECT 
  lh.id,
  u.name as user_name,
  u.email,
  u.role,
  lh.login_time,
  lh.ip_address,
  lh.device_info,
  lh.location,
  lh.status,
  lh.failure_reason
FROM login_history lh
LEFT JOIN users u ON lh.user_id = u.id
ORDER BY lh.login_time DESC
LIMIT 100;

-- View for active sessions
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
  us.id,
  u.name as user_name,
  u.email,
  u.role,
  us.device_info,
  us.ip_address,
  us.created_at,
  us.last_activity,
  us.expires_at
FROM user_sessions us
LEFT JOIN users u ON us.user_id = u.id
WHERE us.is_active = true
  AND us.expires_at > NOW()
ORDER BY us.last_activity DESC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Stores all user accounts with authentication details';
COMMENT ON TABLE login_history IS 'Tracks all login attempts for security auditing';
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions for session management';

COMMENT ON COLUMN login_history.status IS 'SUCCESS, FAILED, LOCKED, or LOGOUT';
COMMENT ON COLUMN login_history.attempt_number IS 'Consecutive failed attempt number for lockout tracking';
COMMENT ON COLUMN users.status IS 'ACTIVE or SUSPENDED';

-- ============================================================================
-- DONE! Database schema created successfully
-- ============================================================================
