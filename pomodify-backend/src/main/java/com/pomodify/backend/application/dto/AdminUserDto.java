package com.pomodify.backend.application.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class AdminUserDto {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private boolean isEmailVerified;
    private boolean isActive;
    private LocalDateTime createdAt;
}
