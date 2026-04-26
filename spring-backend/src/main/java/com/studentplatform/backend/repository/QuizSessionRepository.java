package com.studentplatform.backend.repository;

import com.studentplatform.backend.entity.QuizSessionEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface QuizSessionRepository extends MongoRepository<QuizSessionEntity, String> {
    Optional<QuizSessionEntity> findByQuizIdAndStudentId(String quizId, String studentId);
    List<QuizSessionEntity> findByEndsAtLessThanEqual(Instant now);
    void deleteByQuizId(String quizId);
    void deleteByStudentId(String studentId);
}
