# API surface

Phase 1 uses **server actions** for UI mutations and one route handler. All share the same validation, authorization, rate-limit and error rules (VYRO.md §7). JSON route APIs from §7.2 are added per phase.

## Route handlers

| Method | Path                                                            | Auth              | Purpose                                                                                                                              |
| ------ | --------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/auth/callback?code=…&next=…` or `?token_hash=…&type=…&next=…` | none (link token) | Completes email confirmation and password recovery. `next` passes through `safeNextPath()`. Failures redirect to `/login?error=link` |

Error body for JSON routes:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many attempts. Please try again later.",
    "requestId": "…"
  }
}
```

Codes: `VALIDATION_FAILED` 400 · `UNAUTHENTICATED` 401 · `FORBIDDEN` 403 · `RESOURCE_NOT_FOUND` 404 · `CONFLICT` 409 · `RATE_LIMITED` 429 (+ `Retry-After`) · `INTERNAL` 500 · `DEPENDENCY_UNAVAILABLE` 503.

## Server actions (`src/server/actions`)

| Action                       | Input (Zod)                  | Auth    | Rate limit                                  | Audit                                   |
| ---------------------------- | ---------------------------- | ------- | ------------------------------------------- | --------------------------------------- |
| `signUpAction`               | displayName, email, password | none    | `signupByIp`                                | —                                       |
| `signInAction`               | email, password, next        | none    | `loginByIp`, `loginByEmail`                 | —                                       |
| `signOutAction`              | —                            | session | —                                           | —                                       |
| `signOutEverywhereAction`    | —                            | user    | `globalSignOutByUser`                       | `auth.sign_out_everywhere`              |
| `requestPasswordResetAction` | email                        | none    | `passwordResetByIp`, `passwordResetByEmail` | —                                       |
| `updatePasswordAction`       | password, confirm            | user    | —                                           | `auth.password_changed`                 |
| `completeOnboardingAction`   | handle, favouriteSports[]    | user    | `profileUpdateByUser`                       | `profile.handle_set`                    |
| `updateProfileAction`        | handle, displayName, bio     | user    | `profileUpdateByUser`                       | `profile.handle_changed` (when changed) |

Signup, login and reset responses do not reveal whether an email is registered.

Limits are defined in `src/lib/rate-limit/policies.ts`.
