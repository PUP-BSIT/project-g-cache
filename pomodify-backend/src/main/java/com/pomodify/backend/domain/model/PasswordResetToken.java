package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.time.ZonedDateTime;
import java.time.ZoneId;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@Slf4j
public class PasswordResetToken {
    
    private static final ZoneId MANILA_ZONE = ZoneId.of("Asia/Manila");
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String token;

    @Column(columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private ZonedDateTime expiryDate;

    @OneToOne(targetEntity = User.class, fetch = FetchType.EAGER)
    @JoinColumn(nullable = false, name = "user_id")
    private User user;

    public PasswordResetToken(User user) {
        this.user = user;
        this.expiryDate = ZonedDateTime.now(MANILA_ZONE).plusMinutes(15); // 15 minutes expiry
        this.token = UUID.randomUUID().toString();
        log.debug("Created password reset token for user {}, expires at: {} (Asia/Manila)", 
                user.getEmail().getValue(), this.expiryDate);
    }

    public boolean isExpired() {
        ZonedDateTime now = ZonedDateTime.now(MANILA_ZONE);
        boolean expired = now.isAfter(this.expiryDate);
        if (expired) {
            log.debug("Token expired. Current time: {}, Expiry time: {} (Asia/Manila)", now, this.expiryDate);
        }
        return expired;
    }
}
