package com.pomodify.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pomodify.backend.presentation.dto.request.auth.LoginRequest;
import com.pomodify.backend.presentation.dto.request.auth.RegisterRequest;
import com.pomodify.backend.presentation.dto.request.category.CategoryRequest;
import com.pomodify.backend.presentation.dto.response.AuthResponse;
import org.junit.jupiter.api.BeforeEach;
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
import org.junit.jupiter.api.Disabled;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for CategoryController.
 * Tests category CRUD operations and retrieval.
 * DISABLED: Requires Docker Desktop to be running. Tests can be enabled once Docker is available.
 */
@SpringBootTest(classes = com.pomodify.backend.PomodifyApiApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class CategoryControllerIntegrationTest {

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
        registry.add("jwt.secret", () -> "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
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

    private String testEmail;
    private String accessToken;

    @BeforeEach
    void setUp() throws Exception {
        // Generate unique email per test run
        testEmail = "jane" + System.currentTimeMillis() + "@example.com";
        
        // Register user
        RegisterRequest registerRequest = new RegisterRequest("Jane", "Smith", testEmail, "Password123!");
        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        // Login and extract token from cookie
        LoginRequest loginRequest = new LoginRequest(testEmail, "Password123!");
        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        // Extract accessToken from cookies
        this.accessToken = loginResult.getResponse().getCookie("accessToken").getValue();
    }

    @Test
    void testCreateCategory_Success() throws Exception {
        CategoryRequest request = new CategoryRequest("Work");

        MvcResult result = mockMvc.perform(post("/categories")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.categories[0].categoryName").value("Work"))
                .andReturn();

        String categoryId = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("categories").get(0).get("categoryId").asText();
    }

    @Test
    void testGetAllCategories() throws Exception {
        // Create a category first
        CategoryRequest request = new CategoryRequest("Personal");
        mockMvc.perform(post("/categories")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Retrieve all categories
        mockMvc.perform(get("/categories")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categories[0].categoryName").value("Personal"));
    }

    @Test
    void testGetCategoryById() throws Exception {
        // Create category
        CategoryRequest request = new CategoryRequest("Health");
        MvcResult createResult = mockMvc.perform(post("/categories")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String categoryId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("categories").get(0).get("categoryId").asText();

        // Retrieve all and assert the created category exists in the list
        mockMvc.perform(get("/categories")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categories[0].categoryId").value(Long.parseLong(categoryId)))
                .andExpect(jsonPath("$.categories[0].categoryName").value("Health"));
    }

    @Test
    void testUpdateCategory() throws Exception {
        // Create category
        CategoryRequest request = new CategoryRequest("Exercise");
        MvcResult createResult = mockMvc.perform(post("/categories")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String categoryId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("categories").get(0).get("categoryId").asText();

        // Update category
        String updateRequest = """
                {
                    "newCategoryName": "Sports"
                }
                """;

        mockMvc.perform(put("/categories/" + categoryId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categories[0].categoryName").value("Sports"));
    }

    @Test
    void testDeleteCategory() throws Exception {
        // Create category
        CategoryRequest request = new CategoryRequest("Temporary");
        MvcResult createResult = mockMvc.perform(post("/categories")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String categoryId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("categories").get(0).get("categoryId").asText();

        // Delete category
        mockMvc.perform(delete("/categories/" + categoryId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Verify deleted by checking categories list is empty
        mockMvc.perform(get("/categories")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categories").isEmpty());
    }

    @Test
    void testCreateCategory_Unauthenticated() throws Exception {
                CategoryRequest request = new CategoryRequest("Work");

        mockMvc.perform(post("/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}
