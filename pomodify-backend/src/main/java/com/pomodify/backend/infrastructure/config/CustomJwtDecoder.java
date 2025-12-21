package com.pomodify.backend.infrastructure.config;

import com.pomodify.backend.domain.repository.RevokedTokenRepository;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;

/**
 * Custom JWT decoder that validates tokens and checks for revocation.
 */
@Component
@RequiredArgsConstructor
public class CustomJwtDecoder implements JwtDecoder {

    private final RevokedTokenRepository revokedTokenRepository;

    @Value("${jwt.secret}")
    private String jwtSecret;

    private JwtDecoder getNimbusDecoder() {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
        return NimbusJwtDecoder
                .withSecretKey(key)
                .macAlgorithm(MacAlgorithm.valueOf("HS512"))
                .build();
    }

    @Override
    public Jwt decode(String token) throws JwtException {
        try {
            System.out.println("[CustomJwtDecoder] Attempting to decode token: " + token.substring(0, Math.min(50, token.length())) + "...");
            // First, decode with Nimbus to validate signature and expiration
            Jwt jwt = getNimbusDecoder().decode(token);
            System.out.println("[CustomJwtDecoder] Token decoded successfully, subject: " + jwt.getSubject());

            // Then, check if the token is revoked
            if (revokedTokenRepository.existsByToken(token)) {
                throw new JwtException("Token has been revoked");
            }
            System.out.println("[CustomJwtDecoder] Token is not revoked, returning JWT");

            return jwt;
        } catch (JwtException e) {
            System.out.println("[CustomJwtDecoder] JWT Exception: " + e.getMessage());
            throw e;
        } catch (Exception e) {
            System.out.println("[CustomJwtDecoder] Unexpected Exception: " + e.getMessage());
            e.printStackTrace();
            throw new JwtException("Failed to decode JWT: " + e.getMessage(), e);
        }
    }
}
