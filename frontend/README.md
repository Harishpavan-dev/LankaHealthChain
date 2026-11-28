# Frontend — Next.js 15 + React 19

One Next.js App Router application hosts all six role-scoped workspaces at `/patient`, `/doctor`, `/admin`, `/hospital-admin`, `/auditor`, and `/researcher`. Use `pnpm dev:frontend` from the repository root.

Authentication is Keycloak OIDC with authorization-code + PKCE; the server APIs also enforce role and resource scopes. `NEXT_PUBLIC_*` variables are browser-visible and **must never contain secrets**. Real medical information must not be used in the demo environment.

The frontend only displays Cardano verification after confirmed on-chain checks, and explicitly labels local-only consent as not being Midnight cryptographic proof.

## Build a release image

Run from the repository root using the browser-facing HTTPS URLs for your environment.

```sh
docker build -f infrastructure/docker/Dockerfile.frontend -t lhc-frontend \
  --build-arg NEXT_PUBLIC_OIDC_URL=https://identity.example.org \
  --build-arg NEXT_PUBLIC_OIDC_REALM=lankahealthchain \
  --build-arg NEXT_PUBLIC_OIDC_CLIENT_ID=lhc-web \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.org/api/v1 .
```

Serve the image on port `3001` behind your HTTPS reverse proxy. Configure the Keycloak client redirect and web origins and the API CORS allowlist for the same frontend origin. Rebuild the image when a browser-facing URL changes because Next.js embeds `NEXT_PUBLIC_*` values in the browser bundle during the build. [Next.js environment variable documentation](https://nextjs.org/docs/15/app/guides/environment-variables)

Use the [deployment checklist](../docs/testing/deployment-checklist.md) to track the requirements for handling real patient data.
