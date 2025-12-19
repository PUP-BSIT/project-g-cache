package com.pomodify.backend.infrastructure.security;

import com.pomodify.backend.application.service.JwtService;
import com.pomodify.backend.domain.model.User;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private final JwtService jwtService;
    // Remove UserRepository dependency here - we don't need it anymore!

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        try {
            log.info("OAuth2 Success Handler called.");
            CustomOAuth2User oauthUser = (CustomOAuth2User) authentication.getPrincipal();
            log.info("CustomOAuth2User principal: {}", oauthUser);
            User user = oauthUser.getBackendUser();
            log.info("Backend user: {}", user);
            if (user == null) {
                log.error("OAuth2 Success Handler: backend user is null!");
            }
            String accessToken = jwtService.generateAccessToken(user);
            String refreshToken = jwtService.generateRefreshToken(user);
            log.info("Generated accessToken: {}", accessToken);
            log.info("Generated refreshToken: {}", refreshToken);

            // Set cookies manually with correct attributes and expires format
            boolean isSecure = request.isSecure();
            String accessTokenCookie = String.format(
                 "accessToken=%s; Path=/; HttpOnly; SameSite=Strict; Max-Age=%d; Expires=%s; Secure=%s",
                accessToken,
                60 * 60,
                java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME.format(java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC).plusSeconds(60 * 60)),
                isSecure ? "true" : "false"
            );
            String refreshTokenCookie = String.format(
                 "refreshToken=%s; Path=/; HttpOnly; SameSite=Strict; Max-Age=%d; Expires=%s; Secure=%s",
                refreshToken,
                7 * 24 * 60 * 60,
                java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME.format(java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC).plusSeconds(7 * 24 * 60 * 60)),
                isSecure ? "true" : "false"
            );
            response.setHeader("Set-Cookie", accessTokenCookie);
            response.addHeader("Set-Cookie", refreshTokenCookie);
            log.info("Set-Cookie header for accessToken: {}", accessTokenCookie);
            log.info("Set-Cookie header for refreshToken: {}", refreshTokenCookie);

            // Respond with 200 OK and JS redirect
            String targetUrl = "https://pomodify.site/oauth2/redirect";
            response.setContentType("text/html;charset=UTF-8");
            response.setStatus(HttpServletResponse.SC_OK);
            String html = "<html><head><script>window.location.replace('" + targetUrl + "');</script></head><body>Redirecting...</body></html>";
            response.getWriter().write(html);
            response.getWriter().flush();
        } catch (Exception e) {
            log.error("OAuth2 authentication success handler error", e);
            response.setContentType("text/html;charset=UTF-8");
            response.setStatus(HttpServletResponse.SC_OK);
            String html = "<html><head><script>window.location.replace('https://pomodify.site/login?error=" + e.getMessage() + "');</script></head><body>Redirecting...</body></html>";
            response.getWriter().write(html);
            response.getWriter().flush();
        }
    }
}