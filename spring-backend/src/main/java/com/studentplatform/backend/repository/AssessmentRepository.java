package com.studentplatform.backend.repository;

import com.studentplatform.backend.entity.AssessmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AssessmentRepository extends JpaRepository<AssessmentEntity, UUID> {
    List<AssessmentEntity> findAllByOrderByDateDesc();
}
