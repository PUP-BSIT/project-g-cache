package com.pomodify.backend.presentation.mapper;

import com.pomodify.backend.application.result.BlueprintResult;
import com.pomodify.backend.application.result.ConfirmBlueprintResult;
import com.pomodify.backend.application.result.DualBlueprintResult;
import com.pomodify.backend.application.result.QuickFocusResult;
import com.pomodify.backend.presentation.dto.item.BlueprintItem;
import com.pomodify.backend.presentation.dto.item.ConfirmBlueprintItem;
import com.pomodify.backend.presentation.dto.item.QuickFocusItem;
import com.pomodify.backend.presentation.dto.response.BlueprintResponse;
import com.pomodify.backend.presentation.dto.response.ConfirmBlueprintResponse;
import com.pomodify.backend.presentation.dto.response.DualBlueprintResponse;
import com.pomodify.backend.presentation.dto.response.QuickFocusResponse;

/**
 * Mapper for AI-related results to DTOs.
 */
public class AiMapper {

    private AiMapper() {}

    /* -------------------- BLUEPRINT -------------------- */
    public static BlueprintItem toBlueprintItem(BlueprintResult result) {
        return BlueprintItem.builder()
                .activityTitle(result.activityTitle())
                .activityDescription(result.activityDescription())
                .focusMinutes(result.focusMinutes())
                .breakMinutes(result.breakMinutes())
                .firstSessionNote(result.firstSessionNote())
                .isFallback(result.isFallback())
                .build();
    }

    public static BlueprintResponse toBlueprintResponse(BlueprintItem item, String message) {
        return BlueprintResponse.builder()
                .message(message)
                .activityTitle(item.activityTitle())
                .activityDescription(item.activityDescription())
                .focusMinutes(item.focusMinutes())
                .breakMinutes(item.breakMinutes())
                .firstSessionNote(item.firstSessionNote())
                .isFallback(item.isFallback())
                .build();
    }

    /* -------------------- CONFIRM BLUEPRINT -------------------- */
    public static ConfirmBlueprintItem toConfirmBlueprintItem(ConfirmBlueprintResult result) {
        return ConfirmBlueprintItem.builder()
                .activityId(result.activityId())
                .sessionId(result.sessionId())
                .build();
    }

    public static ConfirmBlueprintResponse toConfirmBlueprintResponse(ConfirmBlueprintItem item, String message) {
        return ConfirmBlueprintResponse.builder()
                .message(message)
                .activityId(item.activityId())
                .sessionId(item.sessionId())
                .build();
    }

    /* -------------------- QUICK FOCUS -------------------- */
    public static QuickFocusItem toQuickFocusItem(QuickFocusResult result) {
        return QuickFocusItem.builder()
                .activityId(result.activityId())
                .sessionId(result.sessionId())
                .activityTitle(result.activityTitle())
                .build();
    }

    public static QuickFocusResponse toQuickFocusResponse(QuickFocusItem item, String message) {
        return QuickFocusResponse.builder()
                .message(message)
                .activityId(item.activityId())
                .sessionId(item.sessionId())
                .activityTitle(item.activityTitle())
                .build();
    }

    /* -------------------- DUAL BLUEPRINT -------------------- */
    public static DualBlueprintResponse toDualBlueprintResponse(DualBlueprintResult result, String message) {
        return DualBlueprintResponse.builder()
                .message(message)
                .beginnerPlan(toDualBlueprintPlan(result.beginnerPlan()))
                .intermediatePlan(toDualBlueprintPlan(result.intermediatePlan()))
                .isFallback(result.isFallback())
                .build();
    }

    private static DualBlueprintResponse.BlueprintPlan toDualBlueprintPlan(DualBlueprintResult.BlueprintPlanResult plan) {
        return DualBlueprintResponse.BlueprintPlan.builder()
                .level(plan.level())
                .activityTitle(plan.activityTitle())
                .activityDescription(plan.activityDescription())
                .focusMinutes(plan.focusMinutes())
                .breakMinutes(plan.breakMinutes())
                .todos(plan.todos())
                .tipNote(plan.tipNote())
                .build();
    }
}
