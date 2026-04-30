package com.studentplatform.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studentplatform.backend.entity.AssessmentEntity;

public record AssessmentResponse(
        @JsonProperty("_id") String internalId,
        String id,
        String title,
        String subject,
        String date,
        Integer maxScore,
        String status
) {
    public static AssessmentResponse from(AssessmentEntity assessment) {
        String id = assessment.getId() == null ? "" : assessment.getId();
        return new AssessmentResponse(
                id,
                id,
                assessment.getTitle() == null ? "" : assessment.getTitle(),
                assessment.getSubject() == null ? "" : assessment.getSubject(),
                assessment.getDate() == null ? "" : assessment.getDate(),
                assessment.getMaxScore(),
                assessment.getStatus() == null ? "upcoming" : assessment.getStatus().name().toLowerCase()
        );
    }
}
