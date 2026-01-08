package com.pomodify.backend.domain.model;

import com.pomodify.backend.domain.enums.CyclePhase;
import com.pomodify.backend.domain.enums.SessionStatus;
import com.pomodify.backend.domain.enums.SessionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "activity")
@Getter
@Setter
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

    @Column(name = "color", length = 7)
    @Builder.Default
    private String color = "#4da1a9";

    // ──────────────── Relationships ────────────────
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
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
    protected static Activity create(String title, String description, User user, Category category, String color) {
        if (title == null || title.trim().isEmpty())
            throw new IllegalArgumentException("Activity createActivityTitle cannot be null or empty");
        if (user == null)
            throw new IllegalArgumentException("User cannot be null");

        return Activity.builder()
                .title(title.trim())
                .description(description != null ? description.trim() : null)
                .user(user)
                .category(category)
                .color(color != null ? color : "#4da1a9")
                .build();
    }

    // ──────────────── Domain Behavior ────────────────
    protected void updateDetails(String newTitle, String newDescription, Category newCategoryId, String newColor) {
        ensureActive();
        if (newTitle != null && !newTitle.isBlank())
            updateTitle(newTitle);

        if (newDescription != null)
            updateDescription(newDescription);

        if (newCategoryId != null)
            updateCategory(newCategoryId);

        if (newColor != null)
            updateColor(newColor);
    }

    protected void updateTitle(String newTitle) {
        this.title = newTitle.trim();
    }

    private void updateDescription(String newDescription) {
        this.description = newDescription.isBlank() ? null : newDescription.trim();
    }

    private void updateCategory(Category newCategory) {
        this.category = newCategory;
    }

    private void updateColor(String newColor) {
        this.color = newColor;
    }

    // ──────────────── Pomodoro Session Operations ────────────────
    public PomodoroSession createSession(SessionType sessionType,
                                         Duration focusDuration,
                                         Duration breakDuration,
                                         Integer totalCycles,
                                         Duration longBreakDuration,
                                         Duration longBreakInterval,
                                         Integer longBreakIntervalCycles,
                                         String note) {
        ensureActive();
        ensureNoActiveSession();
        PomodoroSession session = PomodoroSession.create(this, sessionType, focusDuration, breakDuration, totalCycles, note);
        if (longBreakDuration != null || longBreakInterval != null || longBreakIntervalCycles != null) {
            session.validateBreaks(breakDuration, longBreakDuration, longBreakInterval, longBreakIntervalCycles);
            session.setLongBreakDuration(longBreakDuration);
            session.setLongBreakInterval(longBreakInterval);
            session.setLongBreakIntervalCycles(longBreakIntervalCycles);
        }
        this.sessions.add(session);
        return session;
    }
    
    /**
     * @deprecated Use {@link #createSession(SessionType, Duration, Duration, Integer, Duration, Duration, Integer, String)} instead
     */
    @Deprecated
    public PomodoroSession createSession(SessionType sessionType,
                                         Duration focusDuration,
                                         Duration breakDuration,
                                         Integer totalCycles,
                                         Duration longBreakDuration,
                                         Duration longBreakInterval,
                                         String note) {
        return createSession(sessionType, focusDuration, breakDuration, totalCycles, longBreakDuration, longBreakInterval, null, note);
    }

    public PomodoroSession startSession(Long sessionId) {
        ensureActive();
        PomodoroSession session = findSessionOrThrow(sessionId);
        session.startSession();
        return session;
    }

    public PomodoroSession pauseSession(Long sessionId, String note) {
        ensureActive();
        PomodoroSession session = findSessionOrThrow(sessionId);
        session.pauseSession();
        return session;
    }

    public PomodoroSession resumeSession(Long sessionId) {
        ensureActive();
        PomodoroSession session = findSessionOrThrow(sessionId);
        session.resumeSession();
        return session;
    }

    public PomodoroSession stopSession(Long sessionId, String note) {
        ensureActive();
        PomodoroSession session = findSessionOrThrow(sessionId);
        session.stopSession();
        return session;
    }

    public PomodoroSession completeEarly(Long sessionId) {
        ensureActive();
        PomodoroSession session = findSessionOrThrow(sessionId);
        session.completeEarly();
        return session;
    }

    public PomodoroSession completePhase(Long sessionId, String note) {
        ensureActive();
        PomodoroSession session = findSessionOrThrow(sessionId);
        session.completeCyclePhase();
        return session;
    }

    // finish and cancel session operations have been removed in the v2 model

    public PomodoroSession updateSessionNote(Long sessionId, String note) {
        ensureActive();
        PomodoroSession session = findSessionOrThrow(sessionId);
        // kept for backward compatibility; will be migrated to SessionNote handling if needed
        return session;
    }

    public void removeSession(Long sessionId) {
        ensureActive();
        PomodoroSession session = findSessionOrThrow(sessionId);
        this.sessions.remove(session);
        session.setActivity(null);
    }

    public Activity delete(Long id) {
        if (!this.id.equals(id))
            throw new IllegalArgumentException("Activity ID mismatch");

        ensureActive();
        this.setDeleted(true);
        return this;
    }

    public List<PomodoroSession> getSessions() {
        return this.sessions;
    }

    // ──────────────── Helpers ────────────────
    private PomodoroSession findSessionOrThrow(Long sessionId) {
        return this.sessions.stream()
                .filter(s -> s.getId() != null && s.getId().equals(sessionId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Session not found for this activity"));
    }

    // ──────────────── Guards ────────────────
    private void ensureNoActiveSession() {
        boolean hasActive = this.sessions.stream()
            .anyMatch(s -> !s.isDeleted() && (
                s.getStatus() == SessionStatus.NOT_STARTED ||
                s.getStatus() == SessionStatus.IN_PROGRESS ||
                s.getStatus() == SessionStatus.PAUSED
            ));
        if (hasActive) {
            throw new IllegalStateException("Cannot create a new session while another session is active.");
        }
    }

    private void ensureActive() {
        if (isDeleted)
            throw new IllegalStateException("Activity is deleted and cannot be modified");
    }
}
