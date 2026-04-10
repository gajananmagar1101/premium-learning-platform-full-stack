package com.studentplatform.backend.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "scores")
@CompoundIndexes({
        @CompoundIndex(name = "student_assessment_score_unique", def = "{'student.id': 1, 'assessment.id': 1}", unique = true)
})
public class ScoreEntity {

    @Id
    private String id;

    private UserEntity student;

    private AssessmentEntity assessment;

    private Integer score;

    private String feedback = "";

    private Instant submittedAt;

    public void prepareForSave() {
        if (submittedAt == null) {
            submittedAt = Instant.now();
        }
        if (feedback == null) {
            feedback = "";
        }
    }

    public String getId() {
        return id;
    }

    public UserEntity getStudent() {
        return student;
    }

    public void setStudent(UserEntity student) {
        this.student = student;
    }

    public AssessmentEntity getAssessment() {
        return assessment;
    }

    public void setAssessment(AssessmentEntity assessment) {
        this.assessment = assessment;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }
}
