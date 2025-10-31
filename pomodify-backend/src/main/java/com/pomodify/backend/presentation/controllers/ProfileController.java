package com.pomodify.backend.presentation.controllers;


import com.pomodify.backend.application.dto.request.ProfileRequest;
import com.pomodify.backend.application.dto.response.ApiResponse;
import com.pomodify.backend.application.dto.response.ProfileResponse;
import com.pomodify.backend.application.services.ProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/profile")
public class ProfileController {
    ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @PostMapping("/delete")
    public ResponseEntity<ApiResponse<ProfileResponse>> deleteProfile(@RequestBody @Valid ProfileRequest request) {
        ProfileResponse profileResponse = profileService.deleteProfile(request);
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success("User profile deleted successfully", profileResponse));
    }
}
