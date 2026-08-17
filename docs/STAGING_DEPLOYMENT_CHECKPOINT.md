# Staging Deployment Configuration Checkpoint

**Recorded:** 2026-08-17 (GMT+7)

The Vercel project `ksit-dorm-api-staging` has been configured for its production-scoped staging deployment with the following required variable names: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `JWT_SECRET`, `GOOGLE_DRIVE_ROOT_FOLDER_ID`, `NODE_ENV`, and `ALLOW_DEMO_CREDENTIAL_FALLBACK`.

All values were supplied and authorized by the project owner. Vercel confirmed that all seven variables were added and created deployment `43Xx5w7dw1D8D6Cg5BwLEstRUD2U` from the current `main` source deployment. The public staging API domain is `https://ksit-dorm-api-staging.vercel.app`.

No secret values are stored in this document.

Next verification: wait for the deployment to become ready, confirm the health/authentication endpoints, and execute the isolated staging lifecycle test for Sok Sokha.

> Configuration and redeployment target only the staging API project and do not modify production data.

| Checkpoint | Status |
|---|---|
| Staging runtime variables saved | Complete |
| Redeployment created | Complete |
| Deployment ready / API authentication verified | Complete |
| Sok Sokha lifecycle execution | Complete |
| Repository-safe backup assets committed | Pending |
