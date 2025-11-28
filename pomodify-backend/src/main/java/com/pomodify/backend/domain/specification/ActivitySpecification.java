package com.pomodify.backend.domain.specification;

import com.pomodify.backend.domain.model.Activity;
import org.springframework.data.jpa.domain.Specification;

public class ActivitySpecification {
    public static Specification<Activity> belongsToUser(Long userId) {
        return (root, query, cb) -> cb.equal(root.get("user").get("id"), userId);
    }

    public static Specification<Activity> isDeleted(Boolean deleted) {
        if (deleted == null) return null;
        return (root, query, cb) -> cb.equal(root.get("isDeleted"), deleted);
    }

    public static Specification<Activity> inCategory(Long categoryId) {
        if (categoryId == null) return null;
        return (root, query, cb) -> cb.equal(root.get("category").get("id"), categoryId);
    }
}
