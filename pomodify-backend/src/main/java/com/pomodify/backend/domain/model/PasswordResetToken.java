package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
public class PasswordResetToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String token;

    private Instant expiryDate;

    @OneToOne(targetEntity = User.class, fetch = FetchType.EAGER)
    @JoinColumn(nullable = false, name = "user_id")
    private User user;

    public PasswordResetToken(User user) {
        this.user = user;
        this.expiryDate = Instant.now().plusSeconds(15 * 60); // 15 minutes expiry
        this.token = UUID.randomUUID().toString();
    }

    public boolean isExpired() {
        return Instant.now().isAfter(this.expiryDate);
    }
}
