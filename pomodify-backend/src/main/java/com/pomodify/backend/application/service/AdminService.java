package com.pomodify.backend.application.service;

import com.pomodify.backend.application.dto.AdminUserDto;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;

    @Value("${ADMIN_USERNAME:admin}")
    private String adminUsername;

    @Value("${ADMIN_PASSWORD:admin123}")
    private String adminPassword;

    public boolean validateAdminCredentials(String username, String password) {
        return adminUsername.equals(username) && adminPassword.equals(password);
    }

    @Transactional(readOnly = true)
    public List<AdminUserDto> searchUsers(String query) {
        List<User> allUsers = userRepository.findAllActive();
        
        if (query == null || query.trim().isEmpty()) {
            return allUsers.stream()
                    .map(this::toDto)
                    .collect(Collectors.toList());
        }

        String lowerQuery = query.toLowerCase().trim();
        return allUsers.stream()
                .filter(user -> 
                    user.getFirstName().toLowerCase().contains(lowerQuery) ||
                    user.getLastName().toLowerCase().contains(lowerQuery) ||
                    user.getEmail().getValue().toLowerCase().contains(lowerQuery) ||
                    (user.getFirstName() + " " + user.getLastName()).toLowerCase().contains(lowerQuery)
                )
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AdminUserDto> getAllUsers() {
        return userRepository.findAllActive().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findUser(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
        
        log.info("Admin deleting user: {} ({})", user.getEmail().getValue(), userId);
        userRepository.delete(user);
    }

    private AdminUserDto toDto(User user) {
        return AdminUserDto.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail().getValue())
                .isEmailVerified(user.isEmailVerified())
                .isActive(user.isActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
