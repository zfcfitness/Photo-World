// api/thumb.js
// Proxies Drive file requests through the server.
// This solves the CORS problem AND lets us resize images server-side
// so the browser only downloads a small thumbnail, not the full original.
//
// Usage: GET /api/thumb?id=DRIVE_FILE_ID&size=512

import * as cookie from 'cookie';
import { jwtVerify } from 'jose';

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
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

  const { id, size = '640' } = req.query;
  if (!id) return res.status(400).json({ error: 'missing id' });

  try {
    // First try thumbnailLink (fast, pre-scaled)
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}?fields=thumbnailLink,hasThumbnail,mimeType`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const meta = await metaRes.json();

    let imageUrl;
    if (meta.thumbnailLink) {
      // Use Drive's pre-generated thumbnail, upgraded to requested size
      imageUrl = meta.thumbnailLink.replace(/=s\d+(-c)?$/, `=s${size}`);
    } else {
      // No thumbnail — fetch full file (Drive auto-converts HEIC → JPEG)
      imageUrl = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
    }

    // Fetch the image from Google
    const imgRes = await fetch(imageUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!imgRes.ok) {
      return res.status(imgRes.status).json({ error: 'upstream_error' });
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await imgRes.arrayBuffer();

    // Cache for 1 hour — thumbnails don't change
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Type', contentType);
    res.send(Buffer.from(buffer));

  } catch (err) {
    console.error('Thumb proxy error:', err);
    res.status(500).json({ error: 'server_error' });
  }
}
