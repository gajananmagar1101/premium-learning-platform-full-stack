package com.studentplatform.backend.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDateTime;

@Document(collection = "assignments")
@CompoundIndexes({
        @CompoundIndex(name = "assignment_class_status_deadline_idx", def = "{'className': 1, 'status': 1, 'deadline': 1, 'createdAt': -1}")
})
public class AssignmentEntity {

    @Id
    private String id;

    private String title;

    @Field("subjectId")
    private String subjectId;

    @Field("subject")
    private String legacySubject;

    private String description;

    @Field("className")
    private String className;

    private Integer totalMarks;

    private LocalDateTime deadline;

    private AssignmentStatus status;

    private String questionFileName;

    private String questionFileContent;

    private UserEntity createdBy;

    private Instant createdAt;

    public void prepareForSave() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (className != null) {
            className = className.trim();
        }
        if (status == null) {
            status = AssignmentStatus.DRAFT;
        }
    }

    public String getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSubjectId() {
        return subjectId;
    }

    public void setSubjectId(String subjectId) {
        this.subjectId = subjectId;
    }

    public String getLegacySubject() {
        return legacySubject;
    }

    public void setLegacySubject(String legacySubject) {
        this.legacySubject = legacySubject;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public Integer getTotalMarks() {
        return totalMarks;
    }

    public void setTotalMarks(Integer totalMarks) {
        this.totalMarks = totalMarks;
    }

    public LocalDateTime getDeadline() {
        return deadline;
    }

    public void setDeadline(LocalDateTime deadline) {
        this.deadline = deadline;
    }

    public AssignmentStatus getStatus() {
        return status;
    }

    public void setStatus(AssignmentStatus status) {
        this.status = status;
    }

    public UserEntity getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(UserEntity createdBy) {
        this.createdBy = createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getQuestionFileName() {
        return questionFileName;
    }

    public void setQuestionFileName(String questionFileName) {
        this.questionFileName = questionFileName;
    }

    public String getQuestionFileContent() {
        return questionFileContent;
    }

    public void setQuestionFileContent(String questionFileContent) {
        this.questionFileContent = questionFileContent;
    }
}
