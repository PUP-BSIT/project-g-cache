package com.pomodify.backend.presentation.mapper;

import com.pomodify.backend.application.result.SummaryResult;
import com.pomodify.backend.presentation.dto.item.SummaryItem;
import com.pomodify.backend.presentation.dto.response.SummaryResponse;
import org.springframework.stereotype.Component;

@Component
public class SummaryMapper {
    public SummaryResponse toResponse(SummaryResult r) {
        SummaryItem item = new SummaryItem(
                new SummaryItem.Period(r.period().startDate(), r.period().endDate(), r.period().range()),
                new SummaryItem.Overview(
                        r.overview().totalFocusHours(),
                        r.overview().totalBreakHours(),
                        r.overview().completionRate(),
                        r.overview().sessionsCount(),
                        r.overview().averageSessionLengthMinutes()
                ),
                new SummaryItem.Trends(
                        new SummaryItem.TrendMetric(
                                r.trends().focusHours().current(),
                                r.trends().focusHours().previous(),
                                r.trends().focusHours().changePercent()
                        ),
                        new SummaryItem.TrendMetric(
                                r.trends().completionRate().current(),
                                r.trends().completionRate().previous(),
                                r.trends().completionRate().changePercent()
                        )
                ),
                r.insights().stream()
                        .map(i -> new SummaryItem.Insight(i.type(), i.severity(), i.message(), i.actionable()))
                        .toList(),
                new SummaryItem.ChartData(
                        r.chartData().labels(),
                        new SummaryItem.Datasets(r.chartData().datasets().focus(), r.chartData().datasets().breakHours())
                ),
                r.recentSessions().stream()
                        .map(s -> new SummaryItem.RecentSession(
                                s.id(), s.activityName(), s.date(), s.focusDurationMinutes(), s.breakDurationMinutes(), s.status(), s.mode()
                        )).toList(),
                r.topActivities().stream()
                        .map(t -> new SummaryItem.TopActivity(t.rank(), t.name(), t.totalDurationMinutes(), t.sessionCount()))
                        .toList(),
                r.lastMonthAbandonedSessions()
        );

        return new SummaryResponse("Summary report generated successfully", item);
    }
}
