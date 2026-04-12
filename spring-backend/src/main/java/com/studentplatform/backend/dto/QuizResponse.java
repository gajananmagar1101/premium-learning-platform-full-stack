package com.studentplatform.backend.dto;

import com.studentplatform.backend.entity.QuizEntity;

import java.time.Instant;
import java.util.List;

public record QuizResponse(
        String id,
        String title,
        String subject,
        String className,
        String description,
        Instant deadlineAt,
        Integer durationMinutes,
        String status,
        List<QuizQuestionResponse> questions,
        Integer totalPoints,
        Instant createdAt,
        Instant updatedAt
) {
    public static QuizResponse from(QuizEntity quiz) {
        return new QuizResponse(
                quiz.getId(),
                quiz.getTitle(),
                quiz.getSubject(),
                quiz.getClassName(),
                quiz.getDescription() == null ? "" : quiz.getDescription(),
                quiz.getDeadlineAt(),
                quiz.getDurationMinutes(),
                quiz.getStatus(),
                quiz.getQuestions().stream().map(QuizQuestionResponse::from).toList(),
                quiz.getTotalPoints(),
                quiz.getCreatedAt(),
                quiz.getUpdatedAt()
        );
    }

    public record QuizQuestionResponse(
            String id,
            String prompt,
            List<String> options,
            Integer correctOption,
            Integer points
    ) {
        static QuizQuestionResponse from(QuizEntity.QuizQuestion question) {
            return new QuizQuestionResponse(
                    question.getId(),
                    question.getPrompt(),
                    question.getOptions(),
                    question.getCorrectOption(),
                    question.getPoints()
            );
        }
    }
}
