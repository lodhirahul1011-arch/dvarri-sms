# Supabase Deploy

This project is currently pointed at the Supabase project ref stored in `VITE_SUPABASE_URL` inside `.env`.

## One-time requirements

1. Install or use the Supabase CLI.
2. Authenticate with a personal access token:

```powershell
$env:SUPABASE_ACCESS_TOKEN="your-supabase-access-token"
```

3. Provide the remote database password so migrations can be linked and pushed:

```powershell
$env:SUPABASE_DB_PASSWORD="your-remote-db-password"
```

## Deploy everything

```powershell
npm run supabase:deploy
```

The script will:

- link the local `supabase` directory to the current project ref
- push database migrations
- sync `SMS_API_KEY`, `SMS_SENDER_ID`, `SMS_TEMPLATE_ID`, and `SMS_BASE_URL` from `.env`
- deploy the `delivery-api` Edge Function with API bundling

## Optional flags

Run the script directly if you want to skip some steps:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-supabase.ps1 -SkipMigrations
```


## Important for browser calls

This function is meant to be called directly from the browser, so it must be deployed without JWT verification. This project now includes `verify_jwt = false` in `supabase/config.toml`, and the deploy script uses `--no-verify-jwt` for `delivery-api`.
