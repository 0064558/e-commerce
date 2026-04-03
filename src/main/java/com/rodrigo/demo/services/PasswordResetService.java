package com.rodrigo.demo.services;

import com.rodrigo.demo.entities.PasswordResetToken;
import com.rodrigo.demo.entities.User;
import com.rodrigo.demo.repositories.PasswordResetTokenRepository;
import com.rodrigo.demo.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

@Service
public class PasswordResetService {

    private static final Logger logger = LoggerFactory.getLogger(PasswordResetService.class);

    private final SecureRandom secureRandom = new SecureRandom();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${auth.password-reset.token-minutes:30}")
    private long tokenMinutes;

    @Value("${auth.password-reset.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${auth.password-reset.log-token:false}")
    private boolean logToken;

    @Value("${auth.password-reset.require-email:true}")
    private boolean requireEmailDelivery;

    @Value("${auth.password-reset.mail-from:}")
    private String mailFrom;

    @Value("${spring.mail.host:}")
    private String smtpHost;

    @Transactional
    public void requestReset(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalStateException("E-mail obrigatorio.");
        }

        String normalizedEmail = email.trim().toLowerCase();
        User user = userRepository.findUserByEmailIgnoreCase(normalizedEmail).orElse(null);

        // Sempre retorna sucesso para nao vazar se o e-mail existe.
        if (user == null) {
            return;
        }

        Instant now = Instant.now();
        tokenRepository.deleteByUser_Id(user.getId());
        tokenRepository.deleteByExpiresAtBefore(now);

        String rawToken = generateToken();
        PasswordResetToken token = new PasswordResetToken(
                null,
                rawToken,
                user,
                now,
                now.plusSeconds(Math.max(5, tokenMinutes) * 60),
                null
        );
        tokenRepository.save(token);

        sendResetInstructions(user, rawToken);
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        if (token == null || token.isBlank()) {
            throw new IllegalStateException("Token obrigatorio.");
        }
        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalStateException("Nova senha obrigatoria.");
        }

        PasswordResetToken resetToken = tokenRepository.findByToken(token.trim())
                .orElseThrow(() -> new IllegalStateException("Token invalido ou expirado."));

        Instant now = Instant.now();
        if (resetToken.getUsedAt() != null || resetToken.getExpiresAt() == null || resetToken.getExpiresAt().isBefore(now)) {
            throw new IllegalStateException("Token invalido ou expirado.");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsedAt(now);
        tokenRepository.save(resetToken);
        tokenRepository.deleteByUser_Id(user.getId());
    }

    private String generateToken() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    private void sendResetInstructions(User user, String token) {
        validateMailConfiguration();

        String resetLink = buildResetLink(token);
        String subject = "Recuperacao de senha - Nexus Store";
        String body = "Voce solicitou a recuperacao de senha.\n\n"
            + "Clique no link abaixo para redefinir sua senha:\n"
                + resetLink
                + "\n\n"
            + "Esse link expira em " + Math.max(5, tokenMinutes) + " minutos.\n\n"
                + "Se nao foi voce, ignore este e-mail.";

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(user.getEmail());
            if (mailFrom != null && !mailFrom.isBlank()) {
                message.setFrom(mailFrom);
            }
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            logger.info("E-mail de recuperacao enviado para {}", user.getEmail());
            return;
        } catch (Exception ex) {
            logger.warn("Falha ao enviar e-mail de recuperacao para {}: {}", user.getEmail(), ex.getMessage());
            if (requireEmailDelivery) {
                throw new IllegalStateException("Falha ao enviar e-mail de recuperacao. Verifique as configuracoes SMTP.");
            }
        }

        if (logToken) {
            logger.info("[DEV] Token de recuperacao para {}: {}", user.getEmail(), token);
            logger.info("[DEV] Link de recuperacao: {}", resetLink);
        }
    }

    private void validateMailConfiguration() {
        if (mailSender == null) {
            if (requireEmailDelivery) {
                throw new IllegalStateException("Envio de e-mail nao configurado. Configure SMTP para recuperar senha.");
            }
            return;
        }

        if (smtpHost == null || smtpHost.isBlank()) {
            if (requireEmailDelivery) {
                throw new IllegalStateException("SMTP_HOST nao configurado. Configure SMTP para recuperar senha.");
            }
            return;
        }

        if ((mailFrom == null || mailFrom.isBlank()) && requireEmailDelivery) {
            throw new IllegalStateException("AUTH_PASSWORD_RESET_MAIL_FROM nao configurado.");
        }
    }

    private String buildResetLink(String token) {
        String base = frontendUrl == null ? "http://localhost:3000" : frontendUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }

        return base + "/?resetToken=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
    }
}
