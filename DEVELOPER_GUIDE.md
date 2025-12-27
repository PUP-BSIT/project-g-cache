# 📚 POMODIFY DEVELOPER GUIDE

## Table of Contents
- [1. Project Overview](#1-project-overview)
- [2. Project Structure](#2-project-structure)
- [3. Architecture](#3-architecture)
- [4. Getting Started](#4-getting-started)
- [5. API Reference](#5-api-reference)
- [6. Database Schema](#6-database-schema)
- [7. Frontend Services](#7-frontend-services)
- [8. Testing](#8-testing)
- [9. CI/CD Pipeline](#9-cicd-pipeline)
- [10. Common Development Tasks](#10-common-development-tasks)
- [11. Troubleshooting](#11-troubleshooting)
- [12. Coding Standards](#12-coding-standards)
- [13. Useful Resources](#13-useful-resources)

---

## 1. Project Overview

**Pomodify** is a full-stack Pomodoro productivity tracker application that helps users focus with customizable timers, activity grouping, and progress tracking.

### Tech Stack Summary

| Layer | Technology |
|-------|------------|
| **Frontend** | Angular 20, TypeScript, SCSS, Angular Material |
| **Backend** | Spring Boot 3.5, Java 21, PostgreSQL |
| **Authentication** | JWT (httpOnly cookies), Google OAuth2 |
| **Database** | PostgreSQL with Flyway migrations |
| **Push Notifications** | Firebase Cloud Messaging (FCM) |
| **CI/CD** | GitHub Actions, Docker, EC2 |
| **Security** | Trivy scanning, Cosign image signing, SBOM generation |

### Live URLs
- **Production Site**: https://pomodify.site
- **API Base URL**: https://api.pomodify.site/api/v2

---

## 2. Project Structure

```
pomodify/
├── pomodify-frontend/          # Angular 20 SPA
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/           # Services, guards, interceptors, config
│   │   │   ├── pages/          # Route components (dashboard, activities, etc.)
│   │   │   ├── shared/         # Reusable components, modals, services
│   │   │   └── verify/         # Email verification component
│   │   ├── assets/             # Images, sounds
│   │   └── environments/       # Environment configs
│   ├── e2e/                    # Playwright E2E tests
│   └── Dockerfile
│
├── pomodify-backend/           # Spring Boot API
│   ├── src/main/java/com/pomodify/backend/
│   │   ├── application/        # Commands, services, validators, events
│   │   ├── domain/             # Entities, repositories, enums, value objects
│   │   ├── infrastructure/     # Config, security, mail, JPA repos
│   │   └── presentation/       # Controllers, DTOs, mappers
│   ├── src/main/resources/
│   │   ├── db/migration/       # Flyway SQL migrations (V1-V9)
│   │   └── application.properties
│   └── Dockerfile
│
├── document/                   # Project documentation, ERD, UML
├── deploy-documentation/       # CI/CD guides and checklists
└── .github/workflows/          # CI (ci.yml) and Deploy (deploy.yml)
```

---

## 3. Architecture

### Backend Architecture (Clean/Layered)

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  Controllers → DTOs → Mappers                               │
│  (REST endpoints, request/response handling)                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│  Services → Commands → Validators → Events                  │
│  (Business logic orchestration, use cases)                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                            │
│  Entities → Repositories (interfaces) → Value Objects       │
│  (Core business rules, domain models)                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                       │
│  JPA Repos → Security Config → Mail → Firebase              │
│  (External integrations, persistence)                       │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Architecture (Angular Standalone)

```
┌─────────────────────────────────────────────────────────────┐
│                       PAGES (Routes)                         │
│  Landing → Login → Signup → Dashboard → Activities →        │
│  Sessions → Settings → Reports → Profile                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    CORE SERVICES                             │
│  Auth → Activity → Session → Dashboard → Settings →         │
│  Report → FCM → Notification → Timer                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   SHARED COMPONENTS                          │
│  Modals (Create/Edit/Delete Activity, Session, Note)        │
│  Header → Footer → Dialogs → Time Pickers                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Getting Started

### Prerequisites
- **Node.js** 20+
- **Java** 21 (Temurin recommended)
- **Maven** 3.9+
- **PostgreSQL** 15+
- **Docker** (for containerized development)

### Frontend Setup

```bash
cd pomodify-frontend
npm install
npm start                    # Runs on http://localhost:4200
```

**Environment Configuration:**
- Edit `src/environments/environment.ts` for local development
- API base URL is configured in `src/app/core/config/api.config.ts`

### Backend Setup

```bash
cd pomodify-backend

# 1. Copy environment template
cp .env.example .env

# 2. Edit .env with your values:
#    DB_URL, DB_USERNAME, DB_PASSWORD
#    JWT_SECRET (min 32 chars)
#    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (for OAuth)
#    SMTP_USERNAME, SMTP_PASSWORD (for email)

# 3. Run the application
./mvnw spring-boot:run
```

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DB_URL` | PostgreSQL JDBC URL |
| `DB_USERNAME` | Database username |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | JWT signing key (min 32 chars) |
| `JWT_ACCESS_EXPIRATION` | Access token TTL (ms) |
| `JWT_REFRESH_EXPIRATION` | Refresh token TTL (ms) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `SMTP_USERNAME` | Email sender address |
| `SMTP_PASSWORD` | SMTP password |

---

## 5. API Reference

### Base URL
- **Production**: `https://api.pomodify.site/api/v2`
- **Local**: `http://localhost:8081/api/v2`

### Authentication
All protected endpoints require JWT token via httpOnly cookies (set automatically on login).

### Key Endpoints

| Resource | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Auth** | `/auth/login` | POST | Login with email/password |
| **Auth** | `/auth/register` | POST | Register new user |
| **Auth** | `/auth/refresh` | POST | Refresh access token |
| **Auth** | `/auth/logout` | POST | Logout user |
| **Auth** | `/auth/users/me` | GET | Get current user profile |
| **Activities** | `/activities` | GET | List user activities |
| **Activities** | `/activities` | POST | Create activity |
| **Activities** | `/activities/{id}` | PUT | Update activity |
| **Activities** | `/activities/{id}` | DELETE | Soft delete activity |
| **Sessions** | `/activities/{id}/sessions` | GET | List sessions |
| **Sessions** | `/activities/{id}/sessions` | POST | Create session |
| **Sessions** | `/activities/{id}/sessions/{sid}/start` | POST | Start session |
| **Sessions** | `/activities/{id}/sessions/{sid}/pause` | POST | Pause session |
| **Sessions** | `/activities/{id}/sessions/{sid}/resume` | POST | Resume session |
| **Sessions** | `/activities/{id}/sessions/{sid}/complete-phase` | POST | Complete phase |
| **Sessions** | `/activities/{id}/sessions/{sid}/finish` | POST | Finish session |
| **Dashboard** | `/dashboard` | GET | Get dashboard stats |
| **Reports** | `/reports/summary` | GET | Get report summary |
| **Settings** | `/settings` | GET | Get user settings |
| **Settings** | `/settings` | PATCH | Update settings |
| **Push** | `/push/register-token` | POST | Register FCM token |
| **Push** | `/push/enable` | PUT | Enable push notifications |
| **Push** | `/push/disable` | PUT | Disable push notifications |
| **Categories** | `/categories` | GET | List categories |
| **Categories** | `/categories` | POST | Create category |

### Session Types
- `CLASSIC` - Standard Pomodoro with fixed focus/break times
- `FREESTYLE` - Flexible timing without strict phases

### Session Statuses
- `PENDING` - Not started
- `IN_PROGRESS` - Currently running
- `PAUSED` - Temporarily paused
- `COMPLETED` - Successfully finished

---

## 6. Database Schema

### Core Entities

| Entity | Table Name | Description |
|--------|------------|-------------|
| User | `app_user` | User accounts (email, password, OAuth provider) |
| Activity | `activity` | User activities/projects |
| PomodoroSession | `pomodoro_session` | Timer sessions with phases |
| Category | `category` | Activity categories |
| UserSettings | `user_settings` | User preferences |
| UserBadge | `user_badge` | Achievement badges |
| UserPushToken | `user_push_token` | FCM push tokens |
| VerificationToken | `verification_token` | Email verification tokens |
| RevokedToken | `revoked_token` | Blacklisted JWT tokens |
| SessionNote | `session_note` | Notes attached to sessions |

### Flyway Migrations

Located in `src/main/resources/db/migration/`:

| Version | Description |
|---------|-------------|
| V1 | Initial schema (users, activities, sessions) |
| V2 | User push token enabled flag |
| V3 | User settings table |
| V4 | User badge table |
| V5 | Timer sync fields |
| V6 | Remove tick sound setting |
| V7 | Remove calendar sync |
| V8 | Add auth provider column |
| V9 | Pomodoro session table updates |

### Entity Relationships

```
User (1) ──────< Activity (N)
Activity (1) ──────< PomodoroSession (N)
Activity (1) ──────< SessionNote (N)
User (1) ──────< Category (N)
User (1) ────── UserSettings (1)
User (1) ──────< UserBadge (N)
User (1) ──────< UserPushToken (N)
```

---

## 7. Frontend Services

### Core Services (`src/app/core/services/`)

| Service | File | Purpose |
|---------|------|---------|
| Auth | `auth.ts` | Authentication (login, logout, signup, token management) |
| Activity | `activity.service.ts` | Activity CRUD operations |
| Session | `session.service.ts` | Session management & timer control |
| Dashboard | `dashboard.service.ts` | Dashboard statistics |
| Settings | `settings.service.ts` | User settings management |
| Report | `report.service.ts` | Reports & analytics |
| FCM | `fcm.service.ts` | Firebase Cloud Messaging setup |
| Notification | `notification.service.ts` | Push notification handling |
| Timer | `timer.ts` | Client-side timer logic |
| TimerSync | `timer-sync.service.ts` | Timer state synchronization |
| IconMapper | `icon-mapper.ts` | Activity icon mapping |
| ActivityColor | `activity-color.service.ts` | Activity color management |
| History | `history.service.ts` | Navigation history tracking |

### Guards (`src/app/core/guards/`)

| Guard | Purpose |
|-------|---------|
| `authGuard` | Protects authenticated routes |
| `publicPageGuard` | Redirects logged-in users from public pages |

### Interceptors (`src/app/core/interceptors/`)

| Interceptor | Purpose |
|-------------|---------|
| `authTokenInterceptor` | Attaches JWT to API requests |
| `authErrorInterceptor` | Handles 401 errors, auto token refresh |

### Shared Services (`src/app/shared/services/`)

| Service | Purpose |
|---------|---------|
| `timer.ts` | Reusable timer logic |
| `verify-email.service.ts` | Email verification handling |

---

## 8. Testing

### Frontend Tests

```bash
cd pomodify-frontend

# Unit tests (Karma/Jasmine)
npm test                     # Watch mode
npm run test:ci              # CI mode with coverage (ChromeHeadless)

# E2E tests (Playwright)
npm run e2e                  # Run all E2E tests
npm run e2e:ui               # Interactive UI mode
```

**Test Files Location:**
- Unit tests: `*.spec.ts` alongside components
- E2E tests: `e2e/` directory

### Backend Tests

```bash
cd pomodify-backend

# Unit tests only
./mvnw test

# Integration tests (requires Docker for Testcontainers)
./mvnw verify

# Skip integration tests
./mvnw -DskipITs test

# Run specific test class
./mvnw test -Dtest=AuthControllerTest
```

**Test Configuration:**
- Unit tests: `src/test/resources/application-test.properties`
- Integration tests: `src/test/resources/application-h2.properties`
- Testcontainers: Uses PostgreSQL container for realistic testing

### Test Coverage

The CI pipeline runs:
1. **Layer 1**: Unit tests (frontend + backend)
2. **Layer 2**: Integration tests (Testcontainers)
3. **Layer 3**: E2E tests (Playwright)
4. **Layer 4**: Security scans (Trivy)

---

## 9. CI/CD Pipeline

### Pull Request Workflow (`ci.yml`)

Triggered on PRs to `main`:

```
┌─────────────────┐
│ Lint & Validate │ ← Dockerfile validation, merge conflict check
└────────┬────────┘
         ↓
┌─────────────────┐
│   Unit Tests    │ ← Frontend (Karma) + Backend (Maven)
└────────┬────────┘
         ↓
┌─────────────────┐
│Integration Tests│ ← Testcontainers with PostgreSQL
└────────┬────────┘
         ↓
┌─────────────────┐
│   E2E Tests     │ ← Playwright browser tests
└────────┬────────┘
         ↓
┌─────────────────┐
│ Docker Build    │ ← Build images, test containers
└────────┬────────┘
         ↓
┌─────────────────┐
│ Security Scan   │ ← SBOM (Syft), Trivy scan, Cosign signing
└─────────────────┘
```

### Deployment Workflow (`deploy.yml`)

Triggered on merge to `main`:

```
┌─────────────────┐
│ Build & Push    │ ← Docker images to Docker Hub
└────────┬────────┘
         ↓
┌─────────────────┐
│ Sign Images     │ ← Cosign image signing
└────────┬────────┘
         ↓
┌─────────────────┐
│ Verify Sigs     │ ← Verify signatures before deploy
└────────┬────────┘
         ↓
┌─────────────────┐
│ Deploy to EC2   │ ← SSH, pull images, run containers
└────────┬────────┘
         ↓
┌─────────────────┐
│ Health Checks   │ ← Verify services are running
└─────────────────┘
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub password |
| `SSH_HOST` | EC2 host IP |
| `SSH_USER` | EC2 SSH user |
| `SSH_KEY` | EC2 SSH private key |
| `SSH_PORT` | EC2 SSH port |
| `DB_HOST` | Database host |
| `DB_PORT` | Database port |
| `DB_NAME` | Database name |
| `DB_USERNAME` | Database username |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | JWT signing key |
| `JWT_ACCESS_EXPIRATION` | Access token TTL |
| `JWT_REFRESH_EXPIRATION` | Refresh token TTL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `SMTP_USERNAME` | SMTP email username |
| `SMTP_PASSWORD` | SMTP email password |
| `COSIGN_KEY_B64` | Cosign private key (base64) |
| `COSIGN_PUBKEY_B64` | Cosign public key (base64) |
| `COSIGN_PASSWORD` | Cosign key password |
| `FCM_SERVICE_ACCOUNT_BASE64` | Firebase service account (base64) |

---

## 10. Common Development Tasks

### Adding a New API Endpoint

**Backend:**
1. Create DTO in `presentation/dto/`
2. Add method to Controller in `presentation/controller/`
3. Implement service logic in `application/service/`
4. Add repository method if needed in `domain/repository/`

**Frontend:**
1. Add endpoint URL to `core/config/api.config.ts`
2. Create/update service in `core/services/`
3. Update component to use the service

### Adding a New Page

1. Create component folder in `src/app/pages/your-page/`
   - `your-page.ts` (component)
   - `your-page.html` (template)
   - `your-page.scss` (styles)
2. Add route in `app.routes.ts`:
   ```typescript
   {
     path: 'your-page',
     canActivate: [authGuard],  // if protected
     loadComponent: () => import('./pages/your-page/your-page').then(m => m.YourPage),
   }
   ```

### Adding a Database Migration

1. Create new file in `src/main/resources/db/migration/`:
   - Format: `V{N}__{description}.sql`
   - Example: `V10__add_user_preferences.sql`
2. Flyway runs automatically on application startup

### Adding a New Modal/Dialog

1. Create component in `src/app/shared/components/your-modal/`
2. Use Angular Material Dialog:
   ```typescript
   this.dialog.open(YourModal, {
     width: '500px',
     data: { /* your data */ }
   });
   ```

### Updating Environment Variables

**Local Development:**
1. Edit `.env` file in `pomodify-backend/`
2. Restart the application

**Production:**
1. Update GitHub Secrets
2. Re-run deployment workflow

---

## 11. Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Login fails with "Cannot read properties of null" | Corrupted localStorage | Run `localStorage.clear()` in browser console |
| Backend won't start | Missing env vars or DB connection | Check `.env` file and database status |
| CORS errors | Wrong API URL | Verify `api.config.ts` matches backend URL |
| JWT expired errors | Token not refreshing | Check `authErrorInterceptor` is configured |
| FCM not working | Missing Firebase config | Verify Firebase credentials and browser permissions |
| Flyway migration fails | SQL syntax error | Check migration file syntax |
| Docker build fails | Missing dependencies | Verify `pom.xml` or `package.json` |
| E2E tests timeout | Frontend not ready | Increase wait time in CI workflow |

### Debug Commands

```bash
# Check backend logs (Docker)
docker logs pomodify-backend

# Check frontend build
cd pomodify-frontend && npm run build -- --configuration=production

# Test database connection
psql -h localhost -U postgres -d pomodifydb -c '\dt'

# Verify JWT secret length (should be >= 32)
echo -n "$JWT_SECRET" | wc -c

# Check running containers
docker ps | grep pomodify

# View container resource usage
docker stats pomodify-backend pomodify-frontend

# Check Flyway migration status
./mvnw flyway:info
```

### Browser Console Commands

```javascript
// Clear all auth data
localStorage.clear();
sessionStorage.clear();
location.reload();

// Check stored tokens
console.log(localStorage.getItem('accessToken'));
console.log(localStorage.getItem('currentUser'));

// Check current theme
console.log(document.documentElement.classList.contains('theme-dark'));
```

### Backend Health Check

```bash
# Check if backend is running
curl http://localhost:8081/actuator/health

# Expected response:
# {"status":"UP"}
```

---

## 12. Coding Standards

### TypeScript/Angular

- Use **standalone components** (no NgModules)
- Use **signals** for reactive state management
- Follow [Angular Style Guide](https://angular.io/guide/styleguide)
- Use **strict TypeScript** mode
- Prefer `inject()` over constructor injection
- Use `async/await` over `.then()` chains where possible

```typescript
// Good
protected activities = signal<Activity[]>([]);
private http = inject(HttpClient);

// Avoid
activities: Activity[] = [];
constructor(private http: HttpClient) {}
```

### Java/Spring Boot

- Follow **Clean Architecture** layers
- Use **Lombok** for boilerplate reduction
- Use **MapStruct** for DTO mapping
- Write **unit tests** for all services
- Use **meaningful exception messages**
- Follow Java naming conventions

```java
// Good
@Service
@RequiredArgsConstructor
public class ActivityService {
    private final ActivityRepository activityRepository;
}

// Avoid
@Service
public class ActivityService {
    @Autowired
    ActivityRepository activityRepository;
}
```

### Git Workflow

| Branch Type | Naming Convention | Example |
|-------------|-------------------|---------|
| Feature | `feature/{description}` | `feature/user-authentication` |
| Bugfix | `bugfix/{description}` | `bugfix/login-error` |
| Docs | `docs/{description}` | `docs/api-documentation` |

**Commit Message Format:**
```
type(scope): description

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Example:**
```
feat(auth): add Google OAuth2 login

- Implement OAuth2 flow with Google
- Add user profile sync
- Update login page UI

Closes #123
```

### Code Review Checklist

- [ ] Code follows project conventions
- [ ] Unit tests added/updated
- [ ] No console.log statements in production code
- [ ] Error handling is appropriate
- [ ] No hardcoded values (use constants/env vars)
- [ ] Documentation updated if needed
- [ ] No security vulnerabilities introduced

---

## 13. Useful Resources

### Project Documentation

| Document | Location | Description |
|----------|----------|-------------|
| API Documentation | `document/API_Documentation.md` | Full API reference |
| ERD Diagram | `document/erd.mmd` | Entity relationship diagram |
| UML Diagram | `document/uml.mmd` | Class diagrams |
| CI/CD Guide | `deploy-documentation/` | Deployment documentation |
| Environment Setup | `pomodify-backend/ENVIRONMENT_SETUP.md` | Backend setup guide |

### External Documentation

- [Angular Documentation](https://angular.io/docs)
- [Spring Boot Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Flyway Documentation](https://flywaydb.org/documentation/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Docker Documentation](https://docs.docker.com/)
- [Playwright Documentation](https://playwright.dev/docs/intro)

### Test Credentials

For testing the application:
- **Email**: `johndoe@gmail.com`
- **Password**: `JohnDoe@123`

### Useful Commands Cheatsheet

```bash
# Frontend
npm start                    # Start dev server
npm test                     # Run unit tests
npm run e2e                  # Run E2E tests
npm run build                # Production build

# Backend
./mvnw spring-boot:run       # Start server
./mvnw test                  # Run unit tests
./mvnw verify                # Run all tests
./mvnw clean install         # Clean build

# Docker
docker-compose up -d         # Start containers
docker-compose down          # Stop containers
docker logs <container>      # View logs
docker exec -it <container> sh  # Shell into container

# Database
psql -h localhost -U postgres -d pomodifydb  # Connect to DB
./mvnw flyway:info           # Check migration status
./mvnw flyway:migrate        # Run migrations
```

---

## Contributors

- **Hannah Lorainne Genandoy** – Project Manager / Developer
- **Daniel Victorioso** – Technical Lead / Developer
- **Ivan Delumen** – UI/UX / Developer
- **Gerald Mamasalanang** – Tester / Developer
- **Simone Jake Reyes** – UI/UX / Developer

---

**Last Updated**: December 2025  
**API Version**: v2  
**Angular Version**: 20  
**Spring Boot Version**: 3.5.6  
**Java Version**: 21