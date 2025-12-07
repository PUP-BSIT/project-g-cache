package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "session_todo_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionTodoItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_id", nullable = false)
    private SessionNote note;

    @Column(name = "text", nullable = false)
    private String text;

    @Column(name = "done", nullable = false)
    @Builder.Default
    private boolean done = false;

    @Column(name = "order_index")
    private Integer orderIndex;
}
