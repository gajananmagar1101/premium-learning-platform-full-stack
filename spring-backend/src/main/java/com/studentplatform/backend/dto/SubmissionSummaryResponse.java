package com.studentplatform.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studentplatform.backend.entity.SubmissionEntity;

public record SubmissionSummaryResponse(
        @JsonProperty("_id") String internalId,
        String id,
        String content,
        String fileName,
        String fileContent,
        Integer marks,
        String status,
        String submittedAt,
        String updatedAt
) {
    public static SubmissionSummaryResponse from(SubmissionEntity submission) {
        String id = submission.getId().toString();
        return new SubmissionSummaryResponse(
                id,
                id,
                submission.getContent(),
                submission.getFileName(),
                submission.getFileContent(),
                submission.getMarks(),
                submission.getStatus().name().toLowerCase(),
                submission.getSubmittedAt().toString(),
                submission.getUpdatedAt().toString()
        );
    }
}
