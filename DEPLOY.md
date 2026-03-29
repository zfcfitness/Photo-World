# Photo World — Vercel Deployment Guide

## What this is
A Node.js + static frontend app. Vercel hosts both for free.
Users visit your URL, click "Sign in with Google", and go straight into their photo world.
No Client ID to paste. No setup. Works on any device.

---

## Step 1 — Push to GitHub

1. Create a new GitHub repo (e.g. `photo-world`)
2. Upload all files keeping the folder structure:
   ```
   photo-world/
   ├── api/
   │   ├── auth-start.js
   │   ├── auth-callback.js
   │   ├── me.js
   │   ├── signout.js
   │   ├── thumb.js
   │   └── drive.js
   ├── public/
   │   └── index.html
   ├── package.json
   ├── vercel.json
   └── .env.example
   ```

---

## Step 2 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New → Project**
3. Import your `photo-world` repository
4. Click **Deploy** (default settings are correct)
5. Note your URL: `https://photo-world-xxxx.vercel.app`

---

## Step 3 — Generate a JWT secret

Open Terminal and run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output — this is your `JWT_SECRET`.

---

## Step 4 — Add environment variables in Vercel

In your Vercel project → **Settings → Environment Variables**, add:

| Key | Value |
|-----|-------|
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth Client Secret |
| `APP_URL` | `https://your-app.vercel.app` (your exact Vercel URL) |
| `JWT_SECRET` | The hex string from Step 3 |

Click **Save** after adding all four.

---

## Step 5 — Update Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. **APIs & Services → Credentials** → edit your OAuth Client ID
3. Under **Authorized JavaScript origins** add:
   ```
   https://your-app.vercel.app
   ```
4. Under **Authorized redirect URIs** add:
   ```
   https://your-app.vercel.app/auth/callback
   ```
5. Click **Save**

---

## Step 6 — Redeploy

In Vercel, go to **Deployments → Redeploy** (so it picks up the new env vars).

---

## Step 7 — Test

Open `https://your-app.vercel.app` — you should see the Photo World login screen.
Click **Sign in with Google** → authorize → quiz → golden hour world with your photos.

---

## Sharing with family

Just send them the URL. Each person:
1. Opens the link
2. Clicks **Sign in with Google** with their own Google account
3. Picks their folder in the quiz
4. Explores their world

To give family access to your Drive folder:
- Right-click the folder in Google Drive → Share
- Enter their email → Viewer access → Send

---

## Custom domain (optional)

In Vercel → **Settings → Domains** → add your own domain (e.g. `photoworld.family`).
Then update `APP_URL` in env vars and add the new domain to Google Cloud Console.

---

## Local development

```bash
npm install -g vercel
vercel dev
```
This runs the full stack (API + frontend) locally at `http://localhost:3000`.
Add `http://localhost:3000` to Google Cloud Console authorized origins and redirect URIs.
