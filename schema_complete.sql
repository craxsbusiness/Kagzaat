-- ============================================================================
-- LexVault Complete Database Schema with Data Sync
-- This schema stores ALL application data in Supabase for cross-device access
-- ============================================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS evidence CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS courts CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS security_events CASCADE;
DROP TABLE IF EXISTS notices CASCADE;
DROP TABLE IF EXISTS login_history CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- USERS TABLE
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
  sec_question TEXT,
  sec_answer_hash TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  court_ids TEXT[] DEFAULT '{}',
  station_id TEXT,
  unit TEXT,
  key_fp TEXT,
  clearance_note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_code ON users(user_code);
CREATE INDEX idx_users_person_code ON users(person_code);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- COURTS TABLE
-- ============================================================================
CREATE TABLE courts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CASES TABLE
-- ============================================================================
CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  cno TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CRIMINAL', 'CIVIL', 'MISC')),
  court_id TEXT REFERENCES courts(id),
  prev_court_id TEXT,
  judge_id UUID REFERENCES users(id),
  lawyer_ids TEXT[] DEFAULT '{}',
  station_id TEXT,
  io_id UUID REFERENCES users(id),
  parties JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'FILED' CHECK (status IN ('FILED', 'INVESTIGATION', 'TRIAL', 'JUDGMENT', 'CLOSED', 'DISMISSED')),
  filed_on TIMESTAMPTZ DEFAULT NOW(),
  fir_number TEXT,
  tags TEXT[] DEFAULT '{}',
  hearings JSONB DEFAULT '[]',
  orders JSONB DEFAULT '[]',
  transfers JSONB DEFAULT '[]',
  closure JSONB,
  read_only_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cases_court_id ON cases(court_id);
CREATE INDEX idx_cases_judge_id ON cases(judge_id);
CREATE INDEX idx_cases_status ON cases(status);

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES cases(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('PUBLIC', 'COURT', 'INVESTIGATION', 'PRIVILEGED', 'RESTRICTED')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'REVIEW', 'APPROVED', 'SIGNED', 'RESTRICTED', 'ARCHIVED')),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  size_kb INTEGER DEFAULT 0,
  versions JSONB DEFAULT '[]',
  access_count INTEGER DEFAULT 0,
  tampered BOOLEAN DEFAULT FALSE,
  deaccessioned JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_case_id ON documents(case_id);
CREATE INDEX idx_documents_classification ON documents(classification);

-- ============================================================================
-- EVIDENCE TABLE
-- ============================================================================
CREATE TABLE evidence (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES cases(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  seized_on TIMESTAMPTZ DEFAULT NOW(),
  location TEXT,
  custody JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evidence_case_id ON evidence(case_id);

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq INTEGER UNIQUE NOT NULL,
  ts TIMESTAMPTZ DEFAULT NOW(),
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  case_id TEXT,
  doc_id TEXT,
  detail TEXT,
  ip TEXT,
  prev_hash TEXT,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_seq ON audit_logs(seq DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_case_id ON audit_logs(case_id);

-- ============================================================================
-- SECURITY EVENTS TABLE
-- ============================================================================
CREATE TABLE security_events (
  id TEXT PRIMARY KEY,
  ts TIMESTAMPTZ DEFAULT NOW(),
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARN', 'CRITICAL')),
  kind TEXT NOT NULL,
  detail TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_events_ts ON security_events(ts DESC);
CREATE INDEX idx_security_events_severity ON security_events(severity);

-- ============================================================================
-- NOTICES TABLE
-- ============================================================================
CREATE TABLE notices (
  id TEXT PRIMARY KEY,
  for_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ DEFAULT NOW(),
  kind TEXT NOT NULL CHECK (kind IN ('CASE', 'DOC', 'HEARING', 'TRANSFER', 'SECURITY', 'SYSTEM')),
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  case_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notices_for_user_id ON notices(for_user_id);
CREATE INDEX idx_notices_read ON notices(read);

-- ============================================================================
-- LOGIN HISTORY TABLE
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

CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_login_time ON login_history(login_time DESC);

-- ============================================================================
-- USER SESSIONS TABLE
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

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Record login attempt
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

-- Get user login history
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

-- Count recent failed logins
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
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);

-- Login history - users can view their own
CREATE POLICY "Users can view own login history" ON login_history FOR SELECT USING (auth.uid() = user_id);

-- Sessions - users can view their own
CREATE POLICY "Users can view own sessions" ON user_sessions FOR SELECT USING (auth.uid() = user_id);

-- Notices - users can view their own
CREATE POLICY "Users can view own notices" ON notices FOR SELECT USING (auth.uid() = for_user_id);

-- Service role can do everything
CREATE POLICY "Service role full access users" ON users FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role full access courts" ON courts FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role full access cases" ON cases FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role full access documents" ON documents FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role full access evidence" ON evidence FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role full access audit_logs" ON audit_logs FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role full access security_events" ON security_events FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role full access notices" ON notices FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role full access login_history" ON login_history FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role full access user_sessions" ON user_sessions FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS
-- ============================================================================

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

COMMENT ON TABLE users IS 'All user accounts with authentication details';
COMMENT ON TABLE courts IS 'Court registry';
COMMENT ON TABLE cases IS 'All case files';
COMMENT ON TABLE documents IS 'All uploaded documents';
COMMENT ON TABLE evidence IS 'Evidence items with custody chain';
COMMENT ON TABLE audit_logs IS 'Complete audit trail of all actions';
COMMENT ON TABLE security_events IS 'Security events and alerts';
COMMENT ON TABLE notices IS 'User notifications';
COMMENT ON TABLE login_history IS 'All login attempts for security tracking';
COMMENT ON TABLE user_sessions IS 'Active user sessions';
