package com.pomodify.backend.application.mapper;

import com.pomodify.backend.application.dto.ActivityDetailsDTO;
import com.pomodify.backend.presentation.dto.response.SessionDTO;
import java.util.List;
import java.util.stream.Collectors;

public class ActivityDTOMapper {
    public static com.pomodify.backend.presentation.dto.response.ActivityDetailsDTO toResponse(ActivityDetailsDTO dto) {
        List<SessionDTO> sessionDTOs = dto.getSessions().stream()
            .map(s -> SessionDTO.builder()
                .id(s.getId())
                .durationMinutes(s.getDurationMinutes())
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .completed(s.isCompleted())
                .notes(s.getNotes())
                .build())
            .collect(Collectors.toList());

        return com.pomodify.backend.presentation.dto.response.ActivityDetailsDTO.builder()
            .id(dto.getId())
            .name(dto.getName())
            .description(dto.getDescription())
            .categoryId(dto.getCategoryId())
            .scheduledTime(dto.getScheduledAt())
            .durationMinutes(dto.getTotalDurationMinutes())
            .totalFocusTimeMinutes(dto.getTotalFocusTime())
            .totalBreakTimeMinutes(dto.getTotalBreakTime())
            .sessions(sessionDTOs)
            .build();
    }
}