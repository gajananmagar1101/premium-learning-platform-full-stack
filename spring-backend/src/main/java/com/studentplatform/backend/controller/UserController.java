package com.studentplatform.backend.controller;

import com.studentplatform.backend.dto.FacultyAccessUpdateRequest;
import com.studentplatform.backend.dto.StudentAccessUpdateRequest;
import com.studentplatform.backend.dto.StudentUpdateRequest;
import com.studentplatform.backend.security.AppUserDetails;
import com.studentplatform.backend.service.FacultyRegistrationRequestService;
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
    private final FacultyRegistrationRequestService facultyRegistrationRequestService;

    public UserController(UserService userService, FacultyRegistrationRequestService facultyRegistrationRequestService) {
        this.userService = userService;
        this.facultyRegistrationRequestService = facultyRegistrationRequestService;
    }

    @GetMapping("/students")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public Map<String, Object> getStudents() {
        return Map.of("success", true, "students", userService.getStudents());
    }

    @GetMapping("/students/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public Map<String, Object> getStudent(@PathVariable String id) {
        return Map.of("success", true, "student", userService.getStudent(id));
    }

    @PutMapping("/students/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public Map<String, Object> updateStudent(@PathVariable String id, @Valid @RequestBody StudentUpdateRequest request) {
        return Map.of("success", true, "student", userService.updateStudent(id, request));
    }

    @PutMapping("/students/{id}/access")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> updateStudentAccess(
            @PathVariable String id,
            @RequestBody StudentAccessUpdateRequest request
    ) {
        boolean unblock = request == null || request.blockedUntil() == null || request.blockedUntil().isBlank();
        return Map.of(
                "success", true,
                "message", unblock ? "Student access restored." : "Student access blocked temporarily.",
                "student", userService.updateStudentAccess(id, request)
        );
    }

    @PutMapping("/me")
    public Map<String, Object> updateMe(
            @AuthenticationPrincipal AppUserDetails userDetails,
            @Valid @RequestBody StudentUpdateRequest request
    ) {
        return Map.of("success", true, "user", userService.updateCurrentUser(userDetails.getUser(), request));
    }

    @DeleteMapping("/students/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public Map<String, Object> deleteStudent(@PathVariable String id) {
        userService.deleteStudent(id);
        return Map.of("success", true, "message", "Student deleted.");
    }

    @GetMapping("/faculty-requests")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> getFacultyRequests() {
        return Map.of(
                "success", true,
                "requests", facultyRegistrationRequestService.getPendingRequests(),
                "faculty", userService.getFacultyMembers()
        );
    }

    @GetMapping("/faculty")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> getFacultyMembers() {
        return Map.of("success", true, "faculty", userService.getFacultyMembers());
    }

    @PutMapping("/faculty-requests/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> approveFacultyRequest(@PathVariable String id) {
        return Map.of(
                "success", true,
                "message", "Faculty registration request approved.",
                "request", facultyRegistrationRequestService.approve(id)
        );
    }

    @PutMapping("/faculty-requests/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> rejectFacultyRequest(@PathVariable String id) {
        return Map.of(
                "success", true,
                "message", "Faculty registration request rejected.",
                "request", facultyRegistrationRequestService.reject(id)
        );
    }

    @PutMapping("/faculty/{id}/access")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> updateFacultyAccess(
            @PathVariable String id,
            @RequestBody FacultyAccessUpdateRequest request
    ) {
        boolean unblock = request == null || request.blockedUntil() == null || request.blockedUntil().isBlank();
        return Map.of(
                "success", true,
                "message", unblock ? "Faculty access restored." : "Faculty access blocked temporarily.",
                "faculty", userService.updateFacultyAccess(id, request)
        );
    }

    @DeleteMapping("/faculty/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> deleteFaculty(@PathVariable String id) {
        userService.deleteFaculty(id);
        return Map.of("success", true, "message", "Faculty deleted.");
    }
}
