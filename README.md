# GinFilm

GinFilm is a personal repository maintained by [tranthaigin](https://github.com/tranthaigin) for developing a cinema booking and management application.

Repository: [tranthaigin/GinFilm](https://github.com/tranthaigin/GinFilm)

## Features

- Browse movies, cinemas, showtimes, and promotions.
- Select seats, book tickets, and manage booking history.
- Manage movies, theaters, customers, staff, and revenue.
- Support staff ticket sales and ticket scanning.

## Project structure

- `movie-frontend/`: React, Vite, Tailwind CSS, and Zustand.
- `movie-backend/`: Java and Spring Boot REST API.
- `docs/`: architecture, requirements, UI, and data documentation.
- `.agents/`: development rules and workflows.

## Local development

### Backend

Use Java 21. Configure `movie-backend/src/main/resources/application.properties` for your local database and services, then run:

```powershell
cd movie-backend
.\mvnw.cmd spring-boot:run
```

Local `application.properties` files are ignored by Git. Production configuration uses environment variables; passwords and API keys must be supplied through the deployment environment.

Before using the production profile, configure `JWT_SECRET`, `MAIL_PASSWORD`, `BREVO_API_KEY`, `CHAT_ENCRYPTION_KEY`, `VNPAY_HASH_SECRET`, `STRIPE_SECRET_KEY`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. These settings have no embedded credential defaults. The S3 configuration also requires `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

### Frontend

Use a Node.js version supported by the installed Vite version. Copy `.env.example` to `.env` inside `movie-frontend` and configure the API URL, then run:

```powershell
cd movie-frontend
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
