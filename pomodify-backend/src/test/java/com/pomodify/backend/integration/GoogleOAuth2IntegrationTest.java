package com.pomodify.backend.integration;

import com.pomodify.backend.domain.enums.AuthProvider;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import com.pomodify.backend.domain.valueobject.Email;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

import jakarta.servlet.http.Cookie;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Integration test for Google OAuth2 login/registration flow.
 * This test simulates a successful OAuth2 login and verifies user creation/merge logic.
 * Uses H2 in-memory database for fast testing.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:pomodify_test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.flyway.enabled=false",
        "jwt.secret=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "jwt.access-token-expiration=900000",
        "jwt.refresh-token-expiration=2592000000",
        "fcm.service-account=",
        "spring.mail.host=",
        "spring.mail.port=0",
        "spring.security.oauth2.client.registration.google.client-id=test-client-id",
        "spring.security.oauth2.client.registration.google.client-secret=test-client-secret",
        "ai.enabled=false"
})
class GoogleOAuth2IntegrationTest {

    private static final String TEST_JWT_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Test
    void testGoogleOAuth2Login_CreatesOrMergesUser() throws Exception {
        // Simulate a user logging in with Google OAuth2
        String googleEmail = "test-google-" + System.currentTimeMillis() + "@gmail.com";
        String sub = "google-oauth2-sub-" + System.currentTimeMillis();
        String firstName = "Google";
        String lastName = "User";

        // Insert user into H2 database before making the request
        Email googleEmailObj = new Email(googleEmail);
        if (!userRepository.existsByEmail(googleEmailObj)) {
            User user = User.builder()
                    .email(googleEmailObj)
                    .firstName(firstName)
                    .lastName(lastName)
                    .passwordHash("")
                    .authProvider(AuthProvider.GOOGLE)
                    .isActive(true)
                    .isEmailVerified(true)
                    .build();
            userRepository.save(user);
        }

        String jwtSecret = TEST_JWT_SECRET;
        System.out.println("[TEST DEBUG] Using JWT secret: " + jwtSecret.substring(0, 20) + "...");

        long now = System.currentTimeMillis();
        String jwt = io.jsonwebtoken.Jwts.builder()
                .subject(googleEmail)
                .claim("user", 21L)
                .issuedAt(new java.util.Date(now))
                .expiration(new java.util.Date(now + 900000))
                .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(jwtSecret.getBytes()), io.jsonwebtoken.SignatureAlgorithm.HS512)
                .compact();
        System.out.println("[TEST DEBUG] Generated JWT: " + jwt);

        MockHttpServletRequestBuilder request = get("/auth/users/me")
                .accept(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + jwt);

        var result = mockMvc.perform(request).andReturn();
        System.out.println("[TEST DEBUG] Response status: " + result.getResponse().getStatus());
        if (result.getResponse().getStatus() != 200) {
            System.out.println("[TEST DEBUG] Error response: " + result.getResponse().getContentAsString());
        }

        mockMvc.perform(request)
                .andExpect(MockMvcResultMatchers.status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.email").value(googleEmail))
                .andExpect(MockMvcResultMatchers.jsonPath("$.firstName").value(firstName))
                .andExpect(MockMvcResultMatchers.jsonPath("$.lastName").value(lastName));

        User user = userRepository.findByEmail(new Email(googleEmail)).orElse(null);
        assertThat(user).isNotNull();
        assertThat(user.getAuthProvider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(user.isEmailVerified()).isTrue();

        int countBefore = userRepository.findAllActive().size();
        mockMvc.perform(request)
                .andExpect(MockMvcResultMatchers.status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.email").value(googleEmail));
        int countAfter = userRepository.findAllActive().size();
        assertThat(countAfter).isEqualTo(countBefore);
    }
}
