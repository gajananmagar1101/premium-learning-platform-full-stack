package com.studentplatform.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class StudentPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(StudentPlatformApplication.class, args);
    }
}
