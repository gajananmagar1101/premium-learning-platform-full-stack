package com.studentplatform.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studentplatform.backend.entity.SubmissionEntity;

import java.time.LocalDateTime;

public record SubmissionResponse(
        @JsonProperty("_id") String internalId,
        String id,
        String studentId,
        String studentName,
        String studentEmail,
        String assignmentId,
        String assignmentTitle,
        String subject,
        Integer totalMarks,
        String deadline,
        String content,
        String fileName,
        String fileContent,
        Integer marks,
        String status,
        String submittedAt,
        String updatedAt,
        boolean late
) {
    public static SubmissionResponse from(SubmissionEntity submission) {
        String id = submission.getId().toString();
        return new SubmissionResponse(
                id,
                id,
                submission.getStudent().getId().toString(),
                submission.getStudent().getName(),
                submission.getStudent().getEmail(),
                submission.getAssignment().getId().toString(),
                submission.getAssignment().getTitle(),
                submission.getAssignment().getSubject(),
                submission.getAssignment().getTotalMarks(),
                submission.getAssignment().getDeadline().toString(),
                submission.getContent(),
                submission.getFileName(),
                submission.getFileContent(),
                submission.getMarks(),
                submission.getStatus().name().toLowerCase(),
                submission.getSubmittedAt().toString(),
                submission.getUpdatedAt().toString(),
                submission.getSubmittedAt().isAfter(submission.getAssignment().getDeadline().atZone(java.time.ZoneId.systemDefault()).toInstant())
        );
    }
}
