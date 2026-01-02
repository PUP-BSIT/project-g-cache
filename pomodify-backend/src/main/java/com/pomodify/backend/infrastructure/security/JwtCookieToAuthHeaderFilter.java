package com.pomodify.backend.infrastructure.security;


import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import jakarta.servlet.http.HttpServletRequestWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Filter that extracts accessToken from cookies and sets it as Authorization header if missing.
 */
public class JwtCookieToAuthHeaderFilter extends OncePerRequestFilter {
    private static final Logger logger = LoggerFactory.getLogger(JwtCookieToAuthHeaderFilter.class);
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String uri = request.getRequestURI();
        
        // Skip filter for refresh endpoint to avoid validating expired access tokens
        if (uri.contains("/auth/refresh")) {
            logger.info("[JwtCookieToAuthHeaderFilter] Skipping filter for refresh endpoint: {}", uri);
            filterChain.doFilter(request, response);
            return;
        }

        logger.info("[JwtCookieToAuthHeaderFilter] (EARLY) {} {}", request.getMethod(), request.getRequestURI());
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || authHeader.isEmpty()) {
            if (request.getCookies() != null) {
                for (Cookie cookie : request.getCookies()) {
                    if ("accessToken".equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isEmpty()) {
                        logger.info("[JwtCookieToAuthHeaderFilter] Found accessToken cookie for URI: {}", uri);
                        // Wrap the request to add the Authorization header
                        HttpServletRequestWrapper wrapped = new HttpServletRequestWrapper(request) {
                            @Override
                            public String getHeader(String name) {
                                if ("Authorization".equalsIgnoreCase(name)) {
                                    return "Bearer " + cookie.getValue();
                                }
                                return super.getHeader(name);
                            }
                        };
                        logger.info("[JwtCookieToAuthHeaderFilter] Setting Authorization header for URI: {}", uri);
                        filterChain.doFilter((jakarta.servlet.ServletRequest) wrapped, (jakarta.servlet.ServletResponse) response);
                        return;
                    }
                }
                if (!uri.contains("/auth/verify")) {
                    logger.info("[JwtCookieToAuthHeaderFilter] No accessToken cookie found for URI: {}", uri);
                }
            } else {
                logger.info("[JwtCookieToAuthHeaderFilter] No cookies present for URI: {}", uri);
            }
        } else {
            logger.info("[JwtCookieToAuthHeaderFilter] Authorization header already present for URI: {}", uri);
        }
        filterChain.doFilter(request, response);
    }
}
