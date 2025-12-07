package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "session_note")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "session_id", nullable = false)
    private PomodoroSession session;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @OneToMany(mappedBy = "note", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SessionTodoItem> items = new ArrayList<>();
}
