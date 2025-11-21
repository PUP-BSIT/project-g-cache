package com.pomodify.backend.infrastructure.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

@Component
public class JwtExceptionHandlerFilter extends OncePerRequestFilter implements  Ordered {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            filterChain.doFilter(request, response);
        } catch (JwtException ex) {
            response.reset();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");

            String msg = ex.getMessage();
            if (msg.contains(":")) {
                msg = msg.substring(msg.indexOf(":") + 2);
            }
            Map<String, String> body = Map.of(
                    "message", msg
            );
            response.getWriter().write(objectMapper.writeValueAsString(body));
        }
    }
}
