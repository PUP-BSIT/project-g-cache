package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "user_badge", uniqueConstraints = {@UniqueConstraint(name = "unique_user_milestone", columnNames = {"user_id", "milestone_days"})})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBadge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "milestone_days", nullable = false)
    private Integer milestoneDays;

    @Column(name = "date_awarded", nullable = false)
    private LocalDate dateAwarded;
}
