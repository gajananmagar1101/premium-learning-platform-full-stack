package com.studentplatform.backend.repository;

import com.studentplatform.backend.entity.Role;
import com.studentplatform.backend.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByRole(Role role);
    List<UserEntity> findAllByRoleOrderByCreatedAtDesc(Role role);
}
