package com.studentplatform.backend.repository;

import com.studentplatform.backend.entity.ScoreEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScoreRepository extends JpaRepository<ScoreEntity, UUID> {
    List<ScoreEntity> findAllByOrderBySubmittedAtDesc();
    List<ScoreEntity> findByStudentIdOrderBySubmittedAtDesc(UUID studentId);
    Optional<ScoreEntity> findByStudentIdAndAssessmentId(UUID studentId, UUID assessmentId);
    void deleteByStudentId(UUID studentId);
    void deleteByAssessmentId(UUID assessmentId);
}
