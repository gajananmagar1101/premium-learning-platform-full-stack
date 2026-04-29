package com.studentplatform.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studentplatform.backend.entity.AssignmentEntity;
import com.studentplatform.backend.entity.AssignmentStatus;

public record AssignmentResponse(
        @JsonProperty("_id") String internalId,
        String id,
        String title,
        String subjectId,
        String subject,
        @JsonProperty("className") String className,
        String description,
        Integer totalMarks,
        String deadline,
        String status,
        String questionFileName,
        String questionFileContent,
        String createdAt
) {
    public static AssignmentResponse from(AssignmentEntity assignment, String subjectName) {
        String id = assignment.getId().toString();
        return new AssignmentResponse(
                id,
                id,
                assignment.getTitle(),
                assignment.getSubjectId(),
                subjectName,
                assignment.getClassName(),
                assignment.getDescription(),
                assignment.getTotalMarks(),
                assignment.getDeadline().toString(),
                (assignment.getStatus() == null ? AssignmentStatus.DRAFT : assignment.getStatus()).name().toLowerCase(),
                assignment.getQuestionFileName(),
                assignment.getQuestionFileContent(),
                assignment.getCreatedAt().toString()
        );
    }
}
