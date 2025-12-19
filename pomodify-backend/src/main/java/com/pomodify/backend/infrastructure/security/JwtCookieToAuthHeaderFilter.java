package com.pomodify.backend.infrastructure.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import jakarta.servlet.http.HttpServletRequestWrapper;

/**
 * Filter that extracts accessToken from cookies and sets it as Authorization header if missing.
 */
public class JwtCookieToAuthHeaderFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || authHeader.isEmpty()) {
            if (request.getCookies() != null) {
                for (Cookie cookie : request.getCookies()) {
                    if ("accessToken".equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isEmpty()) {
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
                        filterChain.doFilter((jakarta.servlet.ServletRequest) wrapped, (jakarta.servlet.ServletResponse) response);
                        return;
                    }
                }
            }
        }
        filterChain.doFilter(request, response);
    }
}
