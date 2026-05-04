package com.studentplatform.backend.service;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;

@Service
public class EmailVerificationTokenService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final long TTL_SECONDS = 60L * 5L;

    public VerificationToken createToken() {
        int otp = 100000 + SECURE_RANDOM.nextInt(900000);
        String rawToken = Integer.toString(otp);
        return new VerificationToken(rawToken, hash(rawToken), Instant.now().plusSeconds(TTL_SECONDS));
    }

    public String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(token.trim().getBytes(StandardCharsets.UTF_8));
            return toHex(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available.", ex);
        }
    }

    private String toHex(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            builder.append(String.format("%02x", value));
        }
        return builder.toString();
    }

    public record VerificationToken(
            String rawToken,
            String tokenHash,
            Instant expiresAt
    ) {
    }
}
