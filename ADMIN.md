# Admin panel

## Create your first admin

1. Register a normal account in the app.
2. Grant it admin from the project folder (uses `DATABASE_URL` from `.env`, so run it against production too):

```bash
npm run admin:make -- you@example.com            # grant admin (also marks the email verified)
npm run admin:make -- you@example.com revoke     # remove admin
```

3. Log in and open **Account menu > Admin panel** (or go to `/admin`).

Further admins are promoted from **Admin > Users** (the user's email must be verified first).
