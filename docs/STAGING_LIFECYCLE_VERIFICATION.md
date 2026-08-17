# Staging Lifecycle Verification — Sok Sokha

| Field | Value |
|---|---|
| Environment | `ksit-dormitory-staging-20260815` (`iegshgtjsnoqbgdioonr`) |
| API | `https://ksit-dorm-api-staging.vercel.app` |
| Executed | 2026-08-17 (GMT+7) |
| Scope | Authorized, isolated staging validation only; no production data was changed. |

> The lifecycle test used the staging student profile **សុខ សុខា / SOK SOKHA** and generated clearly labelled synthetic documents. The generated artifacts are not government IDs, real photographs, signatures, or legal documents.

| Stage | Endpoint / action | Verified outcome |
|---|---|---|
| Student authentication | `POST /api/auth/login` | Student role token issued successfully. |
| Draft | `POST /api/applications/save-draft` | Draft application created for academic year `2025-2026`. |
| Reference uploads | Three protected multipart upload calls | Synthetic photo, national ID, and family-book artifacts accepted by Supabase Storage. |
| Official form | `POST /api/applications/submit-form` | Official four-page Khmer PDF generated; application became `pending_signed_doc`. |
| PDF access | Authenticated document stream | Generated PDF served as `application/pdf`. |
| Signed document | `POST /api/applications/upload-signed` | Synthetic signed-application PDF accepted; application became `under_review`. |
| Manager authentication | `POST /api/auth/login` | Manager role token issued successfully. |
| Manager review | `GET /api/manager/applications?status=under_review` | Manager view exposed all five document flags. |
| Manager decision | `PATCH /api/manager/applications/:id/review` | Application approved successfully. |
| Manual placement | `POST /api/room-assignments/manual-move` | Student assigned to `STG-TEST` Room `101`, bed `1`. |
| Student final view | `GET /api/applications/my-application` | Student view reports final status `assigned`. |

## Final Staging State

| Item | Value |
|---|---|
| Application ID | `8b5e6113-0012-433c-bf78-f139a12d8cd5` |
| Final application status | `assigned` |
| Room | `STG-TEST` / `101` |
| Room occupancy | `0 → 1` |
| Assignment ID | `b438f8d5-3990-42e2-a1f5-329fe7cd5032` |
| Active assignment | `true` |

## Storage Synchronization Note

The manager approval persisted successfully. The optional Google Drive archive branch returned the expected non-blocking warning because staging lacks the dedicated archive destination configuration:

> `A destination Google Drive folder ID is required for this operation.`

This does **not** invalidate the lifecycle approval, document storage, or Room 101 assignment. To test approved-application archive creation in staging, configure the legacy Google Drive sync credentials and `GOOGLE_DRIVE_APPROVED_STUDENTS_FOLDER_ID` for the staging API, then redeploy and run a fresh isolated application.

## Staging Schema Alignment

Before the successful rerun, the API exposed a missing `room_applications.drive_archive_url` column. The staging project received an additive, idempotent hybrid-storage update that added `drive_archive_url` and `utility_bills.drive_report_url`, and ensured the `student-documents`, `student-avatars`, and `receipts` buckets exist. No production schema or data was changed.

## Post-Workflow Validation

A direct read-only validation query against the staging database confirmed the persisted final state:

| Check | Verified value |
|---|---|
| Application status | `assigned` |
| Manager review timestamp | Present |
| Active assignment | `true` |
| Assigned bed | `1` |
| Building / room | `STG-TEST` / `101` |
| Room capacity | `4` |
| Room occupied count | `1` |

The backend regression suite was also rerun after the staging migration and lifecycle execution.

| Command | Tests | Passed | Failed |
|---|---:|---:|---:|
| `cd backend && npm test` | 44 | 44 | 0 |
