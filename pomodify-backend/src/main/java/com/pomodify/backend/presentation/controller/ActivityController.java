package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.command.activity.CreateActivityCommand;
import com.pomodify.backend.application.command.activity.GetAllActivityCommand;
import com.pomodify.backend.application.command.activity.UpdateActivityCommand;
import com.pomodify.backend.application.service.ActivityService;
import com.pomodify.backend.presentation.dto.item.ActivityItem;
import com.pomodify.backend.presentation.dto.request.activity.CreateActivityRequest;
import com.pomodify.backend.presentation.dto.request.activity.UpdateActivityRequest;
import com.pomodify.backend.presentation.dto.response.ActivityResponse;
import com.pomodify.backend.presentation.mapper.ActivityMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/v1/activity")
@Slf4j
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @PostMapping("/create-activity")
    public ResponseEntity<ActivityResponse> createActivity(
            @RequestBody @Valid CreateActivityRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long userId = jwt.getClaim("userId");

        log.info("Create activity request received: {} from userId: {}", request.title(), userId);

        CreateActivityCommand command =  CreateActivityCommand.builder()
                .userId(userId)
                .categoryId(request.categoryId())
                .title(request.title())
                .description(request.description())
                .build();

        ActivityItem item = ActivityMapper.toActivityItem(activityService.createActivity(command).orElse(null));

        String message = item.activityId() == null
                ? "Failed to create activity"
                : "Activity created successfully";

        ActivityResponse response = ActivityMapper.toActivityResponse(item, message);

        log.info("{}: {}", message, item.activityTitle());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/all")
    public ResponseEntity<ActivityResponse> getAllNotDeletedActivities(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0")int page,
            @RequestParam(defaultValue = "10")int size,
            @RequestParam(defaultValue = "desc")String sortOrder,
            @RequestParam(defaultValue = "title")String sortBy,
            @RequestParam(required = false) Boolean deleted,
            @RequestParam(required = false) Long categoryId){

        Long userId = jwt.getClaim("userId");

        Sort sort = sortOrder.equalsIgnoreCase("asc") ?
                Sort.by(sortBy).ascending() :
                Sort.by(sortBy).descending();

        PageRequest pageable = PageRequest.of(page, size, sort);
        log.info("Get activities request by userId: {}\t" +
                "Page: {}\t" +
                "Size: {}\t" +
                "Sort Order: {}\t" +
                "Sort By: {}",userId, page, size, sortOrder, sortBy);

        GetAllActivityCommand command = GetAllActivityCommand.builder()
                .userId(userId)
                .deleted(deleted)
                .categoryId(categoryId)
                .pageable(pageable)
                .build();

        Page<ActivityItem> items = activityService.getAllActivities(command)
                .map(ActivityMapper::toActivityItem);

        String message = items.isEmpty()
                ? "No activities found"
                : "Activities fetched successfully";

        ActivityResponse response = ActivityMapper.toActivityResponse(items, message);
        log.info("{}: {} activities found for userId: {}", message, items.getTotalElements(), userId);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @PutMapping("/update/{activityId}")
    public ResponseEntity<ActivityResponse> updateActivity(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long activityId,
            @RequestBody @Valid UpdateActivityRequest request
            ) {
        Long userId = jwt.getClaim("userId");
        log.info("Update activity request received for activityId: {} by userId: {}", activityId, userId);

        UpdateActivityCommand command = UpdateActivityCommand.builder()
                .activityId(activityId)
                .activityOwnerId(userId)
                .changeCategoryIdTo(request.newCategoryId())
                .changeActivityTitleTo(request.newActivityTitle())
                .changeActivityDescriptionTo(request.newActivityDescription())
                .build();

        log.info("after command build");

        ActivityItem item = ActivityMapper.toActivityItem(activityService.updateActivity(command));
        String message = item.activityId() == null
                ? "Failed to update activity"
                : "Activity updated successfully";

        ActivityResponse response = ActivityMapper.toActivityResponse(item, message);

        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
}
