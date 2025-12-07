package com.pomodify.backend.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.util.pattern.PathPatternParser;

@Configuration
public class ApiPathPrefixConfig implements WebMvcConfigurer {

    @Value("${api.version:v1}")
    private String apiVersion;

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer.setPatternParser(new PathPatternParser());

        String apiBasePath = "/api/" + apiVersion;

        configurer.addPathPrefix(apiBasePath, handlerType ->
                handlerType.getPackageName().startsWith("com.pomodify.backend.presentation.controller"));
    }
}
