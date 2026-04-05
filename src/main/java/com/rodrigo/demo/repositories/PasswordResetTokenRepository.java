package com.rodrigo.demo.repositories;

import com.rodrigo.demo.entities.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByToken(String token);

    boolean existsByUser_Id(Long userId);

    void deleteByUser_Id(Long userId);

    void deleteByExpiresAtBefore(Instant instant);
}
