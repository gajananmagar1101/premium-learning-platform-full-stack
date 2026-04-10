package com.studentplatform.backend.controller;

import com.studentplatform.backend.dto.StudentUpdateRequest;
import com.studentplatform.backend.security.AppUserDetails;
import com.studentplatform.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/students")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> getStudents() {
        return Map.of("success", true, "students", userService.getStudents());
    }

    @GetMapping("/students/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> getStudent(@PathVariable String id) {
        return userService.getStudentDetails(id);
    }

    @PutMapping("/students/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> updateStudent(@PathVariable String id, @Valid @RequestBody StudentUpdateRequest request) {
        return Map.of("success", true, "student", userService.updateStudent(id, request));
    }

    @PutMapping("/me")
    public Map<String, Object> updateMe(
            @AuthenticationPrincipal AppUserDetails userDetails,
            @Valid @RequestBody StudentUpdateRequest request
    ) {
        return Map.of("success", true, "user", userService.updateCurrentUser(userDetails.getUser(), request));
    }

    @DeleteMapping("/students/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> deleteStudent(@PathVariable String id) {
        userService.deleteStudent(id);
        return Map.of("success", true, "message", "Student deleted.");
    }

    @GetMapping("/me/scores")
    public Map<String, Object> myScores(@AuthenticationPrincipal AppUserDetails userDetails) {
        return Map.of("success", true, "scores", userService.getMyScores(userDetails.getUser()));
    }
}
