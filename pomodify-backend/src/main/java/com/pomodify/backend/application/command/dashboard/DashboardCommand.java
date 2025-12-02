package com.pomodify.backend.application.command.dashboard;

import lombok.Value;

import java.time.ZoneId;

@Value
public class DashboardCommand {
    Long userId;
    ZoneId zoneId;
    int recentLimit;

    public static DashboardCommand of(Long userId, ZoneId zoneId) {
        return new DashboardCommand(userId, zoneId != null ? zoneId : ZoneId.of("Asia/Manila"), 5);
    }

    public static DashboardCommand of(Long userId, ZoneId zoneId, int recentLimit) {
        return new DashboardCommand(userId, zoneId != null ? zoneId : ZoneId.of("Asia/Manila"), recentLimit > 0 ? recentLimit : 5);
    }
}
