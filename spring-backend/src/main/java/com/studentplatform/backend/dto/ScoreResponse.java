package com.studentplatform.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studentplatform.backend.entity.ScoreEntity;

public record ScoreResponse(
        @JsonProperty("_id") String internalId,
        String studentId,
        String assessmentId,
        AssessmentResponse assessment,
        Integer score,
        String feedback,
        String submittedAt
) {
    public static ScoreResponse from(ScoreEntity score) {
        return new ScoreResponse(
                score.getId().toString(),
                score.getStudent().getId().toString(),
                score.getAssessment().getId().toString(),
                AssessmentResponse.from(score.getAssessment()),
                score.getScore(),
                score.getFeedback(),
                score.getSubmittedAt().toString()
        );
    }
}
