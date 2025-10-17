package com.pomodify.backend.infrastructure.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

/**
 * Configuration to load environment variables from .env file.
 * This loads BEFORE Spring properties are resolved.
 */
public class DotenvConfig implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        ConfigurableEnvironment environment = applicationContext.getEnvironment();

        try {
            Dotenv dotenv = Dotenv.configure()
                    .ignoreIfMissing()
                    .load();

            Map<String, Object> dotenvProperties = new HashMap<>();
            dotenv.entries().forEach(entry -> dotenvProperties.put(entry.getKey(), entry.getValue()));

            environment.getPropertySources()
                    .addFirst(new MapPropertySource("dotenvProperties", dotenvProperties));

        } catch (Exception e) {
            // .env file not found or error loading - continue without it
            System.out.println("Warning: Could not load .env file: " + e.getMessage());
        }
    }
}
