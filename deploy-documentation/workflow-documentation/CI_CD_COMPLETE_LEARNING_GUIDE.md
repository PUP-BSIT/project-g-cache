# 🎓 Complete CI/CD Learning Guide
## Master Your Workflow from Fundamentals to Advanced

**Purpose:** This guide will teach you everything about CI/CD, using your actual workflow as examples. By the end, you'll be able to explain every component, answer technical questions, and understand industry best practices.

---

## 📚 Table of Contents

1. [CI/CD Fundamentals](#1-cicd-fundamentals)
2. [Your Workflow Architecture](#2-your-workflow-architecture)
3. [Layer-by-Layer Deep Dive](#3-layer-by-layer-deep-dive)
4. [Security & Supply Chain](#4-security--supply-chain)
5. [Deployment Process](#5-deployment-process)
6. [Tools & Technologies](#6-tools--technologies)
7. [Common Questions & Answers](#7-common-questions--answers)
8. [Industry Best Practices](#8-industry-best-practices)
9. [Troubleshooting Guide](#9-troubleshooting-guide)

---

## 1. CI/CD Fundamentals

### What is CI/CD?

**CI (Continuous Integration):**
- **Definition:** Automatically building and testing code every time a developer pushes changes
- **Goal:** Catch bugs early, before they reach production
- **When it runs:** On every pull request (PR)
- **What it does:** Runs tests, checks code quality, builds artifacts

**CD (Continuous Deployment/Delivery):**
- **Definition:** Automatically deploying code to production after CI passes
- **Goal:** Release software quickly and safely
- **When it runs:** After code is merged to `main` branch
- **What it does:** Builds production images, deploys to servers

### The CI/CD Pipeline Flow

```
Developer writes code
    ↓
Creates Pull Request (PR)
    ↓
CI Pipeline Runs (Automated)
    ├─ Lint & Validate
    ├─ Unit Tests
    ├─ Integration Tests
    ├─ E2E Tests
    ├─ Build Docker Images
    ├─ Security Scanning
    └─ Image Signing
    ↓
CI Passes? → Yes → PR can be merged
    ↓
Code merged to main branch
    ↓
CD Pipeline Runs (Automated)
    ├─ Build Production Images
    ├─ Sign Images
    ├─ Deploy to EC2
    ├─ Health Checks
    └─ Verify Deployment
    ↓
Production is live! 🎉
```

### Why CI/CD Matters

**Without CI/CD:**
- ❌ Bugs discovered in production
- ❌ Manual testing is slow and error-prone
- ❌ Deployments are risky and stressful
- ❌ Security vulnerabilities go unnoticed

**With CI/CD:**
- ✅ Bugs caught before production
- ✅ Automated testing saves time
- ✅ Consistent, repeatable deployments
- ✅ Security issues detected early

---

## 2. Your Workflow Architecture

### Overview of Your Two Workflows

You have **two separate workflows** that work together:

#### 1. **CI Workflow** (`ci.yml`)
- **Trigger:** Pull Request to `main` branch
- **Purpose:** Validate code quality before merging
- **Runs:** Tests, builds, security scans
- **Blocks:** Prevents merge if anything fails

#### 2. **Deploy Workflow** (`deploy.yml`)
- **Trigger:** Push to `main` branch
- **Purpose:** Deploy validated code to production
- **Runs:** Build production images, deploy to EC2
- **Result:** Live application in production

### Workflow Structure

```
┌─────────────────────────────────────────────────────────┐
│                    CI WORKFLOW (ci.yml)                 │
│              Trigger: Pull Request → main              │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Lint &       │   │ Unit Tests   │   │ Integration  │
│ Validate     │   │ (Frontend +  │   │ Tests        │
│              │   │  Backend)    │   │ (Testcontainers)│
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │ E2E Tests    │
                   │ (Playwright) │
                   └──────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │ Build & Test │
                   │ Docker Images│
                   └──────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │ Security     │
                   │ (SBOM, Trivy,│
                   │  Cosign)      │
                   └──────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │ CI Summary   │
                   │ (Pass/Fail)   │
                   └──────────────┘

┌─────────────────────────────────────────────────────────┐
│                DEPLOY WORKFLOW (deploy.yml)              │
│              Trigger: Push to main branch               │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │ Build & Push │
                   │ Production   │
                   │ Images       │
                   └──────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │ Sign Images  │
                   │ (Cosign)     │
                   └──────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │ Deploy to EC2│
                   │ (SSH)        │
                   └──────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │ Health      │
                   │ Checks      │
                   └──────────────┘
```

---

## 3. Layer-by-Layer Deep Dive

### Layer 1: Lint & Validate

**What it does:**
- Checks if Dockerfiles exist
- Validates basic file structure
- Checks for merge conflicts

**Why it's first:**
- Fast checks that catch obvious problems
- Prevents wasting time on invalid code

**Technical Details:**
```yaml
lint-and-validate:
  steps:
    - Checkout code
    - Validate Dockerfiles exist
    - Check for merge conflicts with main branch
```

**What happens if it fails:**
- PR cannot be merged
- Developer must fix issues
- Other jobs don't run (saves CI minutes)

---

### Layer 2: Unit Tests

**What are Unit Tests?**
- Test individual functions/components in isolation
- Fast execution (seconds)
- Mock external dependencies
- Test logic, not integration

**Frontend Unit Tests (Karma + Jasmine):**
- **Framework:** Karma (test runner) + Jasmine (testing framework)
- **Location:** `src/**/*.spec.ts` files
- **What they test:**
  - Component rendering
  - Service methods
  - Business logic
- **Example:** Testing if login service validates email format

**Backend Unit Tests (JUnit 5):**
- **Framework:** JUnit 5 (Jupiter) + Mockito
- **Location:** `src/test/java/**/*Test.java` files
- **What they test:**
  - Service methods
  - Controller endpoints (with mocked dependencies)
  - Domain logic
- **Example:** Testing if user service correctly calculates user stats

**Why Unit Tests Matter:**
- Catch bugs in individual components
- Fast feedback (runs in seconds)
- Easy to debug (isolated failures)
- Foundation for other tests

**Technical Execution:**
```bash
# Frontend
npm test  # Runs Karma + Jasmine
# Opens browser, runs all .spec.ts files

# Backend
mvn test  # Runs JUnit tests
# Executes all *Test.java files
```

---

### Layer 3: Integration Tests

**What are Integration Tests?**
- Test how multiple components work together
- Use real database (via Testcontainers)
- Test API endpoints end-to-end
- Slower than unit tests (minutes)

**Your Integration Tests (Testcontainers):**
- **Framework:** Testcontainers + JUnit 5
- **What it does:**
  - Spins up real PostgreSQL database in Docker
  - Tests API endpoints with real database
  - Tests data persistence
- **Example:** Testing if creating a session actually saves to database

**Why Testcontainers?**
- Real database behavior (not mocked)
- Isolated test environment
- No need for external test database
- Tests actual SQL queries

**Technical Flow:**
```
1. Test starts
2. Testcontainers creates PostgreSQL container
3. Spring Boot connects to test database
4. Test runs (creates data, queries, etc.)
5. Testcontainers destroys container
6. Test completes
```

**What Integration Tests Verify:**
- ✅ API endpoints work correctly
- ✅ Database queries are correct
- ✅ Data persistence works
- ✅ Relationships between entities

---

### Layer 4: E2E Tests

**What are E2E (End-to-End) Tests?**
- Test the entire application from user's perspective
- Simulate real user interactions
- Test in real browser
- Slowest tests (minutes)

**Your E2E Tests (Playwright):**
- **Framework:** Playwright
- **What it does:**
  - Opens real browser (Chrome)
  - Navigates to pages
  - Clicks buttons, fills forms
  - Verifies UI elements
- **Example:** Testing complete login flow → dashboard navigation

**Page Object Model (POM):**
- **What:** Design pattern for organizing E2E tests
- **Why:** Makes tests maintainable and reusable
- **Structure:**
  ```
  pages/
    ├── login.page.ts      (LoginPage class)
    ├── dashboard.page.ts  (DashboardPage class)
  tests/
    └── auth-and-dashboard.spec.ts  (Uses page objects)
  ```

**API Mocking in E2E:**
- **Why:** Don't need real backend for UI tests
- **How:** Intercept API calls, return mock data
- **Location:** `e2e/fixtures/api-mocks.ts`
- **Example:** Mock login API to return success without real backend

**E2E Test Flow:**
```
1. Start frontend dev server
2. Playwright opens browser
3. Navigate to /login
4. Fill email and password
5. Click login button
6. Wait for navigation to /dashboard
7. Verify dashboard elements are visible
8. Close browser
```

**What E2E Tests Verify:**
- ✅ User flows work end-to-end
- ✅ UI elements render correctly
- ✅ Navigation works
- ✅ Forms submit correctly
- ✅ Error messages display

---

### Layer 5: Build & Test Docker Images

**What this layer does:**
1. Builds Docker images from Dockerfiles
2. Tests that containers can start
3. Verifies images work correctly

**Docker Build Process:**
```dockerfile
# Multi-stage build example
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

**Why Multi-Stage Builds?**
- Smaller final image (only production files)
- Faster deployments (less to download)
- More secure (no build tools in production)

**Container Testing:**
```bash
# Build image
docker build -t myapp:test .

# Run container
docker run -d --name test-container myapp:test

# Check if it's running
docker ps | grep test-container

# Clean up
docker stop test-container
docker rm test-container
```

**What this verifies:**
- ✅ Dockerfile is correct
- ✅ Application builds successfully
- ✅ Container starts without errors
- ✅ Application runs in container

---

### Layer 6: Security & Supply Chain

This is the **most advanced** part of your workflow. Let's break it down:

#### 6.1 SBOM (Software Bill of Materials)

**What is SBOM?**
- Complete inventory of all software components in your Docker image
- Lists every package, library, and dependency
- Like a "recipe" of what's inside your application

**Why SBOM Matters:**
- **Security:** Know what vulnerabilities exist
- **Compliance:** Required by US Executive Order 14028
- **Transparency:** Know exactly what's in your app
- **Audit:** Track dependencies over time

**Your SBOM Generation (Syft):**
```bash
# Generate SBOM for Docker image
syft docker-image:myapp:latest -o spdx-json > sbom.json
```

**What's in an SBOM?**
```json
{
  "packages": [
    {
      "name": "spring-boot-starter-web",
      "version": "3.2.0",
      "license": "Apache-2.0",
      "purl": "pkg:maven/org.springframework.boot/spring-boot-starter-web@3.2.0"
    },
    // ... hundreds more packages
  ]
}
```

**Real-World Use:**
- Security teams review SBOMs
- Compliance audits require SBOMs
- Vulnerability tracking uses SBOMs
- Dependency management uses SBOMs

---

#### 6.2 Vulnerability Scanning (Trivy)

**What is Trivy?**
- Scans Docker images for known security vulnerabilities
- Checks against vulnerability databases (CVE)
- Fails build if critical vulnerabilities found

**How Trivy Works:**
```bash
# Scan image for vulnerabilities
trivy image myapp:latest

# Fail on CRITICAL or HIGH severity
trivy image --exit-code 1 --severity CRITICAL,HIGH myapp:latest
```

**Trivy Output Example:**
```
CRITICAL: CVE-2024-1234
Package: openssl
Version: 1.1.1
Fix: Upgrade to 1.1.2
```

**Why This Matters:**
- Prevents deploying vulnerable code
- Catches security issues early
- Protects users from attacks
- Meets security compliance

**What Happens if Vulnerabilities Found:**
- Build fails (exit code 1)
- PR cannot be merged
- Developer must fix vulnerabilities
- Update dependencies, rebuild, rescan

---

#### 6.3 Image Signing (Cosign)

**What is Image Signing?**
- Cryptographically signs Docker images
- Proves image hasn't been tampered with
- Verifies image authenticity

**Why Sign Images?**
- **Security:** Prevent supply chain attacks
- **Trust:** Verify images are from your build
- **Compliance:** Required for secure deployments
- **Audit:** Track who signed what and when

**How Cosign Works:**
```bash
# Generate signing key pair
cosign generate-key-pair

# Sign image
cosign sign --key cosign.key myapp:latest

# Verify signature
cosign verify --key cosign.pub myapp:latest
```

**Signing Process:**
1. Generate private/public key pair
2. Store private key in GitHub Secrets
3. Sign image with private key (in CI)
4. Verify signature with public key (before deploy)

**What Signing Prevents:**
- ❌ Malicious images being deployed
- ❌ Tampered images
- ❌ Unauthorized deployments
- ❌ Supply chain attacks

**Real-World Scenario:**
```
Attacker tries to deploy malicious image
    ↓
Deployment workflow verifies signature
    ↓
Signature doesn't match → Deployment fails
    ↓
Attack prevented! ✅
```

---

## 4. Security & Supply Chain (Deep Dive)

### Supply Chain Security Explained

**What is Supply Chain Security?**
- Protecting the entire software development lifecycle
- Ensuring code, dependencies, and deployments are secure
- Preventing attacks at any stage

**Your Security Layers:**
```
Code Repository
    ↓
CI Pipeline
    ├─ SBOM Generation (Know what's inside)
    ├─ Vulnerability Scanning (Find security issues)
    └─ Image Signing (Prove authenticity)
    ↓
Container Registry
    ↓
Deployment
    ├─ Signature Verification (Verify before deploy)
    └─ Health Checks (Verify after deploy)
    ↓
Production
```

### SBOM Deep Dive

**SBOM Formats:**
- **SPDX:** Industry standard (what you use)
- **CycloneDX:** Alternative format
- **JSON/XML:** Machine-readable

**SBOM Use Cases:**
1. **Vulnerability Management:**
   - Know which packages have vulnerabilities
   - Track fixes over time
   - Prioritize security updates

2. **License Compliance:**
   - Know all licenses in use
   - Ensure no license violations
   - Generate license reports

3. **Dependency Tracking:**
   - Understand dependency tree
   - Identify outdated packages
   - Plan dependency updates

4. **Audit & Compliance:**
   - Provide to auditors
   - Meet regulatory requirements
   - Document software components

**SBOM in Your Workflow:**
```yaml
- Generate SBOM for backend image
- Generate SBOM for frontend image
- Upload SBOMs as artifacts (retained 7 days)
```

---

### Vulnerability Scanning Deep Dive

**How Vulnerability Databases Work:**
- **CVE (Common Vulnerabilities and Exposures):** Standardized vulnerability identifiers
- **NVD (National Vulnerability Database):** US government database
- **Trivy Database:** Aggregated from multiple sources

**Vulnerability Severity Levels:**
- **CRITICAL:** Immediate action required
- **HIGH:** Fix as soon as possible
- **MEDIUM:** Fix when convenient
- **LOW:** Fix if time permits

**Your Policy:**
```yaml
# Fail on CRITICAL or HIGH
trivy image --exit-code 1 --severity CRITICAL,HIGH
```

**What Happens When Vulnerability Found:**
1. Trivy scans image
2. Finds vulnerability in package X
3. Reports severity (CRITICAL/HIGH)
4. Build fails (exit code 1)
5. Developer must:
   - Update vulnerable package
   - Rebuild image
   - Rescan (should pass now)

**False Positives:**
- Sometimes Trivy reports vulnerabilities that don't affect you
- Solution: Document exceptions, but still review

---

### Image Signing Deep Dive

**Cryptographic Signing:**
- Uses public-key cryptography
- Private key signs, public key verifies
- Mathematically proves authenticity

**Signing Process:**
```
1. Generate key pair (once)
   - Private key: Keep secret (GitHub Secrets)
   - Public key: Can be public

2. Sign image (in CI)
   - Use private key to create signature
   - Signature attached to image

3. Verify signature (before deploy)
   - Use public key to verify signature
   - If valid → deploy
   - If invalid → reject
```

**Why This Works:**
- Only someone with private key can sign
- Anyone with public key can verify
- Signature proves image authenticity
- Prevents tampering

**Real Attack Prevention:**
```
Scenario: Attacker compromises registry
    ↓
Tries to push malicious image
    ↓
Image doesn't have valid signature
    ↓
Deployment workflow rejects it
    ↓
Attack prevented! ✅
```

---

## 5. Deployment Process

### Deployment Workflow Overview

**Trigger:** Code pushed to `main` branch

**Steps:**
1. Build production images
2. Tag images (latest + commit SHA)
3. Sign images with Cosign
4. Push to Docker Hub
5. Deploy to EC2 via SSH
6. Verify deployment

### Step-by-Step Deployment

#### Step 1: Build Production Images
```bash
# Build with two tags
docker build -t myapp:latest -t myapp:abc123 .

# Why two tags?
# - latest: Always points to newest
# - abc123: Specific commit (for rollback)
```

#### Step 2: Sign Images
```bash
# Sign both tags
cosign sign --key cosign.key myapp:latest
cosign sign --key cosign.key myapp:abc123
```

#### Step 3: Push to Registry
```bash
docker push myapp:latest
docker push myapp:abc123
```

#### Step 4: Deploy to EC2
```bash
# SSH into EC2 server
ssh user@ec2-server

# Stop old containers
docker stop myapp-frontend myapp-backend
docker rm myapp-frontend myapp-backend

# Pull new images
docker pull myapp:latest

# Start new containers
docker run -d --name myapp-frontend myapp:latest
```

#### Step 5: Health Checks
```bash
# Check if containers are running
docker ps

# Check application health
curl http://localhost:8080/health
curl http://localhost:8081/actuator/health
```

### Deployment Safety Features

**1. Signature Verification:**
```bash
# Before deploying, verify signatures
cosign verify --key cosign.pub myapp:latest
# If invalid → deployment stops
```

**2. Database Connectivity Check:**
```bash
# Wait for database to be ready
until psql -h db-host -U user -d dbname -c '\q'; do
  sleep 5
done
```

**3. Health Checks with Retries:**
```bash
# Retry health check up to 20 times
retries=20
until curl -f http://localhost:8081/actuator/health; do
  retries=$((retries-1))
  if [ $retries -le 0 ]; then
    exit 1  # Deployment failed
  fi
  sleep 3
done
```

**4. Graceful Container Management:**
```bash
# Stop old containers gracefully
docker stop old-container

# Remove old containers
docker rm old-container

# Start new containers
docker run -d --name new-container new-image
```

### Rollback Strategy

**If deployment fails:**
1. Health checks fail
2. Deployment script exits with error
3. Old containers may still be running
4. Manual intervention needed

**Rollback process:**
```bash
# Pull previous working image
docker pull myapp:previous-commit

# Stop failed container
docker stop myapp-frontend

# Start previous version
docker run -d --name myapp-frontend myapp:previous-commit
```

---

## 6. Tools & Technologies

### Testing Tools

#### Karma (Frontend Test Runner)
- **What:** Test runner for JavaScript/TypeScript
- **Why:** Runs tests in real browsers
- **How:** Opens browser, executes tests, reports results
- **Your use:** Runs Angular unit tests

#### Jasmine (Frontend Testing Framework)
- **What:** Testing framework for JavaScript
- **Why:** Provides test syntax and assertions
- **Syntax:** `describe()`, `it()`, `expect()`
- **Your use:** Write Angular unit tests

#### JUnit 5 (Backend Testing Framework)
- **What:** Testing framework for Java
- **Why:** Industry standard for Java testing
- **Annotations:** `@Test`, `@BeforeEach`, `@DisplayName`
- **Your use:** Write Spring Boot unit tests

#### Mockito (Backend Mocking)
- **What:** Mocking framework for Java
- **Why:** Mock dependencies in unit tests
- **Usage:** `mock()`, `when()`, `verify()`
- **Your use:** Mock repositories and services

#### Testcontainers (Integration Testing)
- **What:** Library for integration tests with real databases
- **Why:** Test with real PostgreSQL, not mocks
- **How:** Spins up Docker containers for tests
- **Your use:** Backend integration tests

#### Playwright (E2E Testing)
- **What:** End-to-end testing framework
- **Why:** Test entire application in real browser
- **Features:** Auto-waiting, network interception, screenshots
- **Your use:** Frontend E2E tests

### Security Tools

#### Syft (SBOM Generation)
- **What:** Generates Software Bill of Materials
- **Why:** Inventory all dependencies
- **Output:** SPDX, CycloneDX formats
- **Your use:** Generate SBOMs for Docker images

#### Trivy (Vulnerability Scanner)
- **What:** Scans containers for vulnerabilities
- **Why:** Find security issues before deployment
- **Databases:** CVE, NVD, vendor advisories
- **Your use:** Scan Docker images, fail on CRITICAL/HIGH

#### Cosign (Image Signing)
- **What:** Cryptographically signs containers
- **Why:** Prove image authenticity
- **Method:** Public-key cryptography
- **Your use:** Sign images in CI, verify in deployment

### Build & Deployment Tools

#### Docker
- **What:** Containerization platform
- **Why:** Package application with dependencies
- **Features:** Multi-stage builds, layers, caching
- **Your use:** Build and run application containers

#### Docker Buildx
- **What:** Extended build capabilities
- **Why:** Multi-platform builds, advanced caching
- **Your use:** Build Docker images in CI

#### QEMU
- **What:** Emulation for multi-platform builds
- **Why:** Build for different CPU architectures
- **Your use:** Enable cross-platform Docker builds

#### GitHub Actions
- **What:** CI/CD platform
- **Why:** Automate testing and deployment
- **Features:** Workflows, jobs, steps, secrets
- **Your use:** Entire CI/CD pipeline

---

## 7. Common Questions & Answers

### Q1: What happens when I create a Pull Request?

**Answer:**
1. GitHub triggers CI workflow (`ci.yml`)
2. Runs lint & validation (checks Dockerfiles)
3. Runs unit tests (frontend + backend)
4. Runs integration tests (Testcontainers)
5. Runs E2E tests (Playwright)
6. Builds Docker images
7. Generates SBOMs
8. Scans for vulnerabilities (Trivy)
9. Signs images (Cosign)
10. Creates summary (pass/fail)
11. If all pass → PR can be merged
12. If any fail → PR blocked, issue created

---

### Q2: What's the difference between unit, integration, and E2E tests?

**Answer:**

**Unit Tests:**
- Test individual functions/components
- Fast (seconds)
- Mock dependencies
- Example: Test login service validates email

**Integration Tests:**
- Test multiple components together
- Medium speed (minutes)
- Use real database
- Example: Test API endpoint saves data to database

**E2E Tests:**
- Test entire application
- Slow (minutes)
- Use real browser
- Example: Test user logs in and sees dashboard

**Analogy:**
- Unit test = Testing car engine alone
- Integration test = Testing engine + transmission together
- E2E test = Driving the entire car

---

### Q3: Why do we need SBOM, Trivy, and Cosign?

**Answer:**

**SBOM (Software Bill of Materials):**
- **Purpose:** Know exactly what's in your application
- **Why:** Security, compliance, audit
- **Example:** "This image contains Spring Boot 3.2.0, PostgreSQL driver 42.6.0, etc."

**Trivy (Vulnerability Scanner):**
- **Purpose:** Find security vulnerabilities
- **Why:** Prevent deploying vulnerable code
- **Example:** "OpenSSL 1.1.1 has CVE-2024-1234, upgrade to 1.1.2"

**Cosign (Image Signing):**
- **Purpose:** Prove image authenticity
- **Why:** Prevent supply chain attacks
- **Example:** "This image was signed by our CI system, not an attacker"

**Together:** Complete security chain
- SBOM = Know what's inside
- Trivy = Know if it's vulnerable
- Cosign = Know if it's authentic

---

### Q4: How does the deployment process work?

**Answer:**

1. **Code merged to main** → Triggers deploy workflow
2. **Build production images** → Docker builds with `latest` and commit SHA tags
3. **Sign images** → Cosign signs both tags
4. **Push to Docker Hub** → Images available in registry
5. **SSH to EC2** → Connect to production server
6. **Verify signatures** → Ensure images are authentic
7. **Stop old containers** → Gracefully stop running containers
8. **Pull new images** → Download latest images
9. **Start new containers** → Run new version
10. **Health checks** → Verify frontend and backend are healthy
11. **Deployment complete** → Application is live

**Safety features:**
- Signature verification prevents tampered images
- Database connectivity check ensures DB is ready
- Health checks with retries ensure app is working
- Graceful container management prevents downtime

---

### Q5: What happens if a test fails?

**Answer:**

**In CI (Pull Request):**
1. Test fails → Job fails
2. CI summary job runs (always runs)
3. Determines overall status (failure)
4. Creates GitHub issue with error details
5. Comments on PR linking to issue
6. PR is blocked from merging
7. Developer fixes issue
8. Pushes fix → CI runs again
9. If passes → PR can be merged

**In Deployment:**
1. If any step fails → Deployment stops
2. Error logged
3. Old containers may still be running
4. Manual intervention needed
5. Rollback to previous version if needed

---

### Q6: Why do we use Testcontainers instead of a test database?

**Answer:**

**Testcontainers Benefits:**
- ✅ Real database behavior (not mocked)
- ✅ Isolated test environment (Docker container)
- ✅ No external dependencies (no test DB server needed)
- ✅ Tests actual SQL queries
- ✅ Automatic cleanup (container destroyed after test)

**Without Testcontainers:**
- ❌ Need separate test database server
- ❌ Tests may interfere with each other
- ❌ Harder to set up and maintain
- ❌ May not catch SQL issues

**Example:**
```java
// With Testcontainers
@Container
static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

// Test uses real PostgreSQL, tests actual SQL
```

---

### Q7: What is Page Object Model (POM) in E2E tests?

**Answer:**

**Definition:** Design pattern for organizing E2E tests

**Structure:**
```
pages/
  ├── login.page.ts      (LoginPage class)
  └── dashboard.page.ts  (DashboardPage class)

tests/
  └── auth.spec.ts       (Uses page objects)
```

**Benefits:**
- ✅ Reusable page interactions
- ✅ Easy to maintain (change selector in one place)
- ✅ Clear separation of concerns
- ✅ Readable tests

**Example:**
```typescript
// Without POM (bad)
await page.fill('input[type="email"]', 'user@example.com');
await page.fill('input[type="password"]', 'password');
await page.click('button[type="submit"]');

// With POM (good)
const loginPage = new LoginPage(page);
await loginPage.login('user@example.com', 'password');
```

---

### Q8: How does image signing prevent attacks?

**Answer:**

**Attack Scenario:**
1. Attacker compromises Docker registry
2. Tries to push malicious image
3. Image doesn't have valid signature
4. Deployment workflow verifies signature
5. Signature invalid → Deployment rejected
6. Attack prevented ✅

**How It Works:**
- Private key (secret) signs images in CI
- Public key (can be public) verifies in deployment
- Only CI system has private key
- Attacker can't create valid signature
- Deployment rejects unsigned/invalid images

**Real-World:**
- SolarWinds attack could have been prevented with signing
- Many companies now require signed images
- Industry best practice for supply chain security

---

### Q9: What's the difference between CI and CD?

**Answer:**

**CI (Continuous Integration):**
- **When:** On every Pull Request
- **What:** Build, test, validate code
- **Goal:** Ensure code quality before merging
- **Result:** PR can/cannot be merged

**CD (Continuous Deployment):**
- **When:** After code merged to main
- **What:** Deploy to production
- **Goal:** Release software automatically
- **Result:** Application in production

**Analogy:**
- CI = Quality control (checking products before shipping)
- CD = Shipping (delivering products to customers)

**Your Workflow:**
- `ci.yml` = CI (runs on PR)
- `deploy.yml` = CD (runs on merge to main)

---

### Q10: Why do we use multi-stage Docker builds?

**Answer:**

**Problem with single-stage builds:**
- Final image includes build tools (Node.js, Maven, etc.)
- Large image size (slower downloads)
- Security risk (build tools in production)

**Solution: Multi-stage builds:**
```dockerfile
# Stage 1: Build
FROM node:20 AS builder
RUN npm install
RUN npm run build

# Stage 2: Production
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

**Benefits:**
- ✅ Smaller final image (only production files)
- ✅ Faster deployments (less to download)
- ✅ More secure (no build tools)
- ✅ Better caching (build stage cached separately)

**Size Comparison:**
- Single-stage: ~500MB (includes Node.js, npm, etc.)
- Multi-stage: ~50MB (only nginx + built files)

---

## 8. Industry Best Practices

### Testing Pyramid

```
        /\
       /  \      E2E Tests (Few, Slow)
      /____\
     /      \    Integration Tests (Some, Medium)
    /________\
   /          \  Unit Tests (Many, Fast)
  /____________\
```

**Your Implementation:**
- ✅ Many unit tests (fast)
- ✅ Some integration tests (medium)
- ✅ Few E2E tests (slow)
- ✅ Proper pyramid structure

---

### Security Best Practices

**1. Defense in Depth:**
- Multiple security layers
- Your implementation: SBOM + Trivy + Cosign

**2. Fail Secure:**
- If security check fails → block deployment
- Your implementation: Trivy fails on CRITICAL/HIGH

**3. Least Privilege:**
- Containers run with minimal permissions
- Your implementation: Non-root users in containers

**4. Supply Chain Security:**
- Verify all components
- Your implementation: SBOM + signing + scanning

---

### CI/CD Best Practices

**1. Fast Feedback:**
- Run fast tests first
- Your implementation: Lint → Unit → Integration → E2E

**2. Fail Fast:**
- Stop pipeline on first failure
- Your implementation: Jobs depend on previous jobs

**3. Idempotent Deployments:**
- Deployments can be run multiple times safely
- Your implementation: Stop old, start new containers

**4. Automated Everything:**
- No manual steps
- Your implementation: Fully automated CI/CD

**5. Artifact Retention:**
- Keep test reports, SBOMs
- Your implementation: 7-day retention for artifacts

---

## 9. Troubleshooting Guide

### Common Issues & Solutions

#### Issue 1: Unit Tests Fail

**Symptoms:**
- CI job fails
- Error in test output

**Debugging:**
```bash
# Run tests locally
npm test              # Frontend
mvn test             # Backend

# Check specific test
npm test -- --include='**/auth.spec.ts'
mvn test -Dtest=AuthServiceTest
```

**Common Causes:**
- Test assertions wrong
- Mock setup incorrect
- Dependencies changed

**Solution:**
- Fix test code
- Update mocks
- Update dependencies

---

#### Issue 2: Integration Tests Fail

**Symptoms:**
- Testcontainers can't start
- Database connection fails

**Debugging:**
```bash
# Run integration tests locally
mvn verify

# Check Docker is running
docker ps
```

**Common Causes:**
- Docker not running
- Port conflicts
- Database initialization issues

**Solution:**
- Start Docker
- Check port availability
- Review Testcontainers configuration

---

#### Issue 3: E2E Tests Fail

**Symptoms:**
- Playwright tests timeout
- Elements not found

**Debugging:**
```bash
# Run E2E tests locally
npx playwright test

# Run with UI
npx playwright test --ui

# Check test report
npx playwright show-report
```

**Common Causes:**
- Frontend server not starting
- Selectors changed
- Network timeouts

**Solution:**
- Check frontend server logs
- Update selectors
- Increase timeouts

---

#### Issue 4: Trivy Finds Vulnerabilities

**Symptoms:**
- Security scan fails
- CRITICAL/HIGH vulnerabilities reported

**Debugging:**
```bash
# Scan locally
trivy image myapp:latest

# Check specific vulnerability
trivy image --severity CRITICAL myapp:latest
```

**Solution:**
1. Review vulnerability details
2. Update vulnerable package
3. Rebuild image
4. Rescan (should pass)

**Example:**
```bash
# Vulnerability found in package X
# Update package.json or pom.xml
npm update package-x
# or
mvn versions:use-latest-versions -Dincludes=package-x

# Rebuild and rescan
docker build -t myapp:latest .
trivy image myapp:latest
```

---

#### Issue 5: Deployment Fails

**Symptoms:**
- Deployment workflow fails
- Health checks fail

**Debugging:**
```bash
# Check container logs
docker logs myapp-frontend
docker logs myapp-backend

# Check container status
docker ps -a

# Check health endpoint
curl http://localhost:8081/actuator/health
```

**Common Causes:**
- Database not accessible
- Environment variables missing
- Port conflicts
- Application errors

**Solution:**
- Verify database connectivity
- Check environment variables
- Check port availability
- Review application logs

---

## 10. Key Concepts Summary

### CI/CD Pipeline Flow
```
PR → CI (Test) → Merge → CD (Deploy) → Production
```

### Testing Layers
```
Unit Tests → Integration Tests → E2E Tests
(Fast)        (Medium)           (Slow)
```

### Security Chain
```
SBOM → Vulnerability Scan → Image Signing → Verification
```

### Deployment Safety
```
Build → Sign → Verify → Deploy → Health Check
```

---

## 11. Quick Reference

### Commands

**Run Tests Locally:**
```bash
# Frontend unit tests
npm test

# Backend unit tests
mvn test

# Backend integration tests
mvn verify

# E2E tests
npx playwright test
```

**Docker Commands:**
```bash
# Build image
docker build -t myapp:latest .

# Run container
docker run -d --name myapp myapp:latest

# Check logs
docker logs myapp

# Stop container
docker stop myapp
```

**Security Commands:**
```bash
# Generate SBOM
syft docker-image:myapp:latest -o spdx-json > sbom.json

# Scan for vulnerabilities
trivy image myapp:latest

# Sign image
cosign sign --key cosign.key myapp:latest

# Verify signature
cosign verify --key cosign.pub myapp:latest
```

---

## 12. Final Exam Questions

Test your knowledge! Try answering these:

1. **What triggers the CI workflow?**
   - Answer: Pull Request to main branch

2. **What's the difference between unit and integration tests?**
   - Answer: Unit tests mock dependencies, integration tests use real database

3. **Why do we generate SBOMs?**
   - Answer: To inventory all dependencies for security, compliance, and audit

4. **What happens if Trivy finds a CRITICAL vulnerability?**
   - Answer: Build fails, PR blocked, developer must fix

5. **How does image signing prevent attacks?**
   - Answer: Only CI system can sign images, deployment verifies signatures, rejects tampered images

6. **What's the purpose of health checks in deployment?**
   - Answer: Verify application is running correctly after deployment

7. **Why use multi-stage Docker builds?**
   - Answer: Smaller images, faster deployments, more secure (no build tools)

8. **What is Page Object Model?**
   - Answer: Design pattern for organizing E2E tests, makes tests maintainable

---

## 🎓 Conclusion

You now understand:
- ✅ CI/CD fundamentals
- ✅ Your complete workflow
- ✅ All testing layers
- ✅ Security practices
- ✅ Deployment process
- ✅ Tools and technologies
- ✅ Troubleshooting

**You're ready to:**
- Explain your workflow to anyone
- Answer technical questions
- Debug issues
- Improve the pipeline
- Apply these concepts to other projects

**Next Steps:**
1. Review your actual workflow files
2. Run tests locally
3. Experiment with tools
4. Read tool documentation
5. Practice explaining to others

---

**Remember:** CI/CD is about automation, safety, and speed. Your workflow demonstrates industry best practices. Keep learning and improving! 🚀

