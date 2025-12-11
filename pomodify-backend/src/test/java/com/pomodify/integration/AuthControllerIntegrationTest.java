package com.pomodify.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pomodify.backend.presentation.dto.request.auth.LoginRequest;
import com.pomodify.backend.presentation.dto.request.auth.RegisterRequest;
import com.pomodify.backend.presentation.dto.request.auth.RefreshTokensRequest;
import com.pomodify.backend.presentation.dto.response.AuthResponse;
import com.pomodify.backend.presentation.dto.response.UserResponse;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.junit.jupiter.api.Disabled;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for AuthController.
 * Tests user registration, login, logout, and token refresh flows.
 * DISABLED: Requires Docker Desktop to be running. Tests can be enabled once Docker is available.
 */
//@Disabled("Requires Docker Desktop for PostgreSQL container")
@ActiveProfiles("dev")
@SpringBootTest(classes = com.pomodify.backend.PomodifyApiApplication.class)
@AutoConfigureMockMvc
@Testcontainers
class AuthControllerIntegrationTest {

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
                // Provide a test JWT secret so JwtService bean can be created during tests
                // Must be long enough for HMAC-SHA algorithms (HS512 needs >= 512 bits / 64 bytes).
                registry.add("jwt.secret", () -> "test-secret-that-is-long-enough-for-hs512-please-change-if-needed-0123456789");
                // Provide token expiration properties required by JwtService
                registry.add("jwt.access-token-expiration", () -> "900000");
                registry.add("jwt.refresh-token-expiration", () -> "2592000000");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void testRegisterUser_Success() throws Exception {
        String email = "john+" + System.currentTimeMillis() + "@example.com";
        RegisterRequest request = new RegisterRequest(
                "John",
                "Doe",
                email,
                "SecurePassword123!"
        );

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.firstName").value("John"))
                .andExpect(jsonPath("$.lastName").value("Doe"));
        
    }

    @Test
    void testRegisterUser_DuplicateEmail() throws Exception {
                String email = "dup+" + System.currentTimeMillis() + "@example.com";
                RegisterRequest request1 = new RegisterRequest("John", "Doe", email, "Password123!");
                RegisterRequest request2 = new RegisterRequest("Jane", "Smith", email, "Password456!");

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request1))
                .with(csrf()))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request2))
                .with(csrf()))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void testLoginUser_Success() throws Exception {
        // Register user first
                String email = "login+" + System.currentTimeMillis() + "@example.com";
                RegisterRequest registerRequest = new RegisterRequest("John", "Doe", email, "Password123!");
        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest))
                .with(csrf()))
                .andExpect(status().isCreated());

        // Login with correct credentials
        LoginRequest loginRequest = new LoginRequest(email, "Password123!");
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(email));
    }

    @Test
    void testLoginUser_InvalidCredentials() throws Exception {
        // Register user
                String email = "invalid+" + System.currentTimeMillis() + "@example.com";
                RegisterRequest registerRequest = new RegisterRequest("John", "Doe", email, "Password123!");
                mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest))
                .with(csrf()))
                .andExpect(status().isCreated());

        // Login with wrong password
        LoginRequest loginRequest = new LoginRequest(email, "WrongPassword");
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
                .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testLoginUser_UserNotFound() throws Exception {
        LoginRequest loginRequest = new LoginRequest("nonexistent@example.com", "Password123!");
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
                .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testGetCurrentUser_Authenticated() throws Exception {
        // Register and login user
        String email = "me+" + System.currentTimeMillis() + "@example.com";
        RegisterRequest registerRequest = new RegisterRequest("John", "Doe", email, "Password123!");
        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest))
                .with(csrf()))
                .andExpect(status().isCreated());
        LoginRequest loginRequest = new LoginRequest(email, "Password123!");
        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
                .with(csrf()))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(
                loginResult.getResponse().getContentAsString(),
                AuthResponse.class
        );

        // Get current user with token
        mockMvc.perform(get("/auth/me")
                .header("Authorization", "Bearer " + authResponse.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    void testGetCurrentUser_Unauthenticated() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testLogout_Success() throws Exception {
        // Register, login, and logout
                String email = "logout+" + System.currentTimeMillis() + "@example.com";
                RegisterRequest registerRequest = new RegisterRequest("John", "Doe", email, "Password123!");
                mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        LoginRequest loginRequest = new LoginRequest(email, "Password123!");
        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(
                loginResult.getResponse().getContentAsString(),
                AuthResponse.class
        );

        // Logout
        mockMvc.perform(post("/auth/logout")
                .header("Authorization", "Bearer " + authResponse.accessToken())
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void testRefreshTokens_Success() throws Exception {
        // Register and login to get refresh token
        String email = "refresh+" + System.currentTimeMillis() + "@example.com";
        RegisterRequest registerRequest = new RegisterRequest("Jane", "Smith", email, "Password123!");
        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest))
                .with(csrf()))
                .andExpect(status().isCreated());

        LoginRequest loginRequest = new LoginRequest(email, "Password123!");
        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
                .with(csrf()))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(
                loginResult.getResponse().getContentAsString(),
                AuthResponse.class
        );

        String refreshToken = authResponse.refreshToken();
        assertThat(refreshToken).isNotNull();

        // Test refresh endpoint
        RefreshTokensRequest refreshRequest = new RefreshTokensRequest(refreshToken);
        mockMvc.perform(post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(refreshRequest))
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists());
    }
}
