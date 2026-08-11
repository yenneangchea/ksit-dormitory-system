# How to Get Your Supabase API Key

The API key I have is incomplete. Follow these steps to get the correct key:

## Step 1: Go to Your Supabase Dashboard

Open: https://supabase.com/dashboard/project/ukdpgzbzrzosbxvsxifc

## Step 2: Navigate to Project Settings

1. Click on **Settings** (gear icon) in the left sidebar
2. Click on **API** section

## Step 3: Copy the Anon Key

Look for **Project API keys** section:

- **Project URL:** `https://ukdpgzbzrzosbxvsxifc.supabase.co` ✅ (We have this)
- **anon public:** This is what we need! It's a long JWT token starting with `eyJ...`

It should look like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrZHBnemJ6cnpvc2J4dnN4aWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NTM0OTgsImV4cCI6MjA1MTEyOTQ5OH0.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## Step 4: Update the Backend .env File

Once you have the complete key:

1. Open `backend/.env`
2. Replace the `SUPABASE_ANON_KEY` value with the complete key
3. Save the file
4. Restart the backend server

## Quick Command to Restart Backend

```bash
# Stop current backend (close the terminal or press Ctrl+C)
# Then run:
cd backend
npm start
```

---

**What you provided was:** `sb_publishable_QpFoATIdqsnRnQC1TfPO9A_mOaJGDzi`

This appears to be a different type of key. We need the **JWT anon key** that's much longer.

## Screenshot Guide

When you open the API settings, you'll see:

```
Project API keys
┌─────────────────────────────────────────────────────┐
│ anon public                                         │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...            │
│ [Copy button]                                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ service_role secret                                 │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...            │
│ [Copy button]                                       │
└─────────────────────────────────────────────────────┘
```

**Copy the "anon public" key!**
