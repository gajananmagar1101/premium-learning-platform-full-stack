package com.studentplatform.backend.repository;

import com.studentplatform.backend.entity.AssessmentEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AssessmentRepository extends MongoRepository<AssessmentEntity, String> {
    List<AssessmentEntity> findAllByOrderByDateDesc();
}
