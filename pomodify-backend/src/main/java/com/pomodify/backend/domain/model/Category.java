package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "category")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder(access = AccessLevel.PRIVATE)
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @OneToMany(mappedBy = "category", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Activity> activities = new ArrayList<>();

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    // ──────────────────────────────
    // Factory Method
    // ──────────────────────────────

    protected static Category create(String name, User user) {
        if (name == null || name.trim().isEmpty())
            throw new IllegalArgumentException("Category name cannot be null or empty");
        if (user == null)
            throw new IllegalArgumentException("User cannot be null");

        return Category.builder()
                .name(name.trim())
                .user(user)
                .build();
    }

    // ──────────────────────────────
    // Domain Logic
    // ──────────────────────────────

    protected void updateName(String newName) {
        if (newName == null || newName.trim().isEmpty())
            throw new IllegalArgumentException("Category name cannot be null or empty");
        this.name = newName.trim();
    }

    protected Category delete() {
        this.setDeleted(true);
        activities.forEach(a -> a.setDeleted(true));
        return this;
    }
}
