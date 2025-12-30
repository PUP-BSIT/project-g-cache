package com.pomodify.backend.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BadgeResponse {
    private Long id;
    private String name;
    private Integer milestoneDays;
    private LocalDate dateAwarded;
    private String imageUrl;
}
