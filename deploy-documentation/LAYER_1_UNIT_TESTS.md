# 🧪 LAYER 1: Unit Tests in CI - Implementation Guide

## Overview

This layer runs your **existing unit tests** in the CI pipeline and blocks PRs if they fail.

**Expected Duration:** 30-60 seconds  
**Effort:** 2-3 hours setup  
**Impact:** Catch logic errors immediately

---

## Current Status

### Frontend Unit Tests ✅

Your project has 12 test files:

```
pomodify-frontend/src/app/
├── pages/
│   ├── settings/settings.spec.ts
│   ├── signup/signup.spec.ts
│   ├── report/report.spec.ts
│   ├── landing/landing.spec.ts
├── core/
│   └── services/auth.spec.ts
├── shared/
│   ├── services/timer.spec.ts
│   └── components/
│       ├── verify-email-modal/verify-email-modal.spec.ts
│       ├── header/header.spec.ts
│       ├── edit-note-modal/edit-note-modal.spec.ts
│       ├── create-note-modal/create-note-modal.spec.ts
│       └── delete-note-modal/delete-note-modal.spec.ts
└── app.spec.ts
```

**Status:** Exist locally but NOT in CI pipeline

---

### Backend Unit Tests ✅

Your project has 10 test files:

```
pomodify-backend/src/test/java/com/pomodify/
├── AuthControllerTest.java
├── ApplicationContextTest.java
├── application/
│   ├── listener/UserSettingsChangedListenerTest.java
│   └── service/
│       ├── DashboardServiceTest.java
│       ├── PushNotificationEnforcementTest.java
│       └── SettingsServicePersistenceTest.java
├── domain/UserStreakTest.java
└── presentation/controller/
    ├── DashboardControllerWebMvcTest.java
    ├── ReportsControllerWebMvcTest.java
    └── SettingsControllerWebMvcTest.java
```

**Status:** Exist locally but NOT in CI pipeline

---

## Step 1: Update Frontend `package.json`

Add a CI-friendly test script:

```json
{
  "scripts": {
    "test": "ng test",
    "test:ci": "ng test --watch=false --code-coverage --browsers=ChromeHeadless",
    "test:coverage": "ng test --code-coverage --watch=false"
  }
}
```

**What each script does:**
- `test` - Interactive watch mode (local development)
- `test:ci` - ✅ Run once, no watch, headless Chrome, with coverage
- `test:coverage` - Generate coverage report

---

## Step 2: Configure Karma for CI

Update or create `karma.conf.js` in `pomodify-frontend/`:

```javascript
module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {},
      clearContext: false
    },
    jasmineHtmlReporter: {
      suppressAll: true
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/pomodify-frontend'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcovonly' },
        { type: 'json' }
      ],
      check: {
        global: {
          statements: 50,
          branches: 50,
          functions: 50,
          lines: 50
        }
      }
    },
    reporters: ['progress', 'kjhtml', 'coverage'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage'
        ]
      }
    },
    singleRun: false,
    restartOnFileChange: true
  });
};
```

---

## Step 3: Update GitHub Actions CI Workflow

Replace the test section in `.github/workflows/ci.yml`:

**Before (Current):**
```yaml
jobs:
  lint-and-validate:
    # ...
  build-and-test:
    # Just builds Docker, no unit tests
    name: Build and Test Docker Images
```

**After (New):**
```yaml
jobs:
  # NEW: Frontend Unit Tests
  frontend-unit-tests:
    name: Frontend Unit Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 'pomodify-frontend/package-lock.json'

      - name: Install dependencies
        working-directory: pomodify-frontend
        run: npm install --legacy-peer-deps

      - name: Run unit tests
        working-directory: pomodify-frontend
        run: npm run test:ci

      - name: Upload coverage reports
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: frontend-coverage
          path: pomodify-frontend/coverage/

      - name: Comment coverage on PR
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const summary = fs.readFileSync('pomodify-frontend/coverage/index.html', 'utf8');
            const coverage = summary.match(/(\d+\.?\d*)/g);
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `✅ Frontend Tests Passed\nCoverage: ${coverage?.[0]}%`
            });

  # NEW: Backend Unit Tests
  backend-unit-tests:
    name: Backend Unit Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: maven

      - name: Run unit tests
        working-directory: pomodify-backend
        run: mvn test -DskipIntegrationTests

      - name: Generate test report
        working-directory: pomodify-backend
        run: mvn surefire-report:report

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: backend-unit-tests
          path: pomodify-backend/target/surefire-reports/

  # EXISTING: Lint and Validate
  lint-and-validate:
    name: Lint and Validate Code
    runs-on: ubuntu-latest
    steps:
      # ... existing validation steps ...

  # UPDATED: Build and Test Docker (now depends on unit tests)
  build-and-test:
    name: Build and Test Docker Images
    needs: [frontend-unit-tests, backend-unit-tests, lint-and-validate]
    runs-on: ubuntu-latest
    steps:
      # ... existing build steps ...

  # UPDATED: CI Summary (now includes test status)
  ci-summary:
    name: CI Summary and Gate
    needs: [frontend-unit-tests, backend-unit-tests, build-and-test]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Check if tests passed
        run: |
          if [ "${{ needs.frontend-unit-tests.result }}" != "success" ]; then
            echo "❌ Frontend unit tests failed"
            exit 1
          fi
          if [ "${{ needs.backend-unit-tests.result }}" != "success" ]; then
            echo "❌ Backend unit tests failed"
            exit 1
          fi
          echo "✅ All tests passed!"

      - name: Success message
        run: |
          echo "════════════════════════════════════════"
          echo "✅ ALL CI CHECKS PASSED!"
          echo "════════════════════════════════════════"
          echo ""
          echo "📊 Test Summary:"
          echo "  ✅ Frontend Unit Tests - Passed"
          echo "  ✅ Backend Unit Tests - Passed"
          echo "  ✅ Docker Validation - Passed"
          echo "  ✅ Docker Build - Passed"
          echo "  ✅ Container Health Check - Passed"
          echo ""
          echo "🎉 This PR is safe to merge!"
          echo "🚀 Deploy to production will start after merge"
          echo "════════════════════════════════════════"
```

