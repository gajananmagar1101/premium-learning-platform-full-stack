package com.studentplatform.backend.dto;

import com.studentplatform.backend.entity.QuizAttemptEntity;

import java.time.Instant;
import java.util.List;

public record QuizAttemptResponse(
        String id,
        String quizId,
        String studentId,
        String studentName,
        String studentEmail,
        String className,
        List<Integer> answers,
        Integer score,
        Integer totalPoints,
        Instant submittedAt
) {
    public static QuizAttemptResponse from(QuizAttemptEntity attempt) {
        return new QuizAttemptResponse(
                attempt.getId(),
                attempt.getQuizId(),
                attempt.getStudentId(),
                attempt.getStudentName(),
                attempt.getStudentEmail(),
                attempt.getClassName(),
                attempt.getAnswers(),
                attempt.getScore(),
                attempt.getTotalPoints(),
                attempt.getSubmittedAt()
        );
    }
}
