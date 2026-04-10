package com.studentplatform.backend.repository;

import com.studentplatform.backend.entity.SubmissionEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface SubmissionRepository extends MongoRepository<SubmissionEntity, String> {
    List<SubmissionEntity> findAllByOrderByUpdatedAtDesc();
    List<SubmissionEntity> findByStudent_IdOrderByUpdatedAtDesc(String studentId);
    Optional<SubmissionEntity> findByStudent_IdAndAssignment_Id(String studentId, String assignmentId);
    void deleteByAssignment_Id(String assignmentId);
    void deleteByStudent_Id(String studentId);
}
