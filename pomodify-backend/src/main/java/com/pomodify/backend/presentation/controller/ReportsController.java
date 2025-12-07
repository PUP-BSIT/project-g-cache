package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.command.report.SummaryCommand;
import com.pomodify.backend.application.helper.UserHelper;
import com.pomodify.backend.application.service.SummaryService;
import com.pomodify.backend.presentation.dto.response.SummaryResponse;
import com.pomodify.backend.presentation.mapper.SummaryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.DayOfWeek;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportsController {

    private final SummaryService summaryService;
    private final SummaryMapper summaryMapper;
    private final UserHelper userHelper;

    @GetMapping("/summary")
    public SummaryResponse getSummary(@AuthenticationPrincipal Jwt jwt,
                                      @RequestParam(name = "range", defaultValue = "week") String range) {
        Long userId = userHelper.extractUserId(jwt);
        if (userId == null) {
            throw new AuthenticationCredentialsNotFoundException("Unauthorized: invalid user claim");
        }
        ZoneId zone = ZoneId.of("Asia/Manila");
        LocalDate today = LocalDate.now(zone);
        SummaryCommand.Range r = parseRange(range);
        LocalDate start;
        LocalDate end;
        if (r == SummaryCommand.Range.WEEKLY) {
            start = today.with(DayOfWeek.MONDAY);
            end = start.plusDays(6);
        } else if (r == SummaryCommand.Range.MONTHLY) {
            start = today.withDayOfMonth(1);
            end = today.withDayOfMonth(today.lengthOfMonth());
        } else { // YEARLY
            start = today.withDayOfYear(1);
            end = today.withDayOfYear(today.lengthOfYear());
        }

        SummaryCommand cmd = SummaryCommand.of(userId, zone, r, start, end);
        return summaryMapper.toResponse(summaryService.getSummary(cmd));
    }

    private SummaryCommand.Range parseRange(String range) {
        return switch (range.toLowerCase()) {
            case "month", "monthly" -> SummaryCommand.Range.MONTHLY;
            case "year", "yearly" -> SummaryCommand.Range.YEARLY;
            default -> SummaryCommand.Range.WEEKLY;
        };
    }
}
