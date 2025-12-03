package com.pomodify.backend.application.command.report;

import java.time.LocalDate;
import java.time.ZoneId;

public record SummaryCommand(
        Long userId,
        ZoneId zoneId,
        Range range,
        LocalDate startDate,
        LocalDate endDate
) {
    public enum Range { WEEKLY, MONTHLY, YEARLY }

    public static SummaryCommand of(Long userId, ZoneId zoneId, Range range, LocalDate startDate, LocalDate endDate) {
        return new SummaryCommand(
                userId,
                zoneId != null ? zoneId : ZoneId.of("Asia/Manila"),
                range != null ? range : Range.WEEKLY,
                startDate,
                endDate
        );
    }
}
