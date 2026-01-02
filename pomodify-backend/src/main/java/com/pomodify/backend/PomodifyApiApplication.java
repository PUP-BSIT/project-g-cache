package com.pomodify.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableCaching
@EnableAsync
public class PomodifyApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(PomodifyApiApplication.class, args);
	}

}
