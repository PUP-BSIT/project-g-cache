# 🗄️ LAYER 2: Backend Integration Tests - Implementation Guide

## Overview

This layer tests **API endpoints with a real PostgreSQL database** using Testcontainers.

**Expected Duration:** 2-3 minutes per PR  
**Effort:** 8-10 hours setup  
**Impact:** Catch database-related bugs (persistence, constraints, transactions)

---

## Why Integration Tests Matter

### Example: Bug That Unit Tests Won't Catch

```java
// ❌ Bug: Unique constraint violated, but unit test passes

@Service
public class UserService {
    @Autowired UserRepository userRepository;
    
    public User registerUser(String email) {
        // Unit test mocks userRepository, so it never checks uniqueness
        // Integration test will catch this!
        return userRepository.save(new User(email));
    }
}

// Unit test (mocks repository):
@Test
void testUserRegistration() {
    when(userRepository.save(any())).thenReturn(user);
    assertTrue(userService.registerUser("test@test.com"));  // ✅ Passes
}

// Integration test (real DB with unique constraint):
@Test
void testCannotRegisterDuplicateEmail() {
    userService.registerUser("test@test.com");  // Saves first user
    assertThrows(
        DataIntegrityViolationException.class,
        () -> userService.registerUser("test@test.com")  // ❌ Should fail!
    );
}
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│ CI Pipeline: GitHub Actions             │
└─────────────────────────────────────────┘
                    ↓
         ┌──────────────────────┐
         │ Start Testcontainers │
         │ PostgreSQL Container │
         └──────────────────────┘
                    ↓
         ┌──────────────────────┐
         │ Run Integration Tests│
         │ - AuthController     │
         │ - SessionController  │
         │ - SettingsController │
         └──────────────────────┘
                    ↓
         ┌──────────────────────┐
         │ Container Cleanup    │
         │ (Database destroyed) │
         └──────────────────────┘
```

---

## Step 1: Add Testcontainers Dependency

Update `pomodify-backend/pom.xml`:

```xml
<properties>
    <testcontainers.version>1.19.6</testcontainers.version>
</properties>

<dependencies>
    <!-- Testcontainers -->
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>testcontainers</artifactId>
        <version>${testcontainers.version}</version>
        <scope>test</scope>
    </dependency>
    
    <!-- Testcontainers PostgreSQL Module -->
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>postgresql</artifactId>
        <version>${testcontainers.version}</version>
        <scope>test</scope>
    </dependency>

    <!-- Rest Assured for API testing (optional but useful) -->
    <dependency>
        <groupId>io.rest-assured</groupId>
        <artifactId>rest-assured</artifactId>
        <scope>test</scope>
    </dependency>

    <!-- Existing test dependencies (already present) -->
    <!-- spring-boot-starter-test -->
    <!-- spring-security-test -->
</dependencies>
```

---

## Step 2: Create Integration Test Base Class

Create `pomodify-backend/src/test/java/com/pomodify/backend/integration/IntegrationTestBase.java`:

```java
package com.pomodify.backend.integration;

import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Base class for all integration tests.
 * 
 * Starts a PostgreSQL container for each test class.
 * Database is initialized fresh and cleaned up after tests.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@AutoConfigureMockMvc
@Tag("integration")
public abstract class IntegrationTestBase {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("pomodify_test")
            .withUsername("postgres")
            .withPassword("postgres")
            .withLabel("project", "pomodify");

    /**
     * Dynamically set Spring properties to use Testcontainers DB
     */
    @DynamicPropertySource
    static void overrideProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.properties.hibernate.dialect", 
            () -> "org.hibernate.dialect.PostgreSQLDialect");
    }
}
```

---

## Step 3: Create Sample Integration Tests

### Test 1: User Authentication Controller

Create `pomodify-backend/src/test/java/com/pomodify/backend/integration/UserControllerIntegrationTest.java`:

