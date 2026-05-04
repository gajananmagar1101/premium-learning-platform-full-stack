package com.studentplatform.backend.util;

import java.util.Set;
import java.util.regex.Pattern;

public final class EmailAddressValidator {

    private static final Set<String> RESERVED_EMAIL_DOMAINS = Set.of(
            "example.com",
            "example.org",
            "example.net",
            "test.com",
            "fake.com",
            "invalid.com",
            "mailinator.com",
            "guerrillamail.com",
            "tempmail.com",
            "yopmail.com",
            "sharklasers.com",
            "10minutemail.com"
    );

    private static final Set<String> PLACEHOLDER_EMAIL_LOCALS = Set.of(
            "test",
            "testing",
            "fake",
            "demo",
            "sample",
            "asdf",
            "qwerty",
            "abc",
            "temp",
            "user",
            "username",
            "unknown",
            "none",
            "na"
    );

    private static final Pattern LOCAL_PART_PATTERN = Pattern.compile("^[a-z0-9._%+-]+$", Pattern.CASE_INSENSITIVE);
    private static final Pattern DOMAIN_PATTERN = Pattern.compile("^[a-z0-9.-]+$", Pattern.CASE_INSENSITIVE);
    private static final Pattern TLD_PATTERN = Pattern.compile("^[a-z]{2,24}$", Pattern.CASE_INSENSITIVE);

    private EmailAddressValidator() {
    }

    public static boolean isRealistic(String email) {
        String normalized = email == null ? "" : email.trim().toLowerCase();
        if (normalized.isBlank() || normalized.length() > 254 || normalized.chars().anyMatch(Character::isWhitespace)) {
            return false;
        }

        String[] parts = normalized.split("@", -1);
        if (parts.length != 2) {
            return false;
        }

        String localPart = parts[0];
        String domain = parts[1];
        if (localPart.isBlank() || domain.isBlank() || localPart.length() > 64) {
            return false;
        }
        if (localPart.startsWith(".") || localPart.endsWith(".") || localPart.contains("..")) {
            return false;
        }
        if (!LOCAL_PART_PATTERN.matcher(localPart).matches()) {
            return false;
        }

        if (domain.length() > 253 || !domain.contains(".") || domain.contains("..")) {
            return false;
        }
        if (!DOMAIN_PATTERN.matcher(domain).matches()) {
            return false;
        }

        String[] labels = domain.split("\\.");
        for (String label : labels) {
            if (label.isBlank() || label.startsWith("-") || label.endsWith("-") || label.length() > 63) {
                return false;
            }
        }

        String tld = labels[labels.length - 1];
        if (!TLD_PATTERN.matcher(tld).matches()) {
            return false;
        }

        return !RESERVED_EMAIL_DOMAINS.contains(domain) && !PLACEHOLDER_EMAIL_LOCALS.contains(localPart);
    }
}
