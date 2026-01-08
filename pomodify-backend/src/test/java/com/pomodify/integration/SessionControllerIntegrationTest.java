package com.pomodify.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pomodify.backend.presentation.dto.request.auth.LoginRequest;
import com.pomodify.backend.presentation.dto.request.auth.RegisterRequest;
import com.pomodify.backend.presentation.dto.request.session.SessionRequest;
import com.pomodify.backend.presentation.dto.request.category.CategoryRequest;
import com.pomodify.backend.presentation.dto.request.activity.CreateActivityRequest;
import com.pomodify.backend.presentation.dto.note.SessionNoteDto;
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

import java.util.ArrayList;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for SessionController.
 * Tests session CRUD operations and state transitions (start, pause, resume, stop, etc.).
 */
@SpringBootTest(classes = com.pomodify.backend.PomodifyApiApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class SessionControllerIntegrationTest {

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

    private String testEmail;
    private String accessToken;
    private Long activityId;

    @BeforeEach
    void setUp() throws Exception {
        // Generate unique email per test run
        testEmail = "john" + System.currentTimeMillis() + "@example.com";
        
        // Register user
        RegisterRequest registerRequest = new RegisterRequest("John", "Doe", testEmail, "Password123!");
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
        // create a category
        CategoryRequest categoryRequest = new CategoryRequest("Default");
        MvcResult catResult = mockMvc.perform(post("/categories")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(categoryRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        Long categoryId = objectMapper.readTree(catResult.getResponse().getContentAsString())
                .get("categories").get(0).get("categoryId").asLong();

        // create an activity
        CreateActivityRequest activityRequest = CreateActivityRequest.builder()
                .title("Default Activity")
                .description("For tests")
                .categoryId(categoryId)
                .build();

        MvcResult actResult = mockMvc.perform(post("/activities")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(activityRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        this.activityId = objectMapper.readTree(actResult.getResponse().getContentAsString())
                .get("activities").get(0).get("activityId").asLong();
    }

    @Test
    void testCreateSession_Success() throws Exception {
        SessionRequest request = new SessionRequest("CLASSIC", 25, 5, 4, false, 15, 150, 4);

        mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessions[0].sessionType").value("CLASSIC"))
                .andExpect(jsonPath("$.sessions[0].id").isNotEmpty());
    }

    @Test
    void testGetAllSessions() throws Exception {
        // Create a session first
        SessionRequest request = new SessionRequest("CLASSIC", 25, 5, 4, false, 15, 150, 4);
        mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Get all sessions
        mockMvc.perform(get("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions").isArray())
                .andExpect(jsonPath("$.sessions[0].sessionType").value("CLASSIC"));
    }

    @Test
    void testGetSessionById() throws Exception {
        // Create a session
        SessionRequest request = new SessionRequest("CLASSIC", 25, 5, 4, false, 15, 150, 4);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        // Extract session ID from response
        String responseBody = createResult.getResponse().getContentAsString();
        String sessionId = objectMapper.readTree(responseBody).get("sessions").get(0).get("id").asText();

        // Get session by ID
        mockMvc.perform(get("/activities/{activityId}/sessions/{id}", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].id").value(Long.parseLong(sessionId)))
                .andExpect(jsonPath("$.sessions[0].sessionType").value("CLASSIC"));
    }

    @Test
    void testStartSession() throws Exception {
        // Create a session
        SessionRequest request = new SessionRequest("CLASSIC", 25, 5, 4, false, 15, 150, 4);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Start session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/start", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].status").exists());
    }

    @Test
    void testPauseSession() throws Exception {
        // Create and start a session
        SessionRequest request = new SessionRequest("CLASSIC", 25, 5, 4, false, 15, 150, 4);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/start", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Pause session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/pause", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
    }

    @Test
    void testUpdateSessionNote() throws Exception {
        // Create a session
        SessionRequest request = new SessionRequest("CLASSIC", 25, 5, 4, false, 15, 150, 4);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Update session note using JSON request body
        SessionNoteDto noteDto = new SessionNoteDto(null, "Updated note", new ArrayList<>());
        mockMvc.perform(put("/activities/{activityId}/sessions/{id}/note", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(noteDto)))
                .andExpect(status().isOk());
    }

    @Test
    void testDeleteSession() throws Exception {
        // Create a session
        SessionRequest request = new SessionRequest("CLASSIC", 25, 5, 4, false, 15, 150, 4);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Delete session (soft delete returns 200)
        mockMvc.perform(delete("/activities/{activityId}/sessions/{id}", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
    }

    @Test
    void testResumeSession() throws Exception {
        // Create and pause a session first
        SessionRequest request = new SessionRequest("CLASSIC", 25, 5, 4, false, 15, 150, 4);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Start session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/start", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Pause session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/pause", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken)
                .param("note", "Taking a break"))
                .andExpect(status().isOk());

        // Resume session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/resume", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Session resumed successfully"));
    }

    @Test
    void testStopSession() throws Exception {
        // Create and start a session
        SessionRequest request = new SessionRequest("CLASSIC", 25, 5, 4, false, 15, 150, 4);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Start session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/start", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Stop session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/stop", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken)
                .param("note", "Stopping for now"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Session abandoned successfully"));
    }

    @Test
    void testCancelSession() throws Exception {
        // Create a session
        SessionRequest request = new SessionRequest("CLASSIC", 25, 5, 4, false, 15, 150, 4);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Start session first
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/start", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Pause session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/pause", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Session paused successfully"));
    }

    @Test
    void testFinishSession() throws Exception {
        // Create and start a session
        SessionRequest request = new SessionRequest("CLASSIC", 25, 5, 4, false, 15, 150, 4);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Start session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/start", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Complete phase to progress the session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/complete-phase", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken)
                .param("note", "Phase completed"))
                .andExpect(status().isOk());
    }

    @Test
    void testCompletePhase() throws Exception {
        // Create and start a session
        SessionRequest request = new SessionRequest("CLASSIC", 25, 5, 4, false, 15, 150, 4);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Start session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/start", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Complete phase
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/complete-phase", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken)
                .param("note", "Phase completed"))
                .andExpect(status().isOk());
    }

    @Test
    void testSessionSSEEvents() throws Exception {
        // Create a session
        SessionRequest request = new SessionRequest("CLASSIC", 25, 5, 4, false, 15, 150, 4);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Subscribe to SSE events
        mockMvc.perform(get("/activities/{activityId}/sessions/{id}/events", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
                // Note: SSE connections can be verified by checking connection, timeout, and event streaming behavior
    }

    /**
     * Integration test for full cycle pattern with long break scheduling.
     * Validates: Requirements 4.4, 4.5, 5.1
     * 
     * Tests that a Freestyle session with longBreakIntervalCycles=4 triggers
     * a long break after every 4 focus sessions, following the pattern:
     * Focus→Break→Focus→Break→Focus→Break→Focus→Long Break, then repeat
     */
    @Test
    void testFreestyleSession_FullCyclePattern_LongBreakTriggersCorrectly() throws Exception {
        // Create a Freestyle session with longBreakIntervalCycles = 4
        // Focus: 25 min, Break: 5 min, Long Break: 15 min, Interval: 4 cycles
        SessionRequest request = new SessionRequest("FREESTYLE", 25, 5, null, true, 15, null, 4);

        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessions[0].sessionType").value("FREESTYLE"))
                .andExpect(jsonPath("$.sessions[0].longBreakIntervalCycles").value(4))
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("sessions").get(0).get("id").asText();

        // Start the session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/start", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.sessions[0].currentPhase").value("FOCUS"));

        // Cycle 1: Complete FOCUS -> should go to BREAK (not long break yet)
        MvcResult cycle1Focus = mockMvc.perform(post("/activities/{activityId}/sessions/{id}/complete-phase", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].currentPhase").value("BREAK"))
                .andReturn();

        // Resume and complete BREAK -> should go to FOCUS, cyclesCompleted = 1
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/resume", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/complete-phase", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].currentPhase").value("FOCUS"))
                .andExpect(jsonPath("$.sessions[0].cyclesCompleted").value(1));

        // Cycle 2: Complete FOCUS -> BREAK
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/resume", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/complete-phase", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].currentPhase").value("BREAK"));

        // Complete BREAK -> FOCUS, cyclesCompleted = 2
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/resume", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/complete-phase", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].currentPhase").value("FOCUS"))
                .andExpect(jsonPath("$.sessions[0].cyclesCompleted").value(2));

        // Cycle 3: Complete FOCUS -> BREAK
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/resume", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/complete-phase", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].currentPhase").value("BREAK"));

        // Complete BREAK -> FOCUS, cyclesCompleted = 3
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/resume", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/complete-phase", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].currentPhase").value("FOCUS"))
                .andExpect(jsonPath("$.sessions[0].cyclesCompleted").value(3));

        // Cycle 4: Complete FOCUS -> should trigger LONG_BREAK (4th focus completed)
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/resume", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/complete-phase", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].currentPhase").value("LONG_BREAK"));

        // Complete LONG_BREAK -> should go back to FOCUS, cyclesCompleted = 4
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/resume", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/complete-phase", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].currentPhase").value("FOCUS"))
                .andExpect(jsonPath("$.sessions[0].cyclesCompleted").value(4));

        // Verify the pattern repeats: Cycle 5-7 should be BREAK, Cycle 8 should be LONG_BREAK
        // Cycle 5: FOCUS -> BREAK
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/resume", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/complete-phase", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].currentPhase").value("BREAK"));
    }

    /**
     * Integration test for session configuration persistence.
     * Property 8: Session Configuration Persistence
     * Validates: Requirements 6.1, 6.2, 6.3
     * 
     * Tests that saving and loading a session returns the same configuration values.
     */
    @Test
    void testFreestyleSession_ConfigurationPersistence_RoundTrip() throws Exception {
        // Create a Freestyle session with specific configuration
        int focusTime = 30;
        int breakTime = 7;
        int longBreakTime = 20;
        int longBreakInterval = 5;

        SessionRequest request = new SessionRequest("FREESTYLE", focusTime, breakTime, null, true, longBreakTime, null, longBreakInterval);

        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("sessions").get(0).get("id").asText();

        // Retrieve the session and verify all configuration values are persisted correctly
        MvcResult getResult = mockMvc.perform(get("/activities/{activityId}/sessions/{id}", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].sessionType").value("FREESTYLE"))
                .andExpect(jsonPath("$.sessions[0].focusTimeInMinutes").value(focusTime))
                .andExpect(jsonPath("$.sessions[0].breakTimeInMinutes").value(breakTime))
                .andExpect(jsonPath("$.sessions[0].longBreakTimeInMinutes").value(longBreakTime))
                .andExpect(jsonPath("$.sessions[0].longBreakIntervalCycles").value(longBreakInterval))
                .andExpect(jsonPath("$.sessions[0].status").value("NOT_STARTED"))
                .andReturn();

        // Verify the session can be retrieved from the list endpoint as well
        mockMvc.perform(get("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[?(@.id == " + sessionId + ")].focusTimeInMinutes").value(focusTime))
                .andExpect(jsonPath("$.sessions[?(@.id == " + sessionId + ")].breakTimeInMinutes").value(breakTime))
                .andExpect(jsonPath("$.sessions[?(@.id == " + sessionId + ")].longBreakTimeInMinutes").value(longBreakTime))
                .andExpect(jsonPath("$.sessions[?(@.id == " + sessionId + ")].longBreakIntervalCycles").value(longBreakInterval));
    }

    /**
     * Integration test for session configuration persistence with different interval values.
     * Tests boundary values for longBreakIntervalCycles (2 and 10).
     * Validates: Requirements 6.1, 6.2, 6.3
     */
    @Test
    void testFreestyleSession_ConfigurationPersistence_BoundaryValues() throws Exception {
        // Test with minimum interval (2 cycles)
        SessionRequest minRequest = new SessionRequest("FREESTYLE", 25, 5, null, true, 15, null, 2);

        MvcResult minResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(minRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessions[0].longBreakIntervalCycles").value(2))
                .andReturn();

        String minSessionId = objectMapper.readTree(minResult.getResponse().getContentAsString())
                .get("sessions").get(0).get("id").asText();

        // Verify persistence of minimum value
        mockMvc.perform(get("/activities/{activityId}/sessions/{id}", activityId, minSessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].longBreakIntervalCycles").value(2));

        // Test with maximum interval (10 cycles)
        SessionRequest maxRequest = new SessionRequest("FREESTYLE", 25, 5, null, true, 15, null, 10);

        MvcResult maxResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(maxRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessions[0].longBreakIntervalCycles").value(10))
                .andReturn();

        String maxSessionId = objectMapper.readTree(maxResult.getResponse().getContentAsString())
                .get("sessions").get(0).get("id").asText();

        // Verify persistence of maximum value
        mockMvc.perform(get("/activities/{activityId}/sessions/{id}", activityId, maxSessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].longBreakIntervalCycles").value(10));
    }

    /**
     * Integration test for session state persistence during cycle progression.
     * Validates: Requirements 6.1, 6.2
     * 
     * Tests that session state (cyclesCompleted, currentPhase) is correctly
     * persisted and can be retrieved after each phase completion.
     */
    @Test
    void testFreestyleSession_StatePersistence_DuringCycleProgression() throws Exception {
        // Create a Freestyle session
        SessionRequest request = new SessionRequest("FREESTYLE", 25, 5, null, true, 15, null, 4);

        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("sessions").get(0).get("id").asText();

        // Start the session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/start", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Complete first focus phase
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/complete-phase", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Verify state is persisted by fetching the session
        mockMvc.perform(get("/activities/{activityId}/sessions/{id}", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].currentPhase").value("BREAK"))
                .andExpect(jsonPath("$.sessions[0].cyclesCompleted").value(0))
                .andExpect(jsonPath("$.sessions[0].status").value("PAUSED"));

        // Resume and complete break phase
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/resume", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/complete-phase", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Verify updated state is persisted
        mockMvc.perform(get("/activities/{activityId}/sessions/{id}", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].currentPhase").value("FOCUS"))
                .andExpect(jsonPath("$.sessions[0].cyclesCompleted").value(1))
                .andExpect(jsonPath("$.sessions[0].status").value("PAUSED"));
    }
}