```java
package com.pomodify.backend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pomodify.backend.presentation.dto.LoginRequest;
import com.pomodify.backend.presentation.dto.LoginResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("User Controller Integration Tests")
class UserControllerIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Should successfully register a new user")
    void testSuccessfulUserRegistration() throws Exception {
        // GIVEN: Valid registration request
        var request = new RegisterRequest(
            "newuser@example.com",
            "John Doe",
            "SecurePassword123!"
        );

        // WHEN: Sending registration request
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        
        // THEN: Should return 201 Created with user ID
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.email").value("newuser@example.com"))
                .andExpect(jsonPath("$.name").value("John Doe"));
    }

    @Test
    @DisplayName("Should reject duplicate email registration")
    void testDuplicateEmailRegistrationFails() throws Exception {
        // GIVEN: User already registered
        var request1 = new RegisterRequest(
            "duplicate@example.com",
            "User One",
            "Password123!"
        );
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request1)))
                .andExpect(status().isCreated());

        // WHEN: Attempting to register with same email
        var request2 = new RegisterRequest(
            "duplicate@example.com",
            "User Two",
            "Password123!"
        );

        // THEN: Should return 409 Conflict
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request2)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message")
                    .value(containsString("Email already registered")));
    }

    @Test
    @DisplayName("Should authenticate user with correct credentials")
    void testSuccessfulLoginWithValidCredentials() throws Exception {
        // GIVEN: Registered user
        registerUser("test@example.com", "SecurePassword123!");

        // WHEN: Logging in with correct credentials
        var loginRequest = new LoginRequest("test@example.com", "SecurePassword123!");
        
        // THEN: Should return JWT token
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    @DisplayName("Should reject login with wrong password")
    void testLoginFailsWithWrongPassword() throws Exception {
        // GIVEN: Registered user
        registerUser("test@example.com", "SecurePassword123!");

        // WHEN: Logging in with wrong password
        var loginRequest = new LoginRequest("test@example.com", "WrongPassword");

        // THEN: Should return 401 Unauthorized
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message")
                    .value(containsString("Invalid credentials")));
    }

    @Test
    @DisplayName("Should reject login for non-existent user")
    void testLoginFailsForNonExistentUser() throws Exception {
        // GIVEN: No user registered
        
        // WHEN: Trying to login with non-existent email
        var loginRequest = new LoginRequest("notfound@example.com", "password");

        // THEN: Should return 401 Unauthorized
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    // Helper method to register a user
    private void registerUser(String email, String password) throws Exception {
        var request = new RegisterRequest(email, "Test User", password);
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }
}
```

---

### Test 2: Session Controller

Create `pomodify-backend/src/test/java/com/pomodify/backend/integration/SessionControllerIntegrationTest.java`:

```java
package com.pomodify.backend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Session Controller Integration Tests")
class SessionControllerIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Should create a new session")
    void testCreateSession() throws Exception {
        // GIVEN: Valid session request
        var request = new CreateSessionRequest(
            "Focus Session",
            25,  // minutes
            5,   // break minutes
            "WORK"
        );

        // WHEN: Creating session
        mockMvc.perform(post("/api/sessions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        
        // THEN: Should return 201 Created with session ID
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("Focus Session"))
                .andExpect(jsonPath("$.workDuration").value(25))
                .andExpect(jsonPath("$.breakDuration").value(5));
    }

    @Test
    @DisplayName("Should retrieve all sessions for user")
    void testGetAllSessions() throws Exception {
        // GIVEN: Multiple sessions created
        createSession("Session 1", 25, 5);
        createSession("Session 2", 30, 10);
        createSession("Session 3", 45, 15);

        // WHEN: Retrieving all sessions
        // THEN: Should return all sessions with pagination
        mockMvc.perform(get("/api/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(3)))
                .andExpect(jsonPath("$.content[0].name").value("Session 1"))
                .andExpect(jsonPath("$.content[1].name").value("Session 2"))
                .andExpect(jsonPath("$.content[2].name").value("Session 3"));
    }

    @Test
    @DisplayName("Should update existing session")
    void testUpdateSession() throws Exception {
        // GIVEN: Existing session
        var sessionId = createSessionAndGetId("Original Name", 25, 5);

        // WHEN: Updating session
        var updateRequest = new UpdateSessionRequest(
            "Updated Name",
            30,  // changed from 25
            10   // changed from 5
        );
        
        mockMvc.perform(put("/api/sessions/" + sessionId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
        
        // THEN: Should return 200 OK with updated values
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Name"))
                .andExpect(jsonPath("$.workDuration").value(30))
                .andExpect(jsonPath("$.breakDuration").value(10));
    }

    @Test
    @DisplayName("Should delete session")
    void testDeleteSession() throws Exception {
        // GIVEN: Existing session
        var sessionId = createSessionAndGetId("To Delete", 25, 5);

        // WHEN: Deleting session
        mockMvc.perform(delete("/api/sessions/" + sessionId))
        
        // THEN: Should return 204 No Content
                .andExpect(status().isNoContent());

        // AND: Session should not exist anymore
        mockMvc.perform(get("/api/sessions/" + sessionId))
                .andExpect(status().isNotFound());
    }

    // Helper methods
    private void createSession(String name, int work, int breakDuration) throws Exception {
        var request = new CreateSessionRequest(name, work, breakDuration, "WORK");
        mockMvc.perform(post("/api/sessions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    private Integer createSessionAndGetId(String name, int work, int breakDuration) 
            throws Exception {
        // This is a simplified version - in real code, parse the response
        // For now, assume ID increments from 1
        createSession(name, work, breakDuration);
        return 1; // Mock return
    }
}
```

