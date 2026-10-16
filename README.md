# GinFilm

GinFilm is a personal repository maintained by [tranthaigin](https://github.com/tranthaigin) for developing a cinema booking and management application.

Repository: [tranthaigin/GinFilm](https://github.com/tranthaigin/GinFilm)

## Features

- Browse movies, cinemas, showtimes, and promotions.
- Select seats, book tickets, and manage booking history.
- Manage movies, theaters, customers, staff, and revenue.
- Support staff ticket sales and ticket scanning.

## Project structure

- `frontend/`: React, Vite, Tailwind CSS, and Zustand.
- `backend/`: Java and Spring Boot REST API.
- `docs/`: architecture, requirements, UI, and data documentation.
- `.agents/`: development rules and workflows.

## Local development

### Backend

Use Java 21. Configure `backend/src/main/resources/application.properties` for your local database and services, then run:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Local `application.properties` files are ignored by Git. Production configuration uses environment variables; passwords and API keys must be supplied through the deployment environment.

Before using the production profile, configure the PostgreSQL connection, `JWT_SECRET`, and `CHAT_ENCRYPTION_KEY`. Supply `MAIL_USERNAME`/`MAIL_PASSWORD` or `BREVO_API_KEY` for email, Stripe/VNPAY credentials for payments, Cloudinary credentials for uploads, and AWS credentials for private S3 media. Optional providers remain unavailable until configured; these settings have no embedded credential defaults.

### Frontend

Use a Node.js version supported by the installed Vite version. Copy `.env.example` to `.env` inside `frontend` and configure the API URL, then run:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open the URL printed by Vite.

## Documentation

- [Project rules](docs/PROJECT-RULES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Requirements](docs/PRD.md)
- [UI guidelines](docs/ui/README.md)
- [Data documentation](docs/data/README.md)

## Development workflow

Use `main` as the primary branch, create feature branches when needed, and use Conventional Commits. Review changes and run the checks relevant to each change before pushing.

Environment files, local credentials, dependencies, build outputs, and personal IDE settings are excluded from the repository. `.env.example` files may be committed when they contain only placeholders.

## GinFilm deployment settings

Set `FRONTEND_URL`, `BACKEND_URL`, and `CORS_ALLOWED_ORIGINS` to the actual deployed addresses. Set `VNPAY_RETURN_URL` if the payment callback differs from `FRONTEND_URL/payment-success`. Local defaults use `http://localhost:5173` for the frontend and `http://localhost:8080` for the backend.

Set `MAIL_USERNAME` to your verified sending address and `CONTACT_EMAIL` to the address receiving contact and newsletter messages. Supply the corresponding mail credentials separately.

For the frontend, set `VITE_API_BASE_URL` to the backend API URL in production and `VITE_CONTACT_EMAIL` to the public support email. If the public email is empty, the UI directs visitors to the contact form. Vercel uses its environment settings for the API URL; `vercel.json` only provides the SPA fallback.

GinFilm uses its own `ginfilm-auth` and `ginfilm-booking` browser storage keys. After the rebrand, users may need to sign in again and start a new local booking selection. Server data is unchanged.

Google login is optional: configure the same OAuth client ID in backend `GOOGLE_CLIENT_ID` and frontend `VITE_GOOGLE_CLIENT_ID`. The button is disabled until configured.

For now, online movies can use a direct public MP4 URL in the movie form's video field. Click “Dùng video mẫu” for a development sample or “Xem thử link MP4” to check your URL, then save the movie normally. The sample is from [MDN's video examples](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video). Previewing does not create or purchase a ticket. S3 setup and replacement of the Stripe account are deferred for a later phase.

## Verification

Run `npm.cmd run lint` and `npm.cmd run build` in `frontend`. With Vite running on port 5178, run `node scripts/smoke.mjs` and `node scripts/lifecycle-smoke.mjs`; `SMOKE_URL` can override the URL. Browser tests use mocked API responses and do not prove provider availability.

`node scripts/video-url-smoke.mjs` checks actual playback of the public MP4 sample, seek/pause, invalid URLs, and the movie form preview/save payload. It needs internet access to the sample; application API responses are mocked and the production database is untouched.

Run `mvnw.cmd test` in `backend`. Unit tests run normally; the application context test runs only with an explicitly selected test database. Set `GINFILM_TEST_DATABASE_URL` to a PostgreSQL database named `ginfilm_test_*` or `ginfilm_review_*`, plus `GINFILM_TEST_DATABASE_USER` and `GINFILM_TEST_DATABASE_PASSWORD`. Never use the development/production database for this test: startup migrations and jobs may write to it.

For an existing database, review and apply `backend/src/main/resources/db/security-repair.sql` before deploying these changes. The account `version` column protects concurrent balance and account updates. A conflicting transaction returns an error and must be retried after refreshing its state.
