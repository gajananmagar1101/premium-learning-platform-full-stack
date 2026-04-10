package com.studentplatform.backend.repository;

import com.studentplatform.backend.entity.ScoreEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ScoreRepository extends MongoRepository<ScoreEntity, String> {
    List<ScoreEntity> findAllByOrderBySubmittedAtDesc();
    List<ScoreEntity> findByStudent_IdOrderBySubmittedAtDesc(String studentId);
    Optional<ScoreEntity> findByStudent_IdAndAssessment_Id(String studentId, String assessmentId);
    void deleteByStudent_Id(String studentId);
    void deleteByAssessment_Id(String assessmentId);
}
