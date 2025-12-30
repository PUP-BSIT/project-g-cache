# Project Structure

## Repository Layout
```
/
├── pomodify-backend/     # Spring Boot API
├── pomodify-frontend/    # Angular SPA
├── document/             # Project documentation (ERD, UML, proposals)
├── deploy-documentation/ # CI/CD and deployment guides
└── .github/              # GitHub Actions workflows
```

## Backend Architecture (Clean/Layered)
```
pomodify-backend/src/main/java/com/pomodify/backend/
├── application/      # Use cases, DTOs, mappers, service interfaces
├── domain/           # Entities, repositories, domain logic
├── infrastructure/   # External integrations (Firebase, email, security config)
├── presentation/     # REST controllers, request/response handling
└── PomodifyApiApplication.java
```

### Backend Conventions
- **Entities**: `domain/` - JPA entities with Lombok annotations
- **Repositories**: `domain/` - Spring Data JPA interfaces
- **Services**: `application/` - Business logic implementation
- **Controllers**: `presentation/` - REST endpoints with `@RestController`
- **DTOs**: `application/` - Request/Response objects
- **Config**: `infrastructure/` - Security, Firebase, external services

### Database Migrations
- Location: `src/main/resources/db/migration/`
- Naming: `V{number}__{description}.sql` (Flyway convention)

## Frontend Architecture (Feature-based)
```
pomodify-frontend/src/app/
├── core/             # Singleton services, guards, interceptors, config
│   ├── config/       # API configuration
│   ├── guards/       # Route guards (auth)
│   ├── interceptors/ # HTTP interceptors (auth token, error handling)
│   └── services/     # Application-wide services
├── pages/            # Route components (one folder per page/feature)
│   ├── dashboard/
│   ├── session-timer/
│   ├── activities/
│   ├── settings/
│   ├── report/
│   └── ...
├── shared/           # Reusable components, modules, services, styles
│   ├── components/   # Reusable UI components (modals, header, footer)
│   ├── modules/      # Shared Angular modules
│   ├── services/     # Shared services (timer)
│   └── styles/       # Global SCSS partials
└── verify/           # Email verification feature
```

### Frontend Conventions
- **Components**: Standalone components (Angular 20+ style)
- **File naming**: `{name}.ts`, `{name}.html`, `{name}.scss` (no `.component` suffix)
- **Services**: Injectable with `providedIn: 'root'` for singletons
- **Routing**: Lazy-loaded routes defined in `app.routes.ts`
- **State**: Signals for local state, RxJS for async streams

## Test Structure
- **Backend unit tests**: `pomodify-backend/src/test/java/com/pomodify/backend/`
- **Backend integration tests**: `pomodify-backend/src/test/java/com/pomodify/integration/`
- **Frontend unit tests**: Co-located `*.spec.ts` files
- **Frontend e2e tests**: `pomodify-frontend/e2e/`