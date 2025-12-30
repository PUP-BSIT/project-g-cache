package com.pomodify.backend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pomodify.backend.domain.enums.AuthProvider;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import com.pomodify.backend.domain.valueobject.Email;
import com.pomodify.backend.presentation.dto.request.auth.LoginRequest;
import com.pomodify.backend.presentation.dto.request.auth.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test for Google OAuth2 user scenarios.
 * Tests that users with GOOGLE auth provider work correctly with the system.
 * Uses Testcontainers PostgreSQL for realistic database testing.
 */
@SpringBootTest(classes = com.pomodify.backend.PomodifyApiApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class GoogleOAuth2IntegrationTest {

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
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Test
    void testGoogleUserCanBeCreatedAndRetrieved() throws Exception {
        // Create a Google OAuth2 user directly in the database
        // (simulating what happens after successful Google OAuth2 callback)
        String googleEmail = "google-user-" + System.currentTimeMillis() + "@gmail.com";
        String firstName = "Google";
        String lastName = "User";

        Email emailObj = new Email(googleEmail);
        User googleUser = User.builder()
                .email(emailObj)
                .firstName(firstName)
                .lastName(lastName)
                .passwordHash("") // Google users don't have passwords
                .authProvider(AuthProvider.GOOGLE)
                .isActive(true)
                .isEmailVerified(true) // Google users are auto-verified
                .build();
        
        User savedUser = userRepository.save(googleUser);
        assertThat(savedUser.getId()).isNotNull();

        // Verify the user was saved correctly
        User foundUser = userRepository.findByEmail(emailObj).orElse(null);
        assertThat(foundUser).isNotNull();
        assertThat(foundUser.getAuthProvider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(foundUser.isEmailVerified()).isTrue();
        assertThat(foundUser.getFirstName()).isEqualTo(firstName);
        assertThat(foundUser.getLastName()).isEqualTo(lastName);

        // Verify Google user count
        int activeUsers = userRepository.findAllActive().size();
        assertThat(activeUsers).isGreaterThanOrEqualTo(1);
    }
}
