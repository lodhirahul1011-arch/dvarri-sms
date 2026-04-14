# Render Deploy

Use Render as a **Static Site** for this frontend.

## Render settings

- Service type: `Static Site`
- Root directory: `project`
- Build command: `npm install && npm run build`
- Publish directory: `dist`

If you use the repo Blueprint, Render will read the root-level `render.yaml` automatically.

## Environment variables on Render

Set these on the Render service:

```text
VITE_SUPABASE_URL=https://vvopvfteonhnixxqvxms.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Do **not** put these SMS provider values on Render for the frontend:

```text
SMS_API_KEY
SMS_SENDER_ID
SMS_TEMPLATE_ID
SMS_BASE_URL
```

Those belong in **Supabase Edge Function secrets**, not in the Render frontend.

## Supabase secrets

Set these in Supabase for the `delivery-api` function:

```text
SMS_API_KEY
SMS_SENDER_ID
SMS_TEMPLATE_ID
SMS_BASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## Important

- The frontend uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Localhost-only dev proxy code is used only in development.
- Production Render deploy talks directly to Supabase.
- `VITE_SUPABASE_PUBLISHABLE_KEY` is not used by the current app.
