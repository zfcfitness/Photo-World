// api/auth-callback.js
// Google redirects here after the user signs in.
// Exchanges the auth code for tokens, fetches user profile,
// creates a signed session cookie, and redirects to the app.

import * as cookie from 'cookie';
import { SignJWT } from 'jose';

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(302, `/?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return res.redirect(302, '/?error=no_code');
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = `${process.env.APP_URL}/auth/callback`;
  const jwtSecret    = new TextEncoder().encode(process.env.JWT_SECRET);

  try {
    // Exchange auth code for access + refresh tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      console.error('Token exchange failed:', tokens);
      return res.redirect(302, '/?error=token_exchange_failed');
    }

    // Fetch user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();

    // Create signed JWT session (7 days)
    const session = await new SignJWT({
      sub:          profile.id,
      email:        profile.email,
      name:         profile.name,
      picture:      profile.picture,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at:   Date.now() + (tokens.expires_in * 1000),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(jwtSecret);

    // Set session cookie (httpOnly, secure, sameSite strict)
    res.setHeader('Set-Cookie', cookie.serialize('pw_session', session, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7, // 7 days
      path:     '/',
    }));

    // Redirect to app
    res.redirect(302, '/');

  } catch (err) {
    console.error('Auth callback error:', err);
    res.redirect(302, '/?error=server_error');
  }
}
