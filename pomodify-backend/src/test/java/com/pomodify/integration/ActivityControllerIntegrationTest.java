package com.pomodify.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pomodify.backend.presentation.dto.request.auth.LoginRequest;
import com.pomodify.backend.presentation.dto.request.auth.RegisterRequest;
import com.pomodify.backend.presentation.dto.request.activity.CreateActivityRequest;
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

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for ActivityController.
 * Tests activity CRUD operations and retrieval.
 * DISABLED: Requires Docker Desktop to be running. Tests can be enabled once Docker is available.
 */
@SpringBootTest(classes = com.pomodify.backend.PomodifyApiApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class ActivityControllerIntegrationTest {

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

        private String accessToken;
        private Long categoryId;
        private String testEmail;

    @BeforeEach
    void setUp() throws Exception {
        // Use unique email for each test run to avoid "email already exists" errors
        testEmail = "mike" + System.currentTimeMillis() + "@example.com";
        
        // Register user
        RegisterRequest registerRequest = new RegisterRequest("Mike", "Johnson", testEmail, "Password123!");
        MvcResult registerResult = mockMvc.perform(post("/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        // Login and extract token from cookie
        LoginRequest loginRequest = new LoginRequest(testEmail, "Password123!");
        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        // Extract accessToken from Set-Cookie header
        String cookies = loginResult.getResponse().getHeader("Set-Cookie");
        if (cookies != null) {
            // Parse the accessToken from the cookie header
            for (String cookie : cookies.split(";")) {
                if (cookie.trim().startsWith("accessToken=")) {
                    this.accessToken = cookie.trim().substring("accessToken=".length()).split(";")[0];
                    break;
                }
            }
        }

        // Create a category for activities
        String categoryRequest = """
                {
                    "categoryName": "Work"
                }
                """;

        MvcResult categoryResult = mockMvc.perform(post("/categories")
                .with(csrf())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(categoryRequest))
                .andExpect(status().isCreated())
                .andReturn();

        this.categoryId = objectMapper.readTree(categoryResult.getResponse().getContentAsString())
                .get("categories").get(0).get("categoryId").asLong();
    }

    @Test
    void testCreateActivity_Success() throws Exception {
        CreateActivityRequest request = new CreateActivityRequest("Code review", "Review pull requests", categoryId);

        MvcResult result = mockMvc.perform(post("/activities")
                .with(csrf())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.activities[0].activityTitle").value("Code review"))
                .andExpect(jsonPath("$.activities[0].activityDescription").value("Review pull requests"))
                .andReturn();

        String activityId = objectMapper.readTree(result.getResponse().getContentAsString()).get("activities").get(0).get("activityId").asText();
    }

    @Test
    void testGetAllActivities() throws Exception {
        // Create an activity first
        CreateActivityRequest request = new CreateActivityRequest("Unit testing", "Write unit tests", categoryId);
        mockMvc.perform(post("/activities")
                .with(csrf())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Retrieve all activities
        mockMvc.perform(get("/activities")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activities[0].activityTitle").value("Unit testing"));
    }

    @Test
    void testGetActivityById() throws Exception {
        // Create activity
        CreateActivityRequest request = new CreateActivityRequest("Documentation", "Write API docs", categoryId);
        MvcResult createResult = mockMvc.perform(post("/activities")
                .with(csrf())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();
        String activityId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("activities").get(0).get("activityId").asText();

        // Retrieve by ID
        mockMvc.perform(get("/activities/" + activityId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activities[0].activityId").value(Long.parseLong(activityId)))
                .andExpect(jsonPath("$.activities[0].activityTitle").value("Documentation"));
    }

    @Test
    void testUpdateActivity() throws Exception {
        // Create activity
        CreateActivityRequest request = new CreateActivityRequest("Design", "UI design mockups", categoryId);
        MvcResult createResult = mockMvc.perform(post("/activities")
                .with(csrf())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String activityId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("activities").get(0).get("activityId").asText();

        // Update activity
        String updateRequest = """
                {
                    "newCategoryId": %d,
                    "newActivityTitle": "UI Design",
                    "newActivityDescription": "Create new UI mockups"
                }
                """.formatted(categoryId);

        mockMvc.perform(put("/activities/" + activityId)
                .with(csrf())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activities[0].activityTitle").value("UI Design"));
    }

    @Test
    void testDeleteActivity() throws Exception {
        // Create activity
        CreateActivityRequest request = new CreateActivityRequest("Temporary Task", "To be deleted", categoryId);
        MvcResult createResult = mockMvc.perform(post("/activities")
                .with(csrf())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();
        String activityId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("activities").get(0).get("activityId").asText();

        // Delete activity
        mockMvc.perform(delete("/activities/" + activityId)
                .with(csrf())
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Verify deleted (should still be accessible but marked as deleted)
        mockMvc.perform(get("/activities/" + activityId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
    }

    @Test
    void testCreateActivity_Unauthenticated() throws Exception {
        CreateActivityRequest request = new CreateActivityRequest("Task", "Some task", categoryId);

        mockMvc.perform(post("/activities")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testGetDeletedActivities() throws Exception {
        // Create an activity
        CreateActivityRequest request = new CreateActivityRequest("To Delete Activity", "This will be deleted", categoryId);
        MvcResult createResult = mockMvc.perform(post("/activities")
                .with(csrf())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String activityId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("activities").get(0).get("activityId").asText();

        // Delete the activity
        mockMvc.perform(delete("/activities/" + activityId)
                .with(csrf())
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Get deleted activities - should include our deleted activity
        mockMvc.perform(get("/activities/deleted")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activities").isArray());
    }
}
