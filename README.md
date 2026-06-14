# 🗻 Japan 2027 — Trip Tracker

A self-contained, **offline-first** trip planner & tracker for two people, built to live on **GitHub Pages**. No build step, no framework — just open `index.html`. Optional **live cloud sync** lets you and a friend edit the same trip in real time from a browser, with your data **encrypted in the browser** so the public page never exposes your plans.

Pre-loaded with verified **February 2027 Japan** events, hard deadlines, winter packing list and a pre-trip checklist — useful the moment you open it.

---

## ✨ What's inside

| Module | What it does |
|---|---|
| **Dashboard** | Trip countdown, upcoming deadlines (incl. ticket-lottery dates), watchlist, “next up”. |
| **Events & Tickets** | The headline feature. Track events whose dates you're *waiting on* (`Date TBD`), then walk Japan's lottery → purchase pipeline (`Not on sale → Lottery open → Entered → Won/Lost → Purchased → Have tickets`) with lottery-close & payment-deadline countdowns. Confirmed events drop into the itinerary. |
| **Lists** | Sightseeing · Food · Nightlife · Activities — grouped by city, with status, tags, reservation/hours flags and a Japanese-name field for taxis. |
| **Idea Inbox** | Frictionless capture (paste links or thoughts), triage later, promote to a list/event/itinerary. |
| **Itinerary** | Day-by-day plan. Drag items onto days (or use the date menu), per-day lodging + notes, busy-day warnings, parking lot for unscheduled items. |
| **Budget** | Per-item cost, category totals, JPY⇄home currency, 50/50 or one-person split, and an automatic **settle-up**. |
| **Map** | Every saved place on an OpenStreetMap map, color-coded by type. One-click “locate missing” geocoding. |
| **Discovery** | Curated Japan-Feb picks + smart nudges (“this day is empty”, “more in Tokyo”, “must-do without tickets”). |
| **Logistics** | Flights, lodging, transport (JR Pass helper), document vault (links/notes), packing list, pre-trip checklist. |
| **Collaboration** | “Added by” attribution, 👍/👎 voting and per-item comments throughout. |

---

## 🚀 Deploy to GitHub Pages (5 minutes)

1. Create a new GitHub repo (e.g. `japan-2027`).
2. Upload everything in this folder (or `git push`) to the repo root.
   ```bash
   git init
   git add .
   git commit -m "Japan 2027 trip tracker"
   git branch -M main
   git remote add origin https://github.com/<you>/japan-2027.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `root` → Save.**
4. Wait ~1 minute. Your site is live at `https://<you>.github.io/japan-2027/`.
5. DM your friend the link. (On a **free** GitHub plan the repo/site is public — that's fine: turn on cloud sync below and your data is encrypted, so the public page shows nothing without the passphrase.)

> 💡 It also works by just **double-clicking `index.html`** locally — but in that mode data stays on that one device (cloud sync needs the `https://` Pages URL).

---

## ☁️ Optional: live two-person sync (free, ~15 min, one-time)

This is what makes you and your friend see each other's edits live. Off by default.

### 1. Create a free Supabase project
- Go to <https://supabase.com> → **New project** (free tier is plenty).
- Once it's ready, open **Project Settings → API** and copy:
  - **Project URL** (`https://xxxx.supabase.co`)
  - **anon / publishable key** (safe to expose — see security note).

### 2. Create the table
- Open **SQL Editor → New query**, paste the contents of [`supabase-setup.sql`](supabase-setup.sql), and **Run**.
- (Optional) **Database → Replication** → enable realtime for the `trip_state` table for instant updates. If you skip this, the app still syncs by polling every ~25s.

### 3. Connect both devices
- Open the site → **Settings → Cloud sync**:
  - Paste **Project URL** and **anon key**.
  - Pick a **Room name** (any shared word, e.g. `jeremy-japan`).
  - Pick a **shared passphrase** (this encrypts everything).
  - **Test connection**, then **Save & connect**.
- DM your friend three things: **the site URL**, **the room name**, and **the passphrase**. They paste the same four values and they're in. The sidebar pill turns green (“Cloud synced”).

### 🔒 Security note (important & by design)
The anon key is **meant to be public** — it ships in the browser. Your protection is **two layers**:
1. **Client-side encryption** — all data is encrypted with AES-GCM using a key derived from your **shared passphrase** before it leaves the browser. The database only ever stores ciphertext. Anyone who grabs the key and reads the row sees gibberish without the passphrase.
2. **Row Level Security** — the SQL script enables RLS. Because the payload is already encrypted, the included policy allows anon read/write to *this table only*; the encryption is the real wall.

**Never commit the passphrase to the repo.** Share it only over DM. If either of you forgets it, the cloud data can't be decrypted (export a backup from Settings → Data).

---

## 🔁 No-backend sync (zero setup fallback)

Don't want a backend? Use **Settings → Your data**:
- **Export JSON** — download the whole trip as a file.
- Send it to your friend over DM.
- They **Import JSON** → *Merge* (adds new items, keeps theirs) or *Replace*.

Manual, but free and private. Best when you take turns rather than editing at the same time.

---

## 🧳 February 2027 — baked-in facts

The starter data includes (all editable): Sapporo Snow Festival (~Feb 4–11), Asahikawa & Otaru snow events, Setsubun (Feb 3), Saidaiji “Naked Man” festival (~Feb 20, date flagged as uncertain), plum-blossom season, plus deadline countdowns for **booking Sapporo lodging by ~Sept 2026**, the **Oct 1 2026 JR Pass price rise**, **Nov 1 2026 tax-free change**, the **Lunar New Year (Feb 6 2027) crowd warning**, and Japanese national holidays. Verify exact festival dates ~6 months out as organizers publish them.

---

## 🗂 Project structure

```
index.html          App shell + script includes
css/styles.css      Styling (dark default + light toggle)
js/util.js          Helpers (dates, DOM, money, countdowns)
js/data.js          Constants + seeded Feb-2027 starter data
js/store.js         State, localStorage, undo, export/import
js/sync.js          Optional Supabase sync + in-browser encryption
js/views.js         Every screen
js/app.js           Bootstrap, nav, theme, modal/toast/form helpers
supabase-setup.sql  One-time backend setup
```

No dependencies to install. Leaflet (map) and Supabase (sync) load from CDNs only when those features are used; everything else works offline.

## ⌨️ Tips
- Press **`/`** to jump to the search box on any list.
- The floating **＋** button (bottom-right) is quick-capture for ideas from anywhere.
- Set **your name** in Settings so “added by”, comments and the budget split are labeled correctly.
