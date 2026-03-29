// api/me.js
// Returns the current user's info and a fresh access token.
// The frontend calls this on load to check if the user is signed in.

import * as cookie from 'cookie';
import { jwtVerify } from 'jose';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const cookies = cookie.parse(req.headers.cookie || '');
  const session = cookies.pw_session;

  if (!session) {
    return res.status(401).json({ error: 'not_signed_in' });
  }

  const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET);

  try {
    const { payload } = await jwtVerify(session, jwtSecret);

    // Check if access token needs refreshing
    let accessToken = payload.access_token;
    if (payload.expires_at && Date.now() > payload.expires_at - 60000) {
      // Token expires soon — refresh it
      if (payload.refresh_token) {
        const refreshed = await refreshAccessToken(payload.refresh_token);
        if (refreshed) accessToken = refreshed;
      }
    }

    res.status(200).json({
      id:           payload.sub,
      email:        payload.email,
      name:         payload.name,
      picture:      payload.picture,
      access_token: accessToken,
    });

  } catch (err) {
    // Invalid or expired JWT
    res.setHeader('Set-Cookie', cookie.serialize('pw_session', '', {
      maxAge: 0, path: '/'
    }));
    return res.status(401).json({ error: 'session_expired' });
  }
}

async function refreshAccessToken(refreshToken) {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: refreshToken,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
      }),
    });
    const data = await res.json();
    return data.access_token || null;
  } catch (e) {
    return null;
  }
}
