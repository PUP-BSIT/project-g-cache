package com.pomodify.backend.infrastructure.security;

import com.pomodify.backend.application.service.CustomOAuth2UserService;
import com.pomodify.backend.infrastructure.config.CustomJwtDecoder;
import com.pomodify.backend.infrastructure.security.OAuth2AuthenticationSuccessHandler;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final CustomJwtDecoder customJwtDecoder;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;

    // ============================
    // TEST PROFILE (with JWT processing for testing)
    // ============================
    @Bean
    @Profile("test")
    public SecurityFilterChain securityFilterChainTest(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/auth/register", 
                                "/auth/login", 
                                "/auth/refresh", 
                                "/auth/verify",
                                "/api/v2/auth/register",
                                "/api/v2/auth/login",
                                "/api/v2/auth/refresh",
                                "/api/v2/auth/verify",
                                "/actuator/**"
                        )
                        .permitAll()
                        .anyRequest().authenticated()  // Require authentication for all other endpoints
                )
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                // Register JwtCookieToAuthHeaderFilter before BearerTokenAuthenticationFilter for cookie-based auth
                .addFilterBefore(new JwtCookieToAuthHeaderFilter(), BearerTokenAuthenticationFilter.class)
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .decoder(customJwtDecoder)
                                .jwtAuthenticationConverter(jwtAuthenticationConverter())
                        )
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                );

        return http.build();
    }

    // ============================
    // DEFAULT / DEV PROFILE (no auth) - Used when no profile or "dev" profile is active
    // ============================
    @Bean
    @Profile({"dev", "default"})
    public SecurityFilterChain securityFilterChainDev(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                );

        return http.build();
    }

    // ============================
    // PROD PROFILE (with auth)
    // ============================
        @Bean
        @Profile("prod")
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                        .csrf(AbstractHttpConfigurer::disable)
                        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                        .authorizeHttpRequests(auth -> auth
                                .requestMatchers(
                                        "/api/v2/auth/register",
                                        "/api/v2/auth/login",
                                        "/api/v2/auth/refresh",
                                        "/api/v2/auth/verify",
                                        "/actuator/health",
                                        "/actuator/info",
                                        "/v3/api-docs/**",
                                        "/swagger-ui.html",
                                        "/swagger-ui/**"
                                ).permitAll()
                                .requestMatchers("/api/v2/auth/oauth2/google").permitAll()
                                .anyRequest().authenticated()
                        )
                        .sessionManagement(session ->
                                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                        )
                        // Register JwtCookieToAuthHeaderFilter before BearerTokenAuthenticationFilter
                        .addFilterBefore(new JwtCookieToAuthHeaderFilter(), BearerTokenAuthenticationFilter.class)
                        .oauth2Login(oauth2 -> oauth2
                                .loginPage("/api/v2/auth/oauth2/google")
                                .userInfoEndpoint(userInfo -> userInfo
                                        .userService(customOAuth2UserService)
                                )
                                .successHandler(oAuth2AuthenticationSuccessHandler)
                        );

                http.logout(AbstractHttpConfigurer::disable);

                http.oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .decoder(customJwtDecoder)
                                .jwtAuthenticationConverter(jwtAuthenticationConverter())
                        )
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                );

                return http.build();
        }

        // ============================
        // JWT Converter
        // ============================
        private JwtAuthenticationConverter jwtAuthenticationConverter() {
                JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
                // Use 'sub' (email) as the principal name for authentication
                converter.setPrincipalClaimName("sub");
                // Don't require authorities/scopes - just validate the JWT subject
                converter.setJwtGrantedAuthoritiesConverter(jwt -> List.of());
                return converter;
        }

    // ============================
    // GLOBAL CORS CONFIGURATION
    // ============================
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Explicitly allow frontend dev and prod origins for credentials
        config.setAllowedOrigins(List.of(
                "http://localhost:4200",
                "https://pomodify.site"
        ));
        config.setAllowCredentials(true);
        config.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));
        config.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type"
        ));
        config.setExposedHeaders(List.of("Authorization"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
