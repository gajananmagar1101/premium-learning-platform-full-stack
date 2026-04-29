package com.studentplatform.backend.repository;

import com.studentplatform.backend.entity.YearEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface YearRepository extends MongoRepository<YearEntity, String> {
}
