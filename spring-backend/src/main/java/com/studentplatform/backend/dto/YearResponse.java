package com.studentplatform.backend.dto;

import com.studentplatform.backend.entity.YearEntity;

public record YearResponse(
        String id,
        String code,
        String name
) {
    public static YearResponse from(YearEntity year) {
        return new YearResponse(year.getId(), year.getCode(), year.getName());
    }
}
