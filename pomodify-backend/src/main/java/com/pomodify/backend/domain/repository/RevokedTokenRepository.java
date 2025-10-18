package com.pomodify.backend.domain.repository;

import com.pomodify.backend.domain.model.RevokedToken;

import java.util.Optional;

/**
 * Repository for RevokedToken entity.
 */
public interface RevokedTokenRepository {

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

    /**
     * Save a revoked token.
     *
     * @param revokedToken the revoked token to save
     * @return the saved revoked token
     */
    RevokedToken save(RevokedToken revokedToken);
}
