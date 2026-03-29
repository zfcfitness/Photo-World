// api/auth-start.js
// Starts the Google OAuth flow — redirects user to Google's consent screen

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export default function handler(req, res) {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const redirectUri  = `${process.env.APP_URL}/auth/callback`;

  if (!clientId) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not configured' });
  }

  // Build Google OAuth URL
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',   // get refresh token so sessions last
    prompt:        'consent',   // always show consent screen (gets refresh token)
    state:         crypto.randomUUID(), // CSRF protection
  });

  res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
