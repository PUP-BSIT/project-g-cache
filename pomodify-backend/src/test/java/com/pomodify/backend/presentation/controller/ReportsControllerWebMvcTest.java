package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.command.report.SummaryCommand;
import com.pomodify.backend.application.result.SummaryResult;
import com.pomodify.backend.application.helper.UserHelper;
import com.pomodify.backend.domain.repository.UserRepository;
import com.pomodify.backend.application.service.SummaryService;
import com.pomodify.backend.presentation.dto.item.SummaryItem;
import com.pomodify.backend.presentation.dto.response.SummaryResponse;
import com.pomodify.backend.presentation.mapper.SummaryMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ReportsController.class)
class ReportsControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SummaryService summaryService;

    @MockBean
    private SummaryMapper summaryMapper;

        @MockBean
        private UserHelper userHelper;

        @MockBean
        private UserRepository userRepository;

        

    @Test
    void getSummary_week_success() throws Exception {
        // Prepare a minimal SummaryResult record
        LocalDate start = LocalDate.of(2025, 12, 1);
        LocalDate end = LocalDate.of(2025, 12, 7);
        SummaryResult result = new SummaryResult(
                new SummaryResult.Meta("week", start, end),
                new SummaryResult.Metrics(5.0, 80, 25),
                new SummaryResult.ChartData(List.of("Mon", "Tue"), new SummaryResult.Datasets(List.of(1.5, 2.0), List.of(0.5, 0.7))),
                List.of(),
                List.of()
        );

        // Prepare a mapped SummaryResponse
        SummaryItem item = new SummaryItem(
                new SummaryItem.Meta("week", start, end),
                new SummaryItem.Metrics(5.0, 80, 25),
                new SummaryItem.ChartData(List.of("Mon", "Tue"), new SummaryItem.Datasets(List.of(1.5, 2.0), List.of(0.5, 0.7))),
                List.of(),
                List.of()
        );
        SummaryResponse response = new SummaryResponse("Summary fetched successfully", item);

        when(summaryService.getSummary(any(SummaryCommand.class))).thenReturn(result);
        when(summaryMapper.toResponse(result)).thenReturn(response);
        when(userHelper.extractUserId(any())).thenReturn(123L);

        // Build a JWT with a `user` claim as required by controllers
        var jwt = SecurityMockMvcRequestPostProcessors.jwt()
                .jwt(j -> {
                    j.claim("user", 123L);
                    j.subject("sub-123");
                });

        mockMvc.perform(get("/api/v1/reports/summary")
                        .param("range", "week")
                        .with(jwt)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Summary fetched successfully"))
                .andExpect(jsonPath("$.item.meta.range").value("week"))
                .andExpect(jsonPath("$.item.metrics.completionRate").value(80))
                .andExpect(jsonPath("$.item.chartData.labels[0]").value("Mon"));
    }

    @Test
    void getSummary_unauthorized_when_user_claim_missing() throws Exception {
        // UserHelper returns null to simulate missing/invalid claim
        when(userHelper.extractUserId(any())).thenReturn(null);

        var jwt = SecurityMockMvcRequestPostProcessors.jwt()
                .jwt(j -> {
                    // intentionally omit 'user' claim
                    j.subject("sub-unauth");
                });

        mockMvc.perform(get("/api/v1/reports/summary")
                .param("range", "week")
                .with(jwt))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized: invalid user claim"));
    }

    @Test
    void getSummary_unauthorized_when_jwt_missing() throws Exception {
        mockMvc.perform(get("/api/v1/reports/summary")
                        .param("range", "week"))
                .andExpect(status().isUnauthorized());
    }
}
