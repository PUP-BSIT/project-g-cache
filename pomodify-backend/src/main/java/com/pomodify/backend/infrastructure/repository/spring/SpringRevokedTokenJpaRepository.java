package com.pomodify.backend.infrastructure.repository.spring;

import com.pomodify.backend.domain.model.RevokedToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA repository for RevokedToken entity.
 */
@Repository
public interface SpringRevokedTokenJpaRepository extends JpaRepository<RevokedToken, Long> {

    /**
     * Check if a token is revoked.
     *
     * @param token the JWT token
     * @return true if revoked, false otherwise
     */
    boolean existsByToken(String token);

    /**
     * Find a revoked token by token string.
     *
     * @param token the JWT token
     * @return Optional of RevokedToken
     */
    Optional<RevokedToken> findByToken(String token);
}
