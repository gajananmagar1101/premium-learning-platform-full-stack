package com.studentplatform.backend.dto;

import com.studentplatform.backend.entity.SubjectEntity;
import com.studentplatform.backend.entity.YearEntity;

public record SubjectResponse(
        String id,
        String name,
        String yearId,
        String yearCode,
        String yearName
) {
    public static SubjectResponse from(SubjectEntity subject, YearEntity year) {
        return new SubjectResponse(
                subject.getId(),
                subject.getName(),
                subject.getYearId(),
                year == null ? null : year.getCode(),
                year == null ? null : year.getName()
        );
    }
}
