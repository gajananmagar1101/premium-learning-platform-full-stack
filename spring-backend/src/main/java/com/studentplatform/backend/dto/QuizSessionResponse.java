package com.studentplatform.backend.dto;

import com.studentplatform.backend.entity.QuizSessionEntity;

import java.time.Instant;
import java.util.List;

public record QuizSessionResponse(
        String quizId,
        String studentId,
        List<Integer> answers,
        Integer currentQuestionIndex,
        Instant startedAt,
        Instant endsAt
) {
    public static QuizSessionResponse from(QuizSessionEntity session) {
        return new QuizSessionResponse(
                session.getQuizId(),
                session.getStudentId(),
                session.getAnswers(),
                session.getCurrentQuestionIndex(),
                session.getStartedAt(),
                session.getEndsAt()
        );
    }
}
