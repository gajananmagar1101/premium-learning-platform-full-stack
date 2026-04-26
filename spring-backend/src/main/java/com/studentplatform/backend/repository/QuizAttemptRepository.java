package com.studentplatform.backend.repository;

import com.studentplatform.backend.entity.QuizAttemptEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface QuizAttemptRepository extends MongoRepository<QuizAttemptEntity, String> {
    List<QuizAttemptEntity> findAllByOrderBySubmittedAtDesc();
    List<QuizAttemptEntity> findByStudentIdOrderBySubmittedAtDesc(String studentId);
    Optional<QuizAttemptEntity> findByQuizIdAndStudentId(String quizId, String studentId);
    void deleteByQuizId(String quizId);
    void deleteByStudentId(String studentId);
}