---

## Step 4: Update Maven Configuration

Update `pomodify-backend/pom.xml` to separate unit and integration tests:

```xml
<build>
    <plugins>
        <!-- Surefire for Unit Tests -->
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-surefire-plugin</artifactId>
            <version>3.1.2</version>
            <configuration>
                <includes>
                    <include>**/*Test.java</include>
                </includes>
                <excludes>
                    <exclude>**/integration/**/*Test.java</exclude>
                </excludes>
                <groups>!integration</groups>
            </configuration>
        </plugin>

        <!-- Failsafe for Integration Tests -->
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-failsafe-plugin</artifactId>
            <version>3.1.2</version>
            <configuration>
                <includes>
                    <include>**/integration/**/*Test.java</include>
                </includes>
                <groups>integration</groups>
            </configuration>
            <executions>
                <execution>
                    <goals>
                        <goal>integration-test</goal>
                        <goal>verify</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

---

## Step 5: Update CI Workflow

Add integration test step to `.github/workflows/ci.yml`:

```yaml
  backend-integration-tests:
    name: Backend Integration Tests
    runs-on: ubuntu-latest
    services:
      docker:
        image: docker:20.10
        options: --privileged
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: maven

      - name: Run integration tests
        working-directory: pomodify-backend
        run: mvn verify -DskipUnitTests -Dgroups="integration"

      - name: Upload integration test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: backend-integration-tests
          path: pomodify-backend/target/failsafe-reports/

  # Update build job to depend on integration tests
  build-and-test:
    name: Build Docker Images
    needs: [frontend-unit-tests, backend-unit-tests, backend-integration-tests, lint-and-validate]
    runs-on: ubuntu-latest
    steps:
      # ... existing build steps ...
```

---

## Step 6: Run Tests Locally

```bash
cd pomodify-backend

# Run only unit tests (excludes integration)
mvn test

# Run only integration tests
mvn verify -DskipUnitTests -Dgroups="integration"

# Run both
mvn verify

# Run specific test class
mvn test -Dtest=UserControllerIntegrationTest
```

---

## Step 7: Test with Docker (How CI Runs It)

```bash
# Start Docker container for PostgreSQL
docker run -d \
  --name pomodify-postgres \
  -e POSTGRES_DB=pomodify_test \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15-alpine

# Run tests (Testcontainers will use Docker)
cd pomodify-backend
mvn verify

# Cleanup
docker stop pomodify-postgres
docker rm pomodify-postgres
```

---

## Sample Test Output

When successful:

```
[INFO] 
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.pomodify.backend.integration.UserControllerIntegrationTest
[INFO]   Should successfully register a new user .......... PASSED
[INFO]   Should reject duplicate email registration ....... PASSED
[INFO]   Should authenticate user with correct credentials  PASSED
[INFO]   Should reject login with wrong password ........... PASSED
[INFO] Running com.pomodify.backend.integration.SessionControllerIntegrationTest
[INFO]   Should create a new session ...................... PASSED
[INFO]   Should retrieve all sessions for user ............ PASSED
[INFO]   Should update existing session ................... PASSED
[INFO]   Should delete session ............................ PASSED
[INFO] 
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] BUILD SUCCESS
```

---

## Common Issues & Fixes

### Issue: "Cannot connect to Docker daemon"
```bash
# Testcontainers needs Docker
# Verify Docker is running
docker ps

# In GitHub Actions, Docker is provided
```

### Issue: "Database connection timeout"
```java
// Increase timeout in IntegrationTestBase
postgres.withConnectTimeoutSeconds(30)
        .withStartupTimeoutSeconds(60)
```

### Issue: "Unique constraint violations in tests"
```java
// Each test should use clean data
// Testcontainers creates fresh DB per class, but:

@Test
void testOne() {
    // Use unique values
    registerUser("test1@example.com");
}

@Test
void testTwo() {
    // Use different unique values
    registerUser("test2@example.com");
}
```

---

## Next: Move to Layer 3

Once Layer 2 is working:

1. Merge PR to main
2. Integration tests run with each PR
3. Then start Layer 3 (E2E Tests)
4. Create branch: `feature/ci-layer-3-e2e-tests`

---

**Estimated Completion:** 8-10 hours  
**Complexity:** Medium (new test framework)  
**Risk:** Low (only test code, doesn't affect production)
