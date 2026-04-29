package com.studentplatform.backend.repository;

import com.studentplatform.backend.entity.SubjectEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface SubjectRepository extends MongoRepository<SubjectEntity, String> {
    List<SubjectEntity> findByYearIdOrderByNameAsc(String yearId);
    Optional<SubjectEntity> findByNormalizedName(String normalizedName);
}
