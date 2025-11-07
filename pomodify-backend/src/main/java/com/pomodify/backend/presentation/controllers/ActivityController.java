package com.pomodify.backend.presentation.controllers;

import com.pomodify.backend.application.commands.CreateActivityCommand;
import com.pomodify.backend.application.commands.UpdateActivityCommand;
import com.pomodify.backend.application.commands.handlers.CreateActivityHandler;
import com.pomodify.backend.application.commands.handlers.UpdateActivityHandler;
import com.pomodify.backend.presentation.dto.response.ActivityDetailsDTO;
import com.pomodify.backend.presentation.dto.request.CreateActivityRequest;
import com.pomodify.backend.presentation.dto.request.UpdateActivityRequest;
import com.pomodify.backend.application.services.ActivityQueryService;
import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.infrastructure.repository.spring.SpringActivityJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/activities")
@RequiredArgsConstructor
public class ActivityController {
    private final CreateActivityHandler createActivityHandler;
    private final UpdateActivityHandler updateActivityHandler;
    private final ActivityQueryService activityQueryService;
    private final SpringActivityJpaRepository activityRepository;

    @PostMapping
    public ResponseEntity<ActivityDetailsDTO> createActivity(@RequestBody CreateActivityRequest request) {
        Long activityId = createActivityHandler.handle(CreateActivityCommand.builder()
                .userId(request.getUserId())
                .categoryId(request.getCategoryId())
                .name(request.getName())
                .description(request.getDescription())
                .build());

        return ResponseEntity.ok(activityQueryService.getActivityDetails(activityId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ActivitySummaryDTO>> getUserActivities(@PathVariable Long userId) {
        return ResponseEntity.ok(activityQueryService.getUserActivities(userId));
    }

    @GetMapping("/user/{userId}/category/{categoryId}")
    public ResponseEntity<List<ActivitySummaryDTO>> getCategoryActivities(
            @PathVariable Long userId,
            @PathVariable Long categoryId) {
        return ResponseEntity.ok(activityQueryService.getCategoryActivities(userId, categoryId));
    }

    @GetMapping("/{activityId}")
    public ResponseEntity<ActivityDetailsDTO> getActivityDetails(@PathVariable Long activityId) {
        return ResponseEntity.ok(activityQueryService.getActivityDetails(activityId));
    }

    @GetMapping("/user/{userId}/scheduled")
    public ResponseEntity<List<ActivitySummaryDTO>> getScheduledActivities(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(activityQueryService.getScheduledActivities(userId, date));
    }

    @GetMapping("/user/{userId}/in-progress")
    public ResponseEntity<List<ActivitySummaryDTO>> getInProgressActivities(@PathVariable Long userId) {
        return ResponseEntity.ok(activityQueryService.getInProgressActivities(userId));
    }

    @PutMapping("/{activityId}")
    public ResponseEntity<ActivityDetailsDTO> updateActivity(
            @PathVariable Long activityId,
            @RequestBody UpdateActivityRequest request) {
        
        updateActivityHandler.handle(UpdateActivityCommand.builder()
                .activityId(activityId)
                .userId(request.getUserId())
                .name(request.getName())
                .description(request.getDescription())
                .categoryId(request.getCategoryId())
                .build());

        return ResponseEntity.ok(activityQueryService.getActivityDetails(activityId));
    }

    @DeleteMapping("/{activityId}")
    public ResponseEntity<Void> deleteActivity(
            @PathVariable Long activityId,
            @RequestParam Long userId) {
        
        if (activityId == null) {
            throw new IllegalArgumentException("Activity ID cannot be null");
        }
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found"));

        if (!activity.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Activity does not belong to user");
        }

        activity.setDeleted(true);
        activityRepository.save(activity);

        return ResponseEntity.ok().build();
    }
}