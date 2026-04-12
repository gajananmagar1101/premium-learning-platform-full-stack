package com.studentplatform.backend.controller;

import com.studentplatform.backend.security.AppUserDetails;
import com.studentplatform.backend.service.NotificationService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public Map<String, Object> getMyNotifications(@AuthenticationPrincipal AppUserDetails userDetails) {
        return Map.of("success", true, "notifications", notificationService.getMyNotifications(userDetails.getUser()));
    }

    @PutMapping("/{id}/read")
    public Map<String, Object> markRead(@PathVariable String id, @AuthenticationPrincipal AppUserDetails userDetails) {
        return Map.of("success", true, "notification", notificationService.markRead(id, userDetails.getUser()));
    }

    @PutMapping("/read-all")
    public Map<String, Object> markAllRead(@AuthenticationPrincipal AppUserDetails userDetails) {
        notificationService.markAllRead(userDetails.getUser());
        return Map.of("success", true, "message", "All notifications marked as read.");
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable String id, @AuthenticationPrincipal AppUserDetails userDetails) {
        notificationService.delete(id, userDetails.getUser());
        return Map.of("success", true, "message", "Notification deleted.");
    }
}
