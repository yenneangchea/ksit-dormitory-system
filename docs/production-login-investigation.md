# Production Login Investigation

## Verified finding — 17 August 2026

The live login bundle served by `https://ksit-dorm.vercel.app/login` has `https://ksit-dorm-api.vercel.app` compiled as its API base URL. The Vercel workspace currently connected to this task contains only the `ksit-dormitory-system` frontend project, where `POST /api/auth/login` returns a Next.js 404 response. Consequently, authentication still depends on the separate `ksit-dorm-api.vercel.app` deployment; that deployment must be brought under the same controlled release path or replaced by a correctly configured API route before Super Admin login can be validated.
