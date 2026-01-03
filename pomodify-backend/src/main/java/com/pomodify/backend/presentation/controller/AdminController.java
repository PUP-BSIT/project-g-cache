package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.dto.AdminUserDto;
import com.pomodify.backend.application.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final AdminService adminService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        if (adminService.validateAdminCredentials(username, password)) {
            log.info("Admin login successful for user: {}", username);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Admin login successful"
            ));
        }

        log.warn("Failed admin login attempt for user: {}", username);
        return ResponseEntity.status(401).body(Map.of(
            "success", false,
            "message", "Invalid admin credentials"
        ));
    }

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserDto>> getAllUsers() {
        List<AdminUserDto> users = adminService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/users/search")
    public ResponseEntity<List<AdminUserDto>> searchUsers(@RequestParam(required = false) String query) {
        List<AdminUserDto> users = adminService.searchUsers(query);
        return ResponseEntity.ok(users);
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable Long userId) {
        try {
            adminService.deleteUser(userId);
            log.info("User {} deleted successfully by admin", userId);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User deleted successfully"
            ));
        } catch (IllegalArgumentException e) {
            log.error("Failed to delete user {}: {}", userId, e.getMessage());
            return ResponseEntity.status(404).body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }
}
