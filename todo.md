# Project TODO

- [x] Review the supplied Khmer homepage component against the current Next.js App Router frontend and installed Next.js guidance.
- [x] Replace the `/` page with the supplied KSIT public homepage structure and responsive navigation.
- [x] Preserve clear portal links that route to `/login` from desktop and mobile navigation.
- [x] Validate local production build and the `/` and `/login` routes.
- [x] Commit, push, redeploy, and verify the updated Vercel production homepage.
- [x] Add the Khmer registration-deadline announcement banner and enrollment status badge to the public homepage.
- [x] Add email and Telegram login options, including secure Telegram-session handling and demo role shortcuts.
- [x] Seed or reset the four user-authorized default demo accounts with correctly hashed passwords and active profiles.
- [x] Verify email login and dashboard routing for Admin, Manager, Teacher, and Student accounts.
- [x] Add automated coverage for the announcement utility, login behavior, and authentication responses.
- [x] Build, commit, push, deploy, and verify the updated Vercel frontend and backend flows.
- [ ] Review the existing role-management dashboard, authorization middleware, and Telegram identity data model.
- [x] Add a secure Telegram registration API that creates an unprivileged student profile by default and prevents self-selected elevated roles.
- [x] Add an admin-only API to list users and change roles to student, manager, teacher, or admin with audit-safe authorization.
- [x] Add a Telegram Mini App registration screen and an admin role-management interface for the approved flows.
- [x] Test registration defaults, denial of privilege escalation, admin promotion, and role-based routing.
- [ ] Commit, deploy, and verify the end-to-end registration and role-management release.
