package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

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
    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

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
                .build();
    }

    // ──────────────── Domain Behavior ────────────────
    public void updateDetails(String newTitle, String newDescription, Category newCategoryId) {
        ensureActive();
        if (newTitle != null && !newTitle.isBlank())
            updateTitle(newTitle);

        if (newDescription != null)
            updateDescription(newDescription);

        if (newCategoryId != null)
            updateCategory(newCategoryId);
    }

    private void updateTitle(String newTitle) {
        this.title = newTitle.trim();
    }

    private void updateDescription(String newDescription) {
        this.description = newDescription.isBlank()? null : newDescription.trim();
    }

    private void updateCategory(Category newCategory) {
        this.category = newCategory;
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

    public Activity delete(Long id) {
        if (!this.id.equals(id))
            throw new IllegalArgumentException("Activity ID mismatch");

        ensureActive();
        this.setDeleted(true);
        return this;
    }

    public List<PomodoroSession> getActiveSessions() {
        return sessions.stream()
                .filter(PomodoroSession::isActive)
                .toList();
    }

    // ──────────────── Guards ────────────────
    private void ensureActive() {
        if (isDeleted)
            throw new IllegalStateException("Activity is deleted and cannot be modified");
    }
}
