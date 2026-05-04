package com.studentplatform.backend.repository;

import com.studentplatform.backend.entity.PendingRegistrationEntity;
import com.studentplatform.backend.entity.RegistrationApprovalStatus;
import com.studentplatform.backend.entity.Role;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PendingRegistrationRepository extends MongoRepository<PendingRegistrationEntity, String> {
    Optional<PendingRegistrationEntity> findByEmail(String email);
    void deleteByEmail(String email);
    List<PendingRegistrationEntity> findByRoleAndEmailVerifiedTrueAndApprovalStatusOrderByUpdatedAtDesc(
            Role role,
            RegistrationApprovalStatus approvalStatus
    );
}
