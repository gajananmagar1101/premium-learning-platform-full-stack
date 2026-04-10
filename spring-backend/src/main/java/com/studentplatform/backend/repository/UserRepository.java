package com.studentplatform.backend.repository;

import com.studentplatform.backend.entity.Role;
import com.studentplatform.backend.entity.UserEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<UserEntity, String> {
    Optional<UserEntity> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByRole(Role role);
    List<UserEntity> findAllByRoleOrderByCreatedAtDesc(Role role);
}
