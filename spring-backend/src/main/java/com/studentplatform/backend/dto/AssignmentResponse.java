package com.studentplatform.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studentplatform.backend.entity.AssignmentEntity;

public record AssignmentResponse(
        @JsonProperty("_id") String internalId,
        String id,
        String title,
        String subject,
        @JsonProperty("className") String className,
        String description,
        Integer totalMarks,
        String deadline,
        String createdAt
) {
    public static AssignmentResponse from(AssignmentEntity assignment) {
        String id = assignment.getId().toString();
        return new AssignmentResponse(
                id,
                id,
                assignment.getTitle(),
                assignment.getSubject(),
                assignment.getClassName(),
                assignment.getDescription(),
                assignment.getTotalMarks(),
                assignment.getDeadline().toString(),
                assignment.getCreatedAt().toString()
        );
    }
}
