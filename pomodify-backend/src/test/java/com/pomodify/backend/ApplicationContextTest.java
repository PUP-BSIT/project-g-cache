package com.pomodify.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("h2")
class ApplicationContextTest {

    @Test
    void contextLoads_withTestProfileAndH2() {
        // Smoke test: verifies Spring context boots with H2
    }
}
