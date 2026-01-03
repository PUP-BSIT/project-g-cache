package com.pomodify.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import com.pomodify.backend.domain.valueobject.Email;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = com.pomodify.backend.PomodifyApiApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
@DisplayName("Admin Controller Integration Tests")
class AdminControllerIntegrationTest {

    private static final String TEST_ADMIN_USERNAME = "admin";
    private static final String TEST_ADMIN_PASSWORD = "admin123";

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

    private User createTestUser(String firstName, String lastName, String email) {
        User user = User.builder()
                .firstName(firstName)
                .lastName(lastName)
                .email(Email.of(email))
                .passwordHash("hashedpassword")
                .isEmailVerified(true)
                .isActive(true)
                .build();
        return userRepository.save(user);
    }

    @Nested
    @DisplayName("POST /api/v2/admin/login")
    class AdminLoginTests {

        @Test
        @DisplayName("Should login successfully with valid credentials")
        void shouldLoginWithValidCredentials() throws Exception {
            Map<String, String> credentials = Map.of(
                    "username", TEST_ADMIN_USERNAME,
                    "password", TEST_ADMIN_PASSWORD
            );

            mockMvc.perform(post("/api/v2/admin/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(credentials)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Admin login successful"));
        }

        @Test
        @DisplayName("Should reject invalid username")
        void shouldRejectInvalidUsername() throws Exception {
            Map<String, String> credentials = Map.of(
                    "username", "wronguser",
                    "password", TEST_ADMIN_PASSWORD
            );

            mockMvc.perform(post("/api/v2/admin/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(credentials)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Invalid admin credentials"));
        }

        @Test
        @DisplayName("Should reject invalid password")
        void shouldRejectInvalidPassword() throws Exception {
            Map<String, String> credentials = Map.of(
                    "username", TEST_ADMIN_USERNAME,
                    "password", "wrongpassword"
            );

            mockMvc.perform(post("/api/v2/admin/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(credentials)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false));
        }
    }

    @Nested
    @DisplayName("GET /api/v2/admin/users")
    class GetAllUsersTests {

        @Test
        @DisplayName("Should return all active users")
        void shouldReturnAllActiveUsers() throws Exception {
            String uniqueSuffix = String.valueOf(System.currentTimeMillis());
            createTestUser("John", "Doe", "john.doe" + uniqueSuffix + "@test.com");
            createTestUser("Jane", "Smith", "jane.smith" + uniqueSuffix + "@test.com");

            mockMvc.perform(get("/api/v2/admin/users"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(2))));
        }

        @Test
        @DisplayName("Should return list (possibly empty) when called")
        void shouldReturnListWhenCalled() throws Exception {
            mockMvc.perform(get("/api/v2/admin/users"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray());
        }
    }

    @Nested
    @DisplayName("GET /api/v2/admin/users/search")
    class SearchUsersTests {

        @Test
        @DisplayName("Should search users by first name")
        void shouldSearchByFirstName() throws Exception {
            String uniqueSuffix = String.valueOf(System.currentTimeMillis());
            createTestUser("UniqueAlice" + uniqueSuffix, "Wonder", "alice" + uniqueSuffix + "@test.com");

            mockMvc.perform(get("/api/v2/admin/users/search")
                            .param("query", "UniqueAlice" + uniqueSuffix))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].firstName").value("UniqueAlice" + uniqueSuffix));
        }

        @Test
        @DisplayName("Should search users by email")
        void shouldSearchByEmail() throws Exception {
            String uniqueSuffix = String.valueOf(System.currentTimeMillis());
            createTestUser("David", "Test", "david.unique" + uniqueSuffix + "@test.com");

            mockMvc.perform(get("/api/v2/admin/users/search")
                            .param("query", "david.unique" + uniqueSuffix))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].email").value("david.unique" + uniqueSuffix + "@test.com"));
        }

        @Test
        @DisplayName("Should return empty list for non-matching query")
        void shouldReturnEmptyForNonMatchingQuery() throws Exception {
            mockMvc.perform(get("/api/v2/admin/users/search")
                            .param("query", "nonexistentuser12345xyz"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }

        @Test
        @DisplayName("Should be case insensitive")
        void shouldBeCaseInsensitive() throws Exception {
            String uniqueSuffix = String.valueOf(System.currentTimeMillis());
            createTestUser("CaseFrank" + uniqueSuffix, "Miller", "frank" + uniqueSuffix + "@test.com");

            mockMvc.perform(get("/api/v2/admin/users/search")
                            .param("query", "casefrank" + uniqueSuffix))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));
        }
    }

    @Nested
    @DisplayName("DELETE /api/v2/admin/users/{userId}")
    class DeleteUserTests {

        @Test
        @DisplayName("Should delete user successfully")
        void shouldDeleteUserSuccessfully() throws Exception {
            String uniqueSuffix = String.valueOf(System.currentTimeMillis());
            User user = createTestUser("ToDelete" + uniqueSuffix, "User", "todelete" + uniqueSuffix + "@test.com");

            mockMvc.perform(delete("/api/v2/admin/users/" + user.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("User deleted successfully"));

            // Verify user is soft-deleted (not in active users list)
            mockMvc.perform(get("/api/v2/admin/users/search")
                            .param("query", "todelete" + uniqueSuffix + "@test.com"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }

        @Test
        @DisplayName("Should return 404 for non-existent user")
        void shouldReturn404ForNonExistentUser() throws Exception {
            mockMvc.perform(delete("/api/v2/admin/users/999999"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message", containsString("not found")));
        }
    }

    @Nested
    @DisplayName("User DTO Response Format")
    class UserDtoFormatTests {

        @Test
        @DisplayName("Should return correct user DTO fields")
        void shouldReturnCorrectUserDtoFields() throws Exception {
            String uniqueSuffix = String.valueOf(System.currentTimeMillis());
            createTestUser("TestFormat" + uniqueSuffix, "User", "testformat" + uniqueSuffix + "@test.com");

            mockMvc.perform(get("/api/v2/admin/users/search")
                            .param("query", "testformat" + uniqueSuffix + "@test.com"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].id").isNumber())
                    .andExpect(jsonPath("$[0].firstName").value("TestFormat" + uniqueSuffix))
                    .andExpect(jsonPath("$[0].lastName").value("User"))
                    .andExpect(jsonPath("$[0].email").value("testformat" + uniqueSuffix + "@test.com"))
                    .andExpect(jsonPath("$[0].emailVerified").isBoolean())
                    .andExpect(jsonPath("$[0].active").isBoolean());
        }
    }
}