---

## Step 4: Configure Maven for Unit Tests Only

Update `pomodify-backend/pom.xml`:

```xml
<build>
  <plugins>
    <!-- ... existing plugins ... -->
    
    <!-- Surefire Plugin for Unit Tests -->
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-surefire-plugin</artifactId>
      <version>3.1.2</version>
      <configuration>
        <skipTests>false</skipTests>
        <excludedGroups>integration</excludedGroups>
      </configuration>
    </plugin>

    <!-- Surefire Report Plugin -->
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-surefire-report-plugin</artifactId>
      <version>3.1.2</version>
      <configuration>
        <outputDirectory>${project.build.directory}/surefire-reports</outputDirectory>
      </configuration>
    </plugin>
  </plugins>
</build>
```

---

## Step 5: Test Locally First

Before merging to CI, verify tests work locally:

### Frontend Tests

```bash
cd pomodify-frontend

# Install dependencies
npm install --legacy-peer-deps

# Run tests in headless mode (like CI)
npm run test:ci

# You should see:
# ✔ 12 specs, 0 failures
```

### Backend Tests

```bash
cd pomodify-backend

# Run unit tests only
mvn test -DskipIntegrationTests

# You should see:
# [INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
```

---

## Step 6: Create Branch and Update CI

```bash
git checkout -b feature/ci-layer-1-unit-tests

# Update package.json and ci.yml as shown above

git add .
git commit -m "feat: add unit tests to CI pipeline"
git push origin feature/ci-layer-1-unit-tests
```

Create PR and verify GitHub Actions runs the new tests.

---

## Fixing Test Failures

If any tests fail, the PR will be **blocked** with error details:

### Example: Frontend Test Fails

```
❌ Error: Expected true but got false
  File: auth.spec.ts:45
  
  Spec: "should validate email format"
  Expected: Email validation to return true for valid@email.com
  But got: false
```

**How to fix:**
1. Read error message
2. Open the test file
3. Debug locally: `npm test` (interactive mode)
4. Fix the code
5. Run tests again
6. Push fix - PR unblocks

---

## Success Indicators

✅ You've completed Layer 1 when:

- [ ] `npm run test:ci` works locally in pomodify-frontend
- [ ] `mvn test` works locally in pomodify-backend
- [ ] GitHub Actions runs both test commands
- [ ] PR blocks if any test fails
- [ ] PR allows merge if all tests pass
- [ ] Coverage reports appear in artifacts

---

## Common Issues & Fixes

### Issue: "Chrome not found"
```bash
# Karma needs Chrome for headless testing
# Fix: Install Chromium
sudo apt-get install chromium-browser

# Or use the Chrome that's already in CI
# (GitHub Actions provides Chrome)
```

### Issue: "Cannot find module @angular/..."
```bash
# Fix: npm install --legacy-peer-deps
npm install --legacy-peer-deps
npm run test:ci
```

### Issue: "Tests timeout"
```javascript
// In karma.conf.js
browserNoActivityTimeout: 30000,  // 30 seconds
browserDisconnectTimeout: 10000,  // 10 seconds
```

### Issue: "Cannot find test file"
```bash
# Verify all .spec.ts files are in src/app
find pomodify-frontend -name "*.spec.ts" -type f

# Should find 12 files in src/app/
```

---

## Next: Move to Layer 2

Once Layer 1 is working:

1. Merge PR to main
2. Verify deployment works
3. Then start Layer 2 (Integration Tests)
4. Create branch: `feature/ci-layer-2-integration-tests`

---

**Estimated Completion:** 2-3 hours  
**Complexity:** Low (just wiring up existing tests)  
**Risk:** None (tests already exist)
