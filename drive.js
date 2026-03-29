// api/drive.js
// Proxies Drive API requests server-side.
// Keeps the access token out of the browser and centralises API calls.
// Usage: GET /api/drive?path=files&[queryparams]

import * as cookie from 'cookie';
import { jwtVerify } from 'jose';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  // Authenticate
  const cookies = cookie.parse(req.headers.cookie || '');
  const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET);
  let accessToken;

  try {
    const { payload } = await jwtVerify(cookies.pw_session || '', jwtSecret);
    accessToken = payload.access_token;
  } catch {
    return res.status(401).json({ error: 'not_signed_in' });
  }

  // Build Drive API URL from query params
  // Remove our internal 'path' param, forward everything else
  const { path = 'files', ...params } = req.query;
  const driveUrl = `https://www.googleapis.com/drive/v3/${path}?${new URLSearchParams(params)}`;

  try {
    const driveRes = await fetch(driveUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await driveRes.json();
    res.status(driveRes.status).json(data);
  } catch (err) {
    console.error('Drive proxy error:', err);
    res.status(500).json({ error: 'server_error' });
  }
}
