package com.pomodify.backend.application.service;

import com.pomodify.backend.application.exception.InvalidJwtException;
import com.pomodify.backend.application.exception.JwtExpiredException;
import com.pomodify.backend.domain.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.function.Function;

/**
 * Service for JWT token operations: generation, validation, and claims extraction.
 */
@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    private SecretKey getSigningKey() {
        System.out.println("[DEBUG] JwtService signing secret: " + secret);
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateAccessToken(User user) {
        return Jwts.builder()
                .subject(user.getEmail().getValue())
                .claim("user", user.getId())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
                .signWith(getSigningKey(), Jwts.SIG.HS512)
                .compact();
    }

    public String generateRefreshToken(User user) {
        return Jwts.builder()
                .subject(user.getEmail().getValue())
                .claim("user", user.getId())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiration))
                .signWith(getSigningKey(), Jwts.SIG.HS512)
                .compact();
    }

    /**
     * Validate the JWT token by checking signature and expiration.
     *
     * @param token the JWT token to validate
     * @return true if valid, false otherwise
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token);
            return !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Extract the username from the JWT token.
     *
     * @param token the JWT token
     * @return the username
     */
    public String extractUserEmailFrom(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
    * Extract the user ID from the JWT token.
    */
    public Long extractUserIdFrom(String token) {
        try {
            return extractClaim(token, claims -> claims.get("user", Long.class));
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            throw new JwtExpiredException("JWT token has expired", e);
        } catch (Exception e) {
            throw new InvalidJwtException("Invalid JWT token", e);
        }
    }

    /**
     * Check if the JWT token is expired.
     *
     * @param token the JWT token
     * @return true if expired, false otherwise
     */
    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token).getPayload();
    }
}
