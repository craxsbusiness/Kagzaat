# LexVault - Secure Legal Document Management System

A comprehensive, secure document management system for courts, judges, lawyers, police, and legal professionals with multi-factor authentication, role-based access control, and complete audit trails.

## 🎯 Overview

LexVault is a production-ready legal document management portal that provides:

- **Multi-factor Authentication**: Password + TOTP (Google Authenticator) + Security Question
- **Role-Based Access Control**: Different permissions for Judges, Lawyers, Police, Victims, Accused, Admins, and Auditors
- **Complete Audit Trail**: Every action is logged and tracked
- **Real-time Sync**: Data synchronized across devices using Supabase
- **Multi-language Support**: English, Hindi, and 6 other Indian languages
- **Dark/Light Mode**: Accessible theme options
- **Document Version Control**: Track all document changes with full history
- **Case Management**: Complete case lifecycle management
- **Evidence Tracking**: Chain of custody for all evidence
- **Court Transfer System**: Secure case transfers between courts

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Supabase Account** (free tier available at https://supabase.com)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Supabase Setup

**Important**: You must set up the Supabase database before using the application.

1. **Create a Supabase Project**
   - Go to https://supabase.com
   - Create a new project
   - Note your project URL and anon key

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Run Database Schema**
   - Open Supabase Dashboard → SQL Editor
   - Copy contents of `schema.sql`
   - Paste and run the SQL
   - This creates all necessary tables and functions

4. **Verify Setup**
   - Check that tables were created: `users`, `login_history`, `user_sessions`
   - Test login functionality

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions.

## 🔐 Authentication System

### Three-Factor Authentication

1. **Factor 1: Password**
   - Secure password with Argon2id hashing
   - Minimum 8 characters

2. **Factor 2: TOTP (Time-based One-Time Password)**
   - Compatible with Google Authenticator, Authy, etc.
   - 6-digit code that changes every 30 seconds
   - 8 recovery codes provided during setup

3. **Factor 3: Security Question**
   - Personal security question and answer
   - Case-insensitive matching
   - Can be customized during registration

### Account Creation Flow

1. **First Admin Account**
   - On first run, create an Admin account
   - This account can create other users
   - Default role: ADMIN

2. **Official Roles** (Require access code: `12345`)
   - Judge
   - Lawyer
   - Police
   - Auditor

3. **Party Roles** (Created by Police only)
   - Victim
   - Accused

### Access Code

The official access code `12345` is required to create accounts for official roles. This prevents unauthorized account creation.

## 👥 User Roles & Permissions

| Role | Can View Cases | Can Upload Docs | Can Edit Docs | Can Approve | Can Sign | Can Transfer | Can Close/Dismiss | Can Delete Cases |
|------|---------------|-----------------|---------------|-------------|----------|--------------|-------------------|------------------|
| Admin | ✓ All | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Judge | ✓ Assigned | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Lawyer | ✓ Assigned | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Police | ✓ Assigned | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Auditor | ✓ All (read-only) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Victim | ✓ Own cases | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Accused | ✓ Own cases | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

## 📋 Features

### Dashboard
- Role-specific dashboard showing relevant information
- Quick access to assigned cases
- Recent activity feed
- Security alerts

### Case Management
- Create and manage cases
- Assign judges, lawyers, and police
- Track case status (Filed → Investigation → Trial → Judgment → Closed)
- Case history and timeline
- Transfer cases between courts

### Document Management
- Upload documents (TXT, PDF, DOC, DOCX, RTF)
- Version control with full history
- Document classification (Public, Court, Investigation, Privileged, Restricted)
- Digital signatures
- Approval workflow
- Tamper detection with SHA-256 hashing

### Evidence Tracking
- Record evidence items
- Track chain of custody
- Evidence transfer history
- Location tracking

### Audit Trail
- Complete audit log of all actions
- Login history tracking
- Security event monitoring
- Exportable audit reports

### Search
- Search across cases, documents, and evidence
- Filter by role, status, date, etc.
- OCR support for scanned documents

### Multi-language Support
- English
- Hindi (हिंदी)
- Bengali (বাংলা)
- Tamil (தமிழ்)
- Telugu (తెలుగు)
- Marathi (मराठी)
- Punjabi (ਪੰਜਾਬੀ)
- Gujarati (ગુજરાતી)

### Accessibility
- Dark/Light mode
- Adjustable text size
- High contrast mode
- Screen reader support
- Keyboard navigation

## 🗄️ Database Schema

### Tables

1. **users** - User accounts and authentication data
2. **login_history** - All login attempts (successful and failed)
3. **user_sessions** - Active user sessions

### Key Features

- **Row Level Security (RLS)**: Users can only access their own data
- **Automatic Timestamps**: All records are timestamped
- **Cascade Deletes**: Related data is cleaned up automatically
- **Indexes**: Optimized for fast queries
- **Views**: Pre-built queries for common use cases

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for complete schema documentation.

## 🔒 Security Features

### Authentication
- Multi-factor authentication (3 factors)
- Password hashing with Argon2id
- TOTP with recovery codes
- Session management with expiration
- Failed login attempt tracking
- Account lockout after failed attempts

### Data Protection
- Row Level Security (RLS)
- Encrypted connections (HTTPS)
- Secure session tokens
- Audit logging of all actions
- No data deletion (only suspension)

### Access Control
- Role-based permissions
- Case-level authorization
- Document classification
- Court-level restrictions
- Audit trail for all access

## 📊 Monitoring & Analytics

### Login Tracking
All login attempts are recorded in Supabase with:
- User details
- Timestamp
- IP address
- Device information
- Location
- Status (Success/Failed/Locked)
- Failure reason

### Useful Queries

```sql
-- View all login attempts
SELECT * FROM login_history ORDER BY login_time DESC;

-- View failed login attempts
SELECT * FROM login_history WHERE status = 'FAILED' ORDER BY login_time DESC;

-- View active sessions
SELECT * FROM active_sessions;

-- Count failed attempts in last hour
SELECT email, COUNT(*) as failed_count
FROM login_history
WHERE status = 'FAILED' AND login_time > NOW() - INTERVAL '1 hour'
GROUP BY email
HAVING COUNT(*) >= 3;
```

## 🛠️ Development

### Project Structure

```
lexvault/
├── src/
│   ├── components/       # Reusable UI components
│   ├── views/           # Page components
│   ├── lib/             # Utility functions
│   ├── data.ts          # Data types and constants
│   ├── supabase.ts      # Supabase client and functions
│   ├── i18n.tsx         # Internationalization
│   ├── totp.ts          # TOTP authentication
│   └── App.tsx          # Main application
├── schema.sql           # Database schema
├── SUPABASE_SETUP.md    # Supabase setup guide
└── README.md           # This file
```

### Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Linting
npm run lint         # Run ESLint
```

## 📝 Usage Guide

### First Time Setup

1. **Start the application**
   ```bash
   npm run dev
   ```

2. **Create Admin Account**
   - Click "Create Account"
   - Select role: ADMIN
   - Enter access code: `12345`
   - Fill in details
   - Save your person code

3. **Set Up Courts**
   - Login as Admin
   - Go to Administration → Courts
   - Add courts with name, level, and location

4. **Create Users**
   - Go to Administration → Users
   - Create judges, lawyers, police, etc.
   - Each user gets a person code

### Daily Usage

#### For Judges
1. Login with credentials
2. View assigned cases on dashboard
3. Review documents
4. Approve/sign documents
5. Schedule hearings
6. Close/dismiss cases

#### For Lawyers
1. Login with credentials
2. View assigned cases
3. Upload documents
4. Edit documents
5. View case history

#### For Police
1. Login with credentials
2. View assigned cases
3. Upload investigation reports
4. Record evidence
5. Create victim/accused accounts

#### For Victims/Accused
1. Login with credentials (password only)
2. View own cases
3. View case status
4. Download permitted documents

## 🐛 Troubleshooting

### Login Issues
- **Forgot password**: Contact admin to reset
- **Lost authenticator**: Use one of 8 recovery codes
- **Account locked**: Wait 30 minutes or contact admin

### Database Issues
- **Tables not created**: Re-run schema.sql
- **Can't login**: Check Supabase connection
- **Data not syncing**: Verify environment variables

### Common Errors
- **"Not configured"**: Check .env file has Supabase credentials
- **"Access denied"**: Check user has proper permissions
- **"Table not found"**: Run schema.sql in Supabase

## 📚 Documentation

- [Supabase Setup Guide](./SUPABASE_SETUP.md) - Complete database setup
- [Schema Documentation](./schema.sql) - Database schema with comments
- [Environment Variables](./.env.example) - Required configuration

## 🔧 Configuration

### Environment Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: Email Service (for sending person codes)
VITE_RESEND_API_KEY=your-resend-key
```

## 🤝 Contributing

This is a production system for legal document management. Please ensure:
- All changes are tested thoroughly
- Security implications are considered
- Audit trails are maintained
- Documentation is updated

## 📄 License

This is a custom-built system for legal document management.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review SUPABASE_SETUP.md
3. Check Supabase dashboard logs
4. Review browser console for errors

## ✅ Checklist for Deployment

- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] Database schema applied
- [ ] Admin account created
- [ ] Courts registered
- [ ] Users created
- [ ] Login tested
- [ ] Document upload tested
- [ ] Audit trail verified
- [ ] Security policies reviewed

---

**Built with**: React, TypeScript, Tailwind CSS, Supabase, Vite

**Security**: Multi-factor authentication, RLS, audit logging, encrypted connections

**Compliance**: Designed for legal document management with complete audit trails
