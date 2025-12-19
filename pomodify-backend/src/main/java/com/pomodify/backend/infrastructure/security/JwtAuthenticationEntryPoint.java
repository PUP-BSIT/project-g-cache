package com.pomodify.backend.infrastructure.security;

import com.pomodify.backend.application.exception.GlobalExceptionHandler;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;
    private final GlobalExceptionHandler handler;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        String accept = request.getHeader("Accept");
        String xRequestedWith = request.getHeader("X-Requested-With");
        boolean isApiRequest = (accept != null && accept.contains("application/json")) ||
                               (xRequestedWith != null && xRequestedWith.equalsIgnoreCase("XMLHttpRequest"));

        if (isApiRequest) {
            response.setContentType("application/json");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write(objectMapper.writeValueAsString(
                    handler.handleExpiredJwt(authException).getBody()));
        } else {
            // For browser navigation, optionally redirect to OAuth2 login page
            response.sendRedirect("/api/v2/auth/oauth2/google");
        }
    }
}
