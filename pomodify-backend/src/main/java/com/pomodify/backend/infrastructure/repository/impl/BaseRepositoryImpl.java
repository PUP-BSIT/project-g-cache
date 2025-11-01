package com.pomodify.backend.infrastructure.repository.impl;

import org.springframework.lang.NonNull;

public class BaseRepositoryImpl {
    @NonNull
    protected Long checkNotNull(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("ID cannot be null");
        }
        return id;
    }

    @NonNull
    protected <T> T checkNotNull(T entity, String entityName) {
        if (entity == null) {
            throw new IllegalArgumentException(entityName + " cannot be null");
        }
        return entity;
    }
}