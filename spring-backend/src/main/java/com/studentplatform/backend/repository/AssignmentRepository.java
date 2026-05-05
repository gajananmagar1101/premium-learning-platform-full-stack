package com.studentplatform.backend.repository;

import com.studentplatform.backend.entity.AssignmentEntity;
import com.studentplatform.backend.entity.AssignmentStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AssignmentRepository extends MongoRepository<AssignmentEntity, String> {
    List<AssignmentEntity> findAllByOrderByDeadlineAscCreatedAtDesc();
    List<AssignmentEntity> findByClassNameIgnoreCaseAndStatusOrderByDeadlineAscCreatedAtDesc(String className, AssignmentStatus status);
    List<AssignmentEntity> findBySubjectIdOrLegacySubjectIgnoreCase(String subjectId, String legacySubject);
    boolean existsBySubjectId(String subjectId);
}
