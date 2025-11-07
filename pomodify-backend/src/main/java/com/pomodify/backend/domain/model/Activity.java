package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "activity")
@Data
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder(access = AccessLevel.PRIVATE)
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ──────────────── Core ────────────────
    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // ──────────────── Relationships ────────────────
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @OneToMany(mappedBy = "activity", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PomodoroSession> sessions = new ArrayList<>();

    // ──────────────── State ────────────────
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    // ──────────────── Timestamps ────────────────
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ──────────────── Factory ────────────────
    public static Activity create(String title, String description, User user, Category category) {
        if (title == null || title.trim().isEmpty())
            throw new IllegalArgumentException("Activity title cannot be null or empty");
        if (user == null)
            throw new IllegalArgumentException("User cannot be null");

        return Activity.builder()
                .title(title.trim())
                .description(description != null ? description.trim() : null)
                .user(user)
                .category(category)
                .isActive(true)
                .build();
    }

    // ──────────────── Domain Behavior ────────────────
    public void updateTitle(String newTitle) {
        ensureActive();
        if (newTitle == null || newTitle.trim().isEmpty())
            throw new IllegalArgumentException("Title cannot be empty");
        this.title = newTitle.trim();
    }

    public void updateDescription(String newDescription) {
        ensureActive();
        this.description = (newDescription != null) ? newDescription.trim() : null;
    }

    public void addPomodoroSession(PomodoroSession session) {
        ensureActive();
        if (session == null)
            throw new IllegalArgumentException("Pomodoro session cannot be null");
        sessions.add(session);
        session.setActivity(this);
    }

    public void removePomodoroSession(PomodoroSession session) {
        ensureActive();
        if (session == null)
            throw new IllegalArgumentException("Pomodoro session cannot be null");
        sessions.remove(session);
        session.setActivity(null);
    }

    public void deactivate() {
        this.isActive = false;
    }

    public List<PomodoroSession> getActiveSessions() {
        return sessions.stream()
                .filter(PomodoroSession::isActive)
                .toList();
    }

    // ──────────────── Guards ────────────────
    private void ensureActive() {
        if (!isActive)
            throw new IllegalStateException("Activity is inactive and cannot be modified");
    }
}
