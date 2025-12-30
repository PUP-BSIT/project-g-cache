package com.pomodify.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pomodify.backend.presentation.dto.request.auth.LoginRequest;
import com.pomodify.backend.presentation.dto.request.auth.RegisterRequest;
import com.pomodify.backend.presentation.dto.request.auth.RefreshTokensRequest;
import com.pomodify.backend.presentation.dto.response.AuthResponse;
import com.pomodify.backend.presentation.dto.response.UserResponse;
import org.junit.jupiter.api.Test;
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
@SpringBootTest(classes = com.pomodify.backend.PomodifyApiApplication.class)
@AutoConfigureMockMvc
@Testcontainers
@Disabled("Requires Docker Desktop to be running")
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
        registry.add("spring.flyway.enabled", () -> "false");
        // Provide a test JWT secret so JwtService bean can be created during tests
        // Must be long enough for HMAC-SHA algorithms (HS512 needs >= 512 bits / 64 bytes).
        registry.add("jwt.secret", () -> "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
        // Provide token expiration properties required by JwtService
        registry.add("jwt.access-token-expiration", () -> "900000");
        registry.add("jwt.refresh-token-expiration", () -> "2592000000");
        registry.add("fcm.service-account", () -> "");
        registry.add("spring.mail.host", () -> "");
        registry.add("spring.mail.port", () -> "0");
        registry.add("spring.security.oauth2.client.registration.google.client-id", () -> "test-client-id");
        registry.add("spring.security.oauth2.client.registration.google.client-secret", () -> "test-client-secret");
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
        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
                .with(csrf()))
                .andExpect(status().isOk())
                .andReturn();
        
        // Tokens are returned as Set-Cookie headers, not in JSON body
        // Verify that cookies are present
        assertThat(loginResult.getResponse().getHeader("Set-Cookie")).isNotNull();
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
                .accept(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
                .with(csrf()))
                .andExpect(status().isOk())
                .andReturn();

        // Extract token from Set-Cookie header
        // Multiple cookies are returned as separate Set-Cookie headers
        java.util.List<String> setCookies = loginResult.getResponse().getHeaders("Set-Cookie");
        assertThat(setCookies).isNotEmpty();
        
        String accessToken = null;
        for (String setCookie : setCookies) {
            if (setCookie.startsWith("accessToken=")) {
                String encodedToken = setCookie.substring("accessToken=".length()).split(";")[0];
                // URL decode the token in case it's encoded
                accessToken = java.net.URLDecoder.decode(encodedToken, java.nio.charset.StandardCharsets.UTF_8);
                break;
            }
        }
        assertThat(accessToken).isNotNull();
        System.out.println("[TEST] Token extracted and decoded: " + accessToken.substring(0, Math.min(50, accessToken.length())) + "...");

        // Get current user with token in Authorization header (Spring Security requires this)
        MvcResult result = mockMvc.perform(get("/auth/users/me")
                .accept(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + accessToken))
                .andReturn();
        
        System.out.println("[TEST] Response status: " + result.getResponse().getStatus());
        System.out.println("[TEST] Response headers: ");
        result.getResponse().getHeaderNames().forEach(h -> 
            System.out.println("  " + h + ": " + result.getResponse().getHeader(h)));
        if (result.getResponse().getStatus() != 200) {
            String errorBody = result.getResponse().getContentAsString();
            System.out.println("[TEST] Error response: " + errorBody);
            System.out.println("[TEST] Exception: " + result.getResolvedException());
        }
        
        mockMvc.perform(get("/auth/users/me")
                .accept(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    void testGetCurrentUser_Unauthenticated() throws Exception {
        mockMvc.perform(get("/auth/users/me")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testLogout_Success() throws Exception {
        // Register, login, and logout
        String email = "logout+" + System.currentTimeMillis() + "@example.com";
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

        // Extract token from Set-Cookie header
        java.util.List<String> setCookies = loginResult.getResponse().getHeaders("Set-Cookie");
        assertThat(setCookies).isNotEmpty();
        String accessToken = null;
        for (String setCookie : setCookies) {
            if (setCookie.startsWith("accessToken=")) {
                String encodedToken = setCookie.substring("accessToken=".length()).split(";")[0];
                accessToken = java.net.URLDecoder.decode(encodedToken, java.nio.charset.StandardCharsets.UTF_8);
                break;
            }
        }
        assertThat(accessToken).isNotNull();

        // Logout
        mockMvc.perform(post("/auth/logout")
                .header("Authorization", "Bearer " + accessToken)
                .with(csrf()))
                .andExpect(status().isOk());
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

        // Extract tokens from Set-Cookie headers
        // Multiple cookies are returned as separate Set-Cookie headers
        java.util.List<String> setCookies = loginResult.getResponse().getHeaders("Set-Cookie");
        assertThat(setCookies).isNotEmpty();
        
        String refreshToken = null;
        for (String setCookie : setCookies) {
            if (setCookie.startsWith("refreshToken=")) {
                String encodedToken = setCookie.substring("refreshToken=".length()).split(";")[0];
                refreshToken = java.net.URLDecoder.decode(encodedToken, java.nio.charset.StandardCharsets.UTF_8);
                break;
            }
        }
        assertThat(refreshToken).isNotNull();

        // Test refresh endpoint
        RefreshTokensRequest refreshRequest = new RefreshTokensRequest(refreshToken);
        mockMvc.perform(post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(refreshRequest))
                .with(csrf()))
                .andExpect(status().isOk());
    }
}