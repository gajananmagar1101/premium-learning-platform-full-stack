package com.studentplatform.backend.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "quiz_attempts")
@CompoundIndexes({
        @CompoundIndex(name = "quiz_student_unique", def = "{'quizId': 1, 'studentId': 1}", unique = true),
        @CompoundIndex(name = "quiz_attempt_student_submitted_idx", def = "{'studentId': 1, 'submittedAt': -1}"),
        @CompoundIndex(name = "quiz_attempt_quiz_idx", def = "{'quizId': 1}")
})
public class QuizAttemptEntity {

    @Id
    private String id;

    private String quizId;
    private String studentId;
    private String studentName;
    private String studentEmail;
    private String className;
    private List<Integer> answers = new ArrayList<>();
    private Integer score = 0;
    private Integer totalPoints = 0;
    private Instant submittedAt;

    public void prepareForSave() {
        if (submittedAt == null) {
            submittedAt = Instant.now();
        }
        if (answers == null) {
            answers = new ArrayList<>();
        }
        if (score == null) {
            score = 0;
        }
        if (totalPoints == null) {
            totalPoints = 0;
        }
    }

    public String getId() {
        return id;
    }

    public String getQuizId() {
        return quizId;
    }

    public void setQuizId(String quizId) {
        this.quizId = quizId;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public String getStudentEmail() {
        return studentEmail;
    }

    public void setStudentEmail(String studentEmail) {
        this.studentEmail = studentEmail;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public List<Integer> getAnswers() {
        return answers;
    }

    public void setAnswers(List<Integer> answers) {
        this.answers = answers;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public Integer getTotalPoints() {
        return totalPoints;
    }

    public void setTotalPoints(Integer totalPoints) {
        this.totalPoints = totalPoints;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }
}
