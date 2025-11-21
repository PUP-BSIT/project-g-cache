package com.pomodify.backend.infrastructure.repository.spring;

import com.pomodify.backend.domain.model.Activity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringActivityJpaRepository extends JpaRepository<Activity, Long> {

}