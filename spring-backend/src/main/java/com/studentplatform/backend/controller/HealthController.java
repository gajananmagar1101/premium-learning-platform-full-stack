package com.studentplatform.backend.controller;

import com.studentplatform.backend.util.BrowserPageRenderer;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
public class HealthController {

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @GetMapping(value = "/", produces = { MediaType.TEXT_HTML_VALUE, MediaType.APPLICATION_JSON_VALUE })
    public ResponseEntity<?> home(HttpServletRequest request) {
        if (BrowserPageRenderer.wantsHtml(request)) {
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(BrowserPageRenderer.buildPage(
                            "Student Learning Platform API",
                            "Backend Online",
                            "The deployed Spring backend is running successfully. Use the frontend app to sign in, manage learners, and work with the full platform experience.",
                            "Developer endpoint available: /api/health",
                            frontendUrl,
                            200
                    ));
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Student Learning Platform API is live",
                "timestamp", Instant.now().toString()
        ));
    }

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        return Map.of("status", "ok", "timestamp", Instant.now().toString());
    }
}
