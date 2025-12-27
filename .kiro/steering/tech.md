# Tech Stack & Build System

## Frontend (pomodify-frontend/)
- **Framework**: Angular 20.x with standalone components
- **Styling**: SCSS + Tailwind CSS
- **UI Components**: Angular Material + Angular CDK
- **State Management**: RxJS with signals
- **HTTP**: Angular HttpClient with interceptors
- **Push Notifications**: Firebase Cloud Messaging
- **Testing**: Jasmine/Karma (unit), Playwright (e2e)

## Backend (pomodify-backend/)
- **Framework**: Spring Boot 3.5.x
- **Language**: Java 21
- **Build Tool**: Maven (mvnw wrapper)
- **Database**: PostgreSQL with Flyway migrations
- **ORM**: Spring Data JPA
- **Security**: Spring Security + JWT (jjwt) + OAuth2
- **API Docs**: SpringDoc OpenAPI (Swagger)
- **Push Notifications**: Firebase Admin SDK
- **AI Integration**: Google GenAI
- **Testing**: JUnit 5, Testcontainers (PostgreSQL), H2 (unit tests)

## DevOps
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Deployment**: EC2

## Common Commands

### Frontend
```bash
cd pomodify-frontend
npm install          # Install dependencies
npm start            # Dev server (ng serve)
npm run build        # Production build
npm test             # Unit tests
npm run test:ci      # CI tests (headless)
npm run e2e          # Playwright e2e tests
```

### Backend
```bash
cd pomodify-backend
./mvnw spring-boot:run                    # Run dev server
./mvnw clean install                      # Build & test
./mvnw test                               # Run tests only
./mvnw spring-boot:run -Dspring.profiles.active=local  # Run with local profile
```

### Environment Setup
- Backend requires `.env` file (copy from `.env.example`)
- Required env vars: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`
- Production requires `SPRING_PROFILES_ACTIVE=prod` and strong `JWT_SECRET` (32+ chars)