package com.pomodify.backend.presentation.mapper;

import com.pomodify.backend.application.result.SummaryResult;
import com.pomodify.backend.presentation.dto.item.SummaryItem;
import com.pomodify.backend.presentation.dto.response.SummaryResponse;
import org.springframework.stereotype.Component;

@Component
public class SummaryMapper {
    public SummaryResponse toResponse(SummaryResult r) {
        SummaryItem item = new SummaryItem(
                new SummaryItem.Meta(r.meta().range(), r.meta().startDate(), r.meta().endDate()),
                new SummaryItem.Metrics(r.metrics().totalFocusedHours(), r.metrics().completionRate(), r.metrics().avgSessionMinutes()),
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
                        .toList()
        );

        return new SummaryResponse("Summary fetched successfully", item);
    }
}
