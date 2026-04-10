package com.studentplatform.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studentplatform.backend.entity.AssignmentEntity;
import com.studentplatform.backend.entity.SubmissionEntity;

import java.time.LocalDateTime;

public record StudentAssignmentResponse(
        @JsonProperty("_id") String internalId,
        String id,
        String title,
        String subject,
        @JsonProperty("className") String className,
        String description,
        Integer totalMarks,
        String deadline,
        boolean submissionClosed,
        boolean canSubmit,
        boolean canEdit,
        String status,
        SubmissionSummaryResponse submission
) {
    public static StudentAssignmentResponse from(AssignmentEntity assignment, SubmissionEntity submission) {
        String id = assignment.getId().toString();
        boolean closed = assignment.getDeadline().isBefore(LocalDateTime.now());
        String status = submission == null ? "pending" : submission.getStatus().name().toLowerCase();
        return new StudentAssignmentResponse(
                id,
                id,
                assignment.getTitle(),
                assignment.getSubject(),
                assignment.getClassName(),
                assignment.getDescription(),
                assignment.getTotalMarks(),
                assignment.getDeadline().toString(),
                closed,
                submission == null && !closed,
                submission != null && !closed,
                status,
                submission == null ? null : SubmissionSummaryResponse.from(submission)
        );
    }
}
