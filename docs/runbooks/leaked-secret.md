# Suspected leaked secret

**Applies to:** Supabase service-role/secret key, `RATE_LIMIT_SALT`, and later LiveKit and provider credentials.

## Immediate actions

1. **Rotate** the secret in its provider dashboard (Supabase: Project Settings → API keys; create a new secret key, then revoke the old one).
2. Update the value in the hosting platform's secret manager for each affected environment, then redeploy.
3. If the service-role key leaked, treat RLS as bypassed for the exposure window. Review `audit_log` and Postgres logs for unexpected writes.
4. If the leak came from git history, rotating the secret is the fix; rewriting history alone is not enough.

## Diagnosis

- How did it leak (commit, log line, client bundle, screenshot)? CI greps client bundles and runs gitleaks; check why they didn't catch it.

## Follow-up

- Add a regression check (lint rule, CI grep, logger redaction key).
- Record the incident and the exposure window.
