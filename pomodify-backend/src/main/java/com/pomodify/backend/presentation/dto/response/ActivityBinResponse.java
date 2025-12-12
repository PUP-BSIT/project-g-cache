package com.pomodify.backend.presentation.dto.response;

import com.pomodify.backend.presentation.dto.item.ActivityItem;
import com.pomodify.backend.presentation.dto.item.SessionItem;
import lombok.Builder;
import java.util.List;

@Builder
public record ActivityBinResponse(
        String message,
        ActivityItem activity,
        List<SessionItem> sessions
) {
}
