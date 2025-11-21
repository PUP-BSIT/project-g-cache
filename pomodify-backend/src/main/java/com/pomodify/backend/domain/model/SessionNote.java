package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "session_note")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder(access = AccessLevel.PRIVATE)
public class SessionNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ──────────────── Relationships ────────────────
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pomodoro_session_id", nullable = false)
    private PomodoroSession pomodoroSession;

    // ──────────────── Content ────────────────
    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    // ──────────────── State ────────────────
    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    // ──────────────── Timestamps ────────────────
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ──────────────── Factory ────────────────
    public static SessionNote create(PomodoroSession session, String content) {
        if (session == null)
            throw new IllegalArgumentException("Pomodoro session cannot be null");
        if (content == null || content.trim().isEmpty())
            throw new IllegalArgumentException("Note content cannot be null or empty");

        return SessionNote.builder()
                .pomodoroSession(session)
                .content(content.trim())
                .isActive(true)
                .build();
    }

    // ──────────────── Domain Behavior ────────────────
    public void updateContent(String newContent) {
        ensureNotDeleted();
        if (newContent == null || newContent.trim().isEmpty()) {
            throw new IllegalArgumentException("Note content cannot be empty");
        }
        this.content = newContent.trim();
    }

    public void markAsDeleted() {
        this.isActive = false;
    }

    // ──────────────── Domain Helpers ────────────────
    public Long getUserId() {
        return pomodoroSession != null ? pomodoroSession.getUserId() : null;
    }

    // ──────────────── Guards ────────────────
    private void ensureNotDeleted() {
        if (!isActive)
            throw new IllegalStateException("Cannot modify a deleted note");
    }
}
