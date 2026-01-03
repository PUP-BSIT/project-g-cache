package com.pomodify.backend.application.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    
    @JsonProperty("isEmailVerified")
    private boolean isEmailVerified;
    
    @JsonProperty("isActive")
    private boolean isActive;
    
    private LocalDateTime createdAt;
}
