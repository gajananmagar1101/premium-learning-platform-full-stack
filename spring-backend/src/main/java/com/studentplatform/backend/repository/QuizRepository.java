package com.studentplatform.backend.repository;

import com.studentplatform.backend.entity.QuizEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface QuizRepository extends MongoRepository<QuizEntity, String> {
    List<QuizEntity> findAllByOrderByCreatedAtDesc();
    List<QuizEntity> findByStatusOrderByCreatedAtDesc(String status);
    List<QuizEntity> findByStatusAndClassNameIgnoreCaseOrderByCreatedAtDesc(String status, String className);
    List<QuizEntity> findBySubjectIdOrLegacySubjectIgnoreCase(String subjectId, String legacySubject);
    boolean existsBySubjectId(String subjectId);
}
