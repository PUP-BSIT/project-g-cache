package com.pomodify.integration;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Base class for integration tests using Testcontainers PostgreSQL.
 * All integration tests should extend this class to automatically:
 * - Spin up a PostgreSQL container for each test class
 * - Configure Spring Boot to connect to the container
 * - Provide clean test data isolation
 */
@SpringBootTest
@Testcontainers
public abstract class IntegrationTestBase {

    protected static final String TEST_JWT_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("pomodifydb_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.show-sql", () -> "false");
        // Disable Flyway for tests - Hibernate will create schema
        registry.add("spring.flyway.enabled", () -> "false");
        // JWT configuration for tests
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("jwt.access-token-expiration", () -> "900000");
        registry.add("jwt.refresh-token-expiration", () -> "2592000000");
        // Disable Firebase for tests
        registry.add("fcm.service-account", () -> "");
        // Test email configuration
        registry.add("spring.mail.host", () -> "");
        registry.add("spring.mail.port", () -> "0");
        // Google OAuth2 test configuration
        registry.add("spring.security.oauth2.client.registration.google.client-id", () -> "test-client-id");
        registry.add("spring.security.oauth2.client.registration.google.client-secret", () -> "test-client-secret");
        // Disable AI for tests (use NoOpAiAdapter)
        registry.add("ai.enabled", () -> "false");
    }
}
