package com.pomodify.backend.infrastructure.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SkipJwtRequestFilter extends OncePerRequestFilter {
    private static final Logger logger = LoggerFactory.getLogger(SkipJwtRequestFilter.class);
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String uri = request.getRequestURI();
        logger.info("[SkipJwtRequestFilter] Checking URI: {}", uri);
        if ("/api/v2/auth/refresh".equals(uri)) {
            logger.info("[SkipJwtRequestFilter] Skipping JWT filter for: {}", uri);
        }
        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String uri = request.getRequestURI();
        boolean shouldSkip = "/api/v2/auth/refresh".equals(uri);
        logger.info("[SkipJwtRequestFilter] shouldNotFilter for URI {}: {}", uri, shouldSkip);
        return shouldSkip;
    }
}
