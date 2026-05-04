package com.studentplatform.backend.repository;

import com.studentplatform.backend.entity.Role;
import com.studentplatform.backend.entity.UserEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;
import java.time.Instant;

public interface UserRepository extends MongoRepository<UserEntity, String> {
    Optional<UserEntity> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<UserEntity> findByEmailVerificationTokenHashAndEmailVerificationExpiresAtAfter(String tokenHash, Instant now);
    long countByRole(Role role);
    List<UserEntity> findAllByRoleOrderByCreatedAtDesc(Role role);
    List<UserEntity> findAllByRoleOrderByNameAsc(Role role);
    @Query(value = "{ 'role': { $in: ['FACULTY', 'faculty', 'Faculty', 'TEACHER', 'teacher', 'Teacher'] } }", sort = "{ 'name': 1 }")
    List<UserEntity> findAllFacultyLikeUsers();
}
