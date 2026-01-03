package com.pomodify.backend.presentation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pomodify.backend.application.dto.AdminUserDto;
import com.pomodify.backend.application.service.AdminService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("Admin Controller Unit Tests")
class AdminControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AdminService adminService;

    private AdminUserDto createTestUserDto(Long id, String firstName, String lastName, String email) {
        return AdminUserDto.builder()
                .id(id)
                .firstName(firstName)
                .lastName(lastName)
                .email(email)
                .isEmailVerified(true)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("POST /api/v2/admin/login")
    class AdminLoginTests {

        @Test
        @DisplayName("Should return success for valid credentials")
        void shouldReturnSuccessForValidCredentials() throws Exception {
            when(adminService.validateAdminCredentials("admin", "password123")).thenReturn(true);

            Map<String, String> credentials = Map.of(
                    "username", "admin",
                    "password", "password123"
            );

            mockMvc.perform(post("/api/v2/admin/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(credentials)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Admin login successful"));

            verify(adminService).validateAdminCredentials("admin", "password123");
        }

        @Test
        @DisplayName("Should return 401 for invalid credentials")
        void shouldReturn401ForInvalidCredentials() throws Exception {
            when(adminService.validateAdminCredentials(anyString(), anyString())).thenReturn(false);

            Map<String, String> credentials = Map.of(
                    "username", "wronguser",
                    "password", "wrongpass"
            );

            mockMvc.perform(post("/api/v2/admin/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(credentials)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Invalid admin credentials"));
        }
    }

    @Nested
    @DisplayName("GET /api/v2/admin/users")
    class GetAllUsersTests {

        @Test
        @DisplayName("Should return all users")
        void shouldReturnAllUsers() throws Exception {
            List<AdminUserDto> users = Arrays.asList(
                    createTestUserDto(1L, "John", "Doe", "john@test.com"),
                    createTestUserDto(2L, "Jane", "Smith", "jane@test.com")
            );
            when(adminService.getAllUsers()).thenReturn(users);

            mockMvc.perform(get("/api/v2/admin/users"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].firstName").value("John"))
                    .andExpect(jsonPath("$[1].firstName").value("Jane"));

            verify(adminService).getAllUsers();
        }

        @Test
        @DisplayName("Should return empty list when no users")
        void shouldReturnEmptyListWhenNoUsers() throws Exception {
            when(adminService.getAllUsers()).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v2/admin/users"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    @Nested
    @DisplayName("GET /api/v2/admin/users/search")
    class SearchUsersTests {

        @Test
        @DisplayName("Should search users by query")
        void shouldSearchUsersByQuery() throws Exception {
            List<AdminUserDto> users = Arrays.asList(
                    createTestUserDto(1L, "John", "Doe", "john@test.com")
            );
            when(adminService.searchUsers("John")).thenReturn(users);

            mockMvc.perform(get("/api/v2/admin/users/search")
                            .param("query", "John"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].firstName").value("John"));

            verify(adminService).searchUsers("John");
        }

        @Test
        @DisplayName("Should return empty list for non-matching query")
        void shouldReturnEmptyListForNonMatchingQuery() throws Exception {
            when(adminService.searchUsers("nonexistent")).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v2/admin/users/search")
                            .param("query", "nonexistent"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }

        @Test
        @DisplayName("Should handle empty query parameter")
        void shouldHandleEmptyQueryParameter() throws Exception {
            List<AdminUserDto> allUsers = Arrays.asList(
                    createTestUserDto(1L, "John", "Doe", "john@test.com"),
                    createTestUserDto(2L, "Jane", "Smith", "jane@test.com")
            );
            when(adminService.searchUsers("")).thenReturn(allUsers);

            mockMvc.perform(get("/api/v2/admin/users/search")
                            .param("query", ""))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("DELETE /api/v2/admin/users/{userId}")
    class DeleteUserTests {

        @Test
        @DisplayName("Should delete user successfully")
        void shouldDeleteUserSuccessfully() throws Exception {
            doNothing().when(adminService).deleteUser(1L);

            mockMvc.perform(delete("/api/v2/admin/users/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("User deleted successfully"));

            verify(adminService).deleteUser(1L);
        }

        @Test
        @DisplayName("Should return 404 for non-existent user")
        void shouldReturn404ForNonExistentUser() throws Exception {
            doThrow(new IllegalArgumentException("User not found with id: 999"))
                    .when(adminService).deleteUser(999L);

            mockMvc.perform(delete("/api/v2/admin/users/999"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message", containsString("not found")));
        }
    }

    @Nested
    @DisplayName("User DTO Response Format")
    class UserDtoFormatTests {

        @Test
        @DisplayName("Should return correct DTO fields")
        void shouldReturnCorrectDtoFields() throws Exception {
            AdminUserDto user = createTestUserDto(1L, "Test", "User", "test@example.com");
            when(adminService.searchUsers("test@example.com")).thenReturn(List.of(user));

            mockMvc.perform(get("/api/v2/admin/users/search")
                            .param("query", "test@example.com"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].id").value(1))
                    .andExpect(jsonPath("$[0].firstName").value("Test"))
                    .andExpect(jsonPath("$[0].lastName").value("User"))
                    .andExpect(jsonPath("$[0].email").value("test@example.com"))
                    .andExpect(jsonPath("$[0].emailVerified").value(true))
                    .andExpect(jsonPath("$[0].active").value(true))
                    .andExpect(jsonPath("$[0].createdAt").exists());
        }
    }
}
