package com.pomodify.backend.domain.model.settings;

import com.pomodify.backend.domain.enums.AppTheme;
import com.pomodify.backend.domain.enums.SoundType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.EntityListeners;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "user_settings")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSettings {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    private SoundType soundType;

    private boolean notificationSound;
    private int volume;


    private boolean autoStartBreaks;
    private boolean autoStartPomodoros;

    @Enumerated(EnumType.STRING)
    private AppTheme theme;

    private boolean notificationsEnabled;


    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    public static UserSettings defaultSettings(Long userId) {
        return UserSettings.builder()
                .userId(userId)
                .soundType(SoundType.BELL)
                .notificationSound(true)
                .volume(70)

                .autoStartBreaks(false)
                .autoStartPomodoros(false)
                .theme(AppTheme.SYSTEM)
                .notificationsEnabled(true)

                .build();
    }
}
