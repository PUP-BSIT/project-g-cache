package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.command.report.SummaryCommand;
import com.pomodify.backend.application.helper.UserHelper;
import com.pomodify.backend.application.service.SummaryService;
import com.pomodify.backend.presentation.dto.response.SummaryResponse;
import com.pomodify.backend.presentation.mapper.SummaryMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
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
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;

@RestController
@RequestMapping("/reports")
@Tag(name = "Reports", description = "Summary reports over different time ranges")
@RequiredArgsConstructor
public class ReportsController {

    private final SummaryService summaryService;
    private final SummaryMapper summaryMapper;
    private final UserHelper userHelper;

    @GetMapping("/summary")
    @Operation(
        summary = "Get summary report",
        description = "Returns a summary report for the current user over weekly, monthly, or yearly range. Includes lastMonthAbandonedSessions summarizing abandoned sessions in the previous calendar month.",
        parameters = {
            @Parameter(name = "range", in = ParameterIn.QUERY, description = "Time range: week (default), month/monthly, or year/yearly"),
            @Parameter(name = "startDate", in = ParameterIn.QUERY, description = "Custom range start date (YYYY-MM-DD). Must be used together with endDate."),
            @Parameter(name = "endDate", in = ParameterIn.QUERY, description = "Custom range end date (YYYY-MM-DD). Must be used together with startDate; maximum span 365 days."),
            @Parameter(name = "fields", in = ParameterIn.QUERY, description = "Optional comma-separated list of sections to include in the report.")
        },
        responses = {
            @ApiResponse(responseCode = "200", description = "Summary report generated successfully", content = @Content(schema = @Schema(implementation = SummaryResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request parameters (date range, format, etc.)"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
        }
    )
    public SummaryResponse getSummary(@AuthenticationPrincipal Jwt jwt,
                                      @RequestParam(name = "range", defaultValue = "week") String range,
                                      @RequestParam(name = "startDate", required = false) String startDate,
                                      @RequestParam(name = "endDate", required = false) String endDate,
                                      @RequestParam(name = "fields", required = false) String fields) {
        Long userId = userHelper.extractUserId(jwt);
        if (userId == null) {
            throw new AuthenticationCredentialsNotFoundException("Unauthorized: invalid user claim");
        }
        ZoneId zone = ZoneId.of("Asia/Manila");
        LocalDate today = LocalDate.now(zone);
        SummaryCommand.Range r = parseRange(range);

        LocalDate start;
        LocalDate end;

        // Custom range takes priority when both dates are provided
        if (startDate != null && endDate != null) {
            ParsedDates parsed = parseAndValidateDates(startDate, endDate);
            start = parsed.start();
            end = parsed.end();
        } else {
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

    private ParsedDates parseAndValidateDates(String startRaw, String endRaw) {
        List<FieldError> errors = new ArrayList<>();
        LocalDate start;
        LocalDate end;

        try {
            start = LocalDate.parse(startRaw);
        } catch (DateTimeParseException ex) {
            errors.add(new FieldError("startDate", "Invalid date format. Expected YYYY-MM-DD"));
            start = null;
        }

        try {
            end = LocalDate.parse(endRaw);
        } catch (DateTimeParseException ex) {
            errors.add(new FieldError("endDate", "Invalid date format. Expected YYYY-MM-DD"));
            end = null;
        }

        if (start != null && end != null) {
            if (start.isAfter(end)) {
                errors.add(new FieldError("startDate", "Start date cannot be after end date"));
            }
            long days = end.toEpochDay() - start.toEpochDay() + 1;
            if (days > 365) {
                errors.add(new FieldError("endDate", "Date range exceeds 365 days"));
            }
        }

        if (!errors.isEmpty()) {
            throw new InvalidSummaryRequestException("Invalid request parameters", errors);
        }

        return new ParsedDates(start, end);
    }

    private record ParsedDates(LocalDate start, LocalDate end) {}

    public record FieldError(String field, String message) {}

    public static class InvalidSummaryRequestException extends RuntimeException {
        private final java.util.List<FieldError> errors;

        public InvalidSummaryRequestException(String message, java.util.List<FieldError> errors) {
            super(message);
            this.errors = errors;
        }

        public java.util.List<FieldError> getErrors() {
            return errors;
        }
    }
}
