package com.pomodify.backend.infrastructure.security;

import com.pomodify.backend.application.service.CustomOAuth2UserService;
import com.pomodify.backend.infrastructure.config.CustomJwtDecoder;
import com.pomodify.backend.infrastructure.security.OAuth2AuthenticationSuccessHandler;

import org.springframework.beans.factory.annotation.Autowired;
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
public class SecurityConfig {

    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final CustomJwtDecoder customJwtDecoder;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;

    public SecurityConfig(
            @Autowired(required = false) JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint,
            @Autowired(required = false) CustomJwtDecoder customJwtDecoder,
            @Autowired(required = false) CustomOAuth2UserService customOAuth2UserService,
            @Autowired(required = false) OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler) {
        this.jwtAuthenticationEntryPoint = jwtAuthenticationEntryPoint;
        this.customJwtDecoder = customJwtDecoder;
        this.customOAuth2UserService = customOAuth2UserService;
        this.oAuth2AuthenticationSuccessHandler = oAuth2AuthenticationSuccessHandler;
    }

    // ============================
    // TEST PROFILE (with JWT processing for testing)
    // ============================
    @Bean
    @Profile("test")
    public SecurityFilterChain securityFilterChainTest(HttpSecurity http) throws Exception {
        System.out.println("[SecurityConfig] Building TEST security filter chain");
        System.out.println("[SecurityConfig] customJwtDecoder is: " + (customJwtDecoder != null ? "available" : "NULL"));
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/register", "/auth/login", "/auth/refresh", "/auth/verify", "/auth/forgot-password", "/auth/reset-password", "/actuator/**")
                        .permitAll()
                        .anyRequest().authenticated()  // Require authentication for all other endpoints
                )
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                // Add JwtCookieToAuthHeaderFilter for test profile too
                .addFilterBefore(new JwtCookieToAuthHeaderFilter(), BearerTokenAuthenticationFilter.class)
                .oauth2ResourceServer(oauth2 -> {
                    System.out.println("[SecurityConfig] Configuring oauth2ResourceServer with customJwtDecoder: " + customJwtDecoder);
                    oauth2.jwt(jwt -> jwt
                            .decoder(customJwtDecoder)
                            .jwtAuthenticationConverter(jwtAuthenticationConverter())
                    );
                    if (jwtAuthenticationEntryPoint != null) {
                        oauth2.authenticationEntryPoint(jwtAuthenticationEntryPoint);
                    }
                });

        return http.build();
    }

    // ============================
    // DEV PROFILE (no auth)
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
                                        "/api/v2/auth/resend-verification",
                                        "/api/v2/auth/forgot-password",
                                        "/api/v2/auth/reset-password",
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
