# SecurePrint

Upload a document, share a Job ID + access code with a print shop, and the file
deletes itself after printing or when the timer ends.

```
secureprint/
├── server/                     Node + Express API
│   └── src/
│       ├── index.js            app setup (helmet, cors, routes, cleanup loop)
│       ├── config.js           env + limits
│       ├── routes/jobs.js      all endpoints
│       ├── services/
│       │   ├── jobService.js   create / verify / print / delete / sweep
│       │   └── cleanup.js      runs the sweep every 15s
│       ├── storage/            cloudinaryStorage.js, localStorage.js (same interface)
│       ├── store/jobStore.js   JSON-file store (swap for a real DB later)
│       ├── middleware/         session (JWT) + error handler
│       └── lib/                ids/hashing, file-signature check, helpers
└── client/                     React + Vite
    └── src/
        ├── pages/              UploadPage (customer), ShopPage (shopkeeper)
        ├── components/         Ticket, Countdown, CodeInput, FileDropzone, DocumentPreview
        ├── hooks/              useCountdown, useConfig
        └── api.js              all fetch calls
```

## Run it

```bash
npm run install:all
cp server/.env.example server/.env     # then edit it
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:5000

With no Cloudinary keys in `server/.env`, files are saved to `server/.local-storage`
so you can demo immediately. Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and
`CLOUDINARY_API_SECRET` and the same code uses Cloudinary. The server logs which
one is active (`[storage] using ...`).

Set `JWT_SECRET` and `CODE_SECRET` to long random strings (`openssl rand -hex 32`).

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/jobs` | none | Upload file, returns Job ID + code (code shown once) |
| GET | `/api/jobs/:id/status` | none | Status for the customer's page (`active`, `locked`, `printed`, `expired`, `fileDeleted`) |
| POST | `/api/shop/verify` | none | Job ID + code, returns short-lived session token |
| GET | `/api/shop/jobs/:id/preview` | Bearer token | Server relays the file |
| POST | `/api/shop/jobs/:id/print` | Bearer token | Marks printed and deletes the file now |

## Security choices

- Cloudinary uploads use `type: "authenticated"`, so there is no public URL. The server
  fetches the file with a 60-second signed URL and relays it. The browser never gets a storage link.
- Codes are stored as an HMAC, never in plain text. Comparison is timing-safe.
- The Job ID is random (8 chars, ~40 bits). Wrong codes are counted per job and the job
  locks after `MAX_ATTEMPTS` (default 5). Per-IP rate limits sit on top.
- Session tokens last at most 10 minutes and never outlive the job. A token alone isn't
  enough: the job must still be active and its file not deleted.
- Printing deletes the file immediately and closes the job, so the token can't be reused.
- A file is only marked deleted after the storage provider confirms. Failed deletes are
  retried every 15 seconds.
- Uploads are limited to PDF/PNG/JPG, 10 MB, and checked by file signature, not just the
  Content-Type header.

## Demo script

1. **Send a file** page: upload a PDF with a 1-minute timer. Show the ticket.
2. **Print shop** page: enter a wrong code to show the "tries left" counter, then the right one.
3. Preview the document, press **Print**. The shop sees "file deleted"; switch back to the
   customer tab and it flips to "Printed. File deleted" on its own.
4. Upload another file and let the timer run out to show automatic deletion.
5. Say the limitation out loud: deletion removes the cloud copy, not anything a printer or
   browser already cached.

## Known limits (good "next steps" slide)

- The JSON store is single-process. Use MongoDB/Postgres/Redis for more than one server.
- Printing is simulated. A real build would call CUPS, PrintNode or a local print agent in
  the `/print` route.
- Shopkeepers aren't logged in. Add shop accounts so a job can be bound to one shop.
- Cloudinary accounts may restrict delivery of PDFs by default
  (Settings > Security > "PDF and ZIP files delivery"). The API download path used here
  should work regardless, but enable it if you see 401/403 from Cloudinary.
