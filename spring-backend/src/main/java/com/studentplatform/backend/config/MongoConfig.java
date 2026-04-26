package com.studentplatform.backend.config;

import com.studentplatform.backend.entity.AssessmentStatus;
import com.studentplatform.backend.entity.Role;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.data.convert.WritingConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

import java.util.List;

@Configuration
public class MongoConfig {

    @Bean
    MongoCustomConversions mongoCustomConversions() {
        return new MongoCustomConversions(List.of(
                new StringToRoleConverter(),
                new RoleToStringConverter(),
                new StringToAssessmentStatusConverter(),
                new AssessmentStatusToStringConverter()
        ));
    }

    @ReadingConverter
    static class StringToRoleConverter implements Converter<String, Role> {
        @Override
        public Role convert(String source) {
            return Role.fromValue(source);
        }
    }

    @WritingConverter
    static class RoleToStringConverter implements Converter<Role, String> {
        @Override
        public String convert(Role source) {
            return source == null ? null : source.name().toLowerCase();
        }
    }

    @ReadingConverter
    static class StringToAssessmentStatusConverter implements Converter<String, AssessmentStatus> {
        @Override
        public AssessmentStatus convert(String source) {
            return AssessmentStatus.fromValue(source);
        }
    }

    @WritingConverter
    static class AssessmentStatusToStringConverter implements Converter<AssessmentStatus, String> {
        @Override
        public String convert(AssessmentStatus source) {
            return source == null ? null : source.name().toLowerCase();
        }
    }
}
