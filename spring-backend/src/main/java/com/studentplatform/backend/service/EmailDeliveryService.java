package com.studentplatform.backend.service;

import com.studentplatform.backend.entity.PendingRegistrationEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
public class EmailDeliveryService {

    private static final Logger log = LoggerFactory.getLogger(EmailDeliveryService.class);
    private static final String SENDER_NAME = "KL U Student Learning";
    private static final String RESEND_API_URL = "https://api.resend.com/emails";

    private final JavaMailSender mailSender;
    private final RestClient restClient;
    private final String fromAddress;
    private final String resendApiKey;
    private final boolean smtpConfigured;
    private final boolean resendConfigured;

    public EmailDeliveryService(
            JavaMailSender mailSender,
            RestClient.Builder restClientBuilder,
            @Value("${EMAIL_FROM:}") String fromAddress,
            @Value("${SMTP_HOST:}") String smtpHost,
            @Value("${SMTP_USER:}") String smtpUser,
            @Value("${SMTP_PASS:}") String smtpPass,
            @Value("${RESEND_API_KEY:}") String resendApiKey
    ) {
        this.mailSender = mailSender;
        this.restClient = restClientBuilder.build();
        this.fromAddress = fromAddress == null ? "" : fromAddress.trim();
        this.resendApiKey = resendApiKey == null ? "" : resendApiKey.trim();
        this.smtpConfigured = StringUtils.hasText(smtpHost)
                && StringUtils.hasText(smtpUser)
                && StringUtils.hasText(smtpPass)
                && StringUtils.hasText(this.fromAddress);
        this.resendConfigured = StringUtils.hasText(this.resendApiKey) && StringUtils.hasText(this.fromAddress);
    }

    public void sendVerificationEmail(PendingRegistrationEntity registration, String rawOtp) {
        if (resendConfigured) {
            sendViaResend(registration, rawOtp);
            return;
        }

        if (!smtpConfigured) {
            log.info("SMTP not configured. OTP for {}: {}", registration.getEmail(), rawOtp);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress, SENDER_NAME);
            helper.setTo(registration.getEmail());
            helper.setSubject("KL U Student Learning email verification code");
            helper.setText(buildPlainText(registration, rawOtp), buildHtml(registration, rawOtp));
            mailSender.send(message);
        } catch (MailException | MessagingException | java.io.UnsupportedEncodingException ex) {
            throw new IllegalStateException("Unable to send verification email. Check SMTP configuration.", ex);
        }
    }

    private void sendViaResend(PendingRegistrationEntity registration, String rawOtp) {
        try {
            Map<String, Object> payload = Map.of(
                    "from", SENDER_NAME + " <" + fromAddress + ">",
                    "to", List.of(registration.getEmail()),
                    "subject", "KL U Student Learning email verification code",
                    "text", buildPlainText(registration, rawOtp),
                    "html", buildHtml(registration, rawOtp)
            );

            restClient.post()
                    .uri(RESEND_API_URL)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + resendApiKey)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException ex) {
            throw new IllegalStateException("Unable to send verification email using Resend. Check API key and verified sender domain.", ex);
        }
    }

    private String buildPlainText(PendingRegistrationEntity registration, String rawOtp) {
        return String.join("\n",
                "Hi " + registration.getName() + ",",
                "",
                "We received a request to create your KL U Student Learning account.",
                "Use the verification code below to finish signup:",
                "",
                "Verification code: " + rawOtp,
                "",
                "This code expires in 5 minutes.",
                "If you did not request this email, you can safely ignore it.",
                "",
                "KL U Student Learning"
        );
    }

    private String buildHtml(PendingRegistrationEntity registration, String rawOtp) {
        String safeName = escapeHtml(registration.getName());
        String safeOtp = escapeHtml(rawOtp);
        return """
                <!doctype html>
                <html lang="en">
                  <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  </head>
                  <body style="margin:0;padding:0;background-color:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;background-color:#f3f6fb;margin:0;padding:0;">
                      <tr>
                        <td align="center" style="padding:12px 6px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:460px;border-collapse:separate;border-spacing:0;background-color:#ffffff;border:1px solid #dbe5f0;border-radius:20px;overflow:hidden;">
                            <tr>
                              <td style="padding:20px 16px;background:#0f4c81;background-image:linear-gradient(135deg,#0f4c81 0%,#0b7a75 100%);color:#ffffff;">
                                <div style="font-size:11px;line-height:16px;letter-spacing:1.6px;text-transform:uppercase;opacity:0.88;">KL U Student Learning</div>
                                <div style="margin-top:10px;font-size:18px;line-height:24px;font-weight:700;word-break:break-word;">Verify your email address</div>
                                <div style="margin-top:10px;font-size:14px;line-height:22px;max-width:360px;opacity:0.95;">
                                  Finish creating your learner account with the one-time verification code below.
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:22px 16px 16px;">
                                <div style="margin:0 0 14px;font-size:15px;line-height:24px;">Hi __NAME__,</div>
                                <div style="margin:0 0 16px;font-size:14px;line-height:24px;color:#334155;">
                                  We received a signup request for your KL U Student Learning account. Use this verification code to continue.
                                </div>
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:18px 0;border-collapse:separate;border-spacing:0;border:1px solid #cbd5e1;border-radius:16px;background-color:#f8fafc;">
                                  <tr>
                                    <td align="center" style="padding:18px 10px;">
                                      <div style="font-size:11px;line-height:16px;letter-spacing:1.6px;text-transform:uppercase;color:#64748b;">Verification code</div>
                                      <div style="margin-top:12px;font-size:28px;line-height:32px;font-weight:700;letter-spacing:5px;color:#0f172a;white-space:nowrap;">__OTP__</div>
                                      <div style="margin-top:12px;font-size:13px;line-height:20px;color:#475569;">Valid for 5 minutes</div>
                                    </td>
                                  </tr>
                                </table>
                                <div style="padding:14px 12px;border-radius:14px;background-color:#eef6ff;border:1px solid #bfdbfe;color:#1e3a8a;font-size:13px;line-height:22px;">
                                  Enter this code on the verification screen to activate your account.
                                </div>
                                <div style="margin-top:18px;font-size:13px;line-height:22px;color:#64748b;">
                                  If you did not request this email, you can safely ignore it. No account will be created unless this code is verified.
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:14px 16px;border-top:1px solid #e2e8f0;background-color:#f8fafc;font-size:11px;line-height:18px;color:#64748b;">
                                Sent by KL U Student Learning for secure email verification.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """
                .replace("__NAME__", safeName)
                .replace("__OTP__", safeOtp);
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
