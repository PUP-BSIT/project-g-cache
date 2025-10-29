package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "session")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Session {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activity_id", nullable = false)
    private Activity activity;

    @Column(name = "duration_minutes", nullable = false)
    private Integer duration;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "is_completed")
    private boolean completed;

    // Domain methods
    public void complete() {
        this.completed = true;
        this.endTime = LocalDateTime.now();
    }

    public void addNotes(String notes) {
        this.notes = notes;
    }

    public boolean isInProgress() {
        return !completed && endTime == null;
    }

    public Long getActivityId() {
        return activity != null ? activity.getId() : null;
    }
}