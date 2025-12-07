package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.command.activity.*;
import com.pomodify.backend.application.result.ActivityResult;
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

@RestController
@RequestMapping("/activities")
@Slf4j
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    /* -------------------- CREATE -------------------- */
    @PostMapping
    public ResponseEntity<ActivityResponse> createActivity(
            @RequestBody @Valid CreateActivityRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long userId = jwt.getClaim("user");
        log.info("Create activity request received: {} from user: {}", request.title(), userId);

        CreateActivityCommand command = CreateActivityCommand.builder()
                .user(userId)
                .categoryId(request.categoryId())
                .createActivityTitle(request.title())
                .createDescription(request.description())
                .build();

        ActivityItem item = ActivityMapper.toActivityItem(activityService.createActivity(command));
        return buildResponse(item, "Activity created successfully", HttpStatus.CREATED);
    }

    /* -------------------- GET -------------------- */
    @GetMapping
    public ResponseEntity<ActivityResponse> getActiveActivities(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "desc") String sortOrder,
            @RequestParam(defaultValue = "title") String sortBy,
            @RequestParam(required = false) Long categoryId
    ) {
        return fetchActivities(jwt, false, categoryId, page, size, sortOrder, sortBy);
    }

    @GetMapping("/deleted")
    public ResponseEntity<ActivityResponse> getDeletedActivities(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "desc") String sortOrder,
            @RequestParam(defaultValue = "title") String sortBy,
            @RequestParam(required = false) Long categoryId
    ) {
        return fetchActivities(jwt, true, categoryId, page, size, sortOrder, sortBy);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ActivityResponse> getActivity(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") Long activityId
    ) {
        Long userId = jwt.getClaim("user");

        GetActivityCommand command = GetActivityCommand.builder()
                .activityId(activityId)
                .user(userId)
                .build();

        ActivityItem item = ActivityMapper.toActivityItem(activityService.getActivity(command));

        return buildResponse(item, "Activity fetched successfully", HttpStatus.OK);
    }

    /* -------------------- UPDATE -------------------- */
    @PutMapping("/{id}")
    public ResponseEntity<ActivityResponse> updateActivity(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") Long activityId,
            @RequestBody @Valid UpdateActivityRequest request
    ) {
        Long userId = jwt.getClaim("user");
        log.info("Update request for activity {} by user {}", activityId, userId);

        UpdateActivityCommand command = UpdateActivityCommand.builder()
                .activityId(activityId)
                .user(userId)
                .changeCategoryIdTo(request.newCategoryId())
                .changeActivityTitleTo(request.newActivityTitle())
                .changeActivityDescriptionTo(request.newActivityDescription())
                .build();

        ActivityItem item = ActivityMapper.toActivityItem(activityService.updateActivity(command));
        return buildResponse(item, "Activity updated successfully", HttpStatus.OK);
    }

    /* -------------------- DELETE -------------------- */
    @DeleteMapping("/{id}")
    public ResponseEntity<ActivityResponse> deleteActivity(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") Long activityId
    ) {
        Long userId = jwt.getClaim("user");
        log.info("Delete request for activity {} by user {}", activityId, userId);

        DeleteActivityCommand command = DeleteActivityCommand.builder()
                .activityId(activityId)
                .user(userId)
                .build();

        ActivityItem item = ActivityMapper.toActivityItem(activityService.deleteActivity(command));
        return buildResponse(item, "Activity deleted successfully", HttpStatus.OK);
    }

    /* -------------------- HELPER -------------------- */
    private ResponseEntity<ActivityResponse> fetchActivities(
            Jwt jwt, Boolean deleted, Long categoryId,
            int page, int size, String sortOrder, String sortBy
    ) {
        Long userId = jwt.getClaim("user");
        Sort sort = sortOrder.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        PageRequest pageable = PageRequest.of(page, size, sort);

        Page<ActivityResult> resultsPage = activityService.getActivities(
                GetAllActivityCommand.builder()
                        .user(userId)
                        .deleted(deleted)
                        .categoryId(categoryId)
                        .pageable(pageable)
                        .sortBy(sortBy)
                        .sortOrder(sortOrder)
                        .build()
        );

        Page<ActivityItem> items = ActivityMapper.toActivityItemPage(resultsPage);

        String message = getMessage(deleted, page, items);
        log.info("User {} fetched {} activities (deleted: {})", userId, items.getTotalElements(), deleted);

        return buildResponse(items, message);
    }

    private static String getMessage(Boolean deleted, int page, Page<ActivityItem> items) {
        String message;
        if (items.getTotalElements() == 0) {
            message = deleted != null && deleted
                    ? "No deleted activities found. "
                    : "No active activities found. ";
        } else if (items.isEmpty()) {
            message = deleted != null && deleted
                    ? "No deleted activities found in page " + page + "."
                    : "No active activities found in page " + page + ".";
        } else {
            message = deleted != null && deleted
                    ? "Deleted activities fetched successfully."
                    : "Active activities fetched successfully.";
        }
        return message;
    }

    private ResponseEntity<ActivityResponse> buildResponse(ActivityItem item, String message, HttpStatus status) {
        return ResponseEntity.status(status).body(ActivityMapper.toActivityResponse(item, message));
    }

    private ResponseEntity<ActivityResponse> buildResponse(Page<ActivityItem> items, String message) {
        return ResponseEntity.status(HttpStatus.OK).body(ActivityMapper.toActivityResponse(items, message));
    }
}
