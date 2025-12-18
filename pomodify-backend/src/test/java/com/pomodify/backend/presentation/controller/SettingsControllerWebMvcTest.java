package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.service.SettingsService;
import com.pomodify.backend.presentation.dto.settings.UpdateSettingsRequest;
import com.pomodify.backend.presentation.dto.settings.UserSettingsResponse;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@WebMvcTest(controllers = SettingsController.class)
class SettingsControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SettingsService settingsService;

    @Test
    void getSettings_returnsDefaults() throws Exception {
        Long userId = 100L;
        UserSettingsResponse resp = new UserSettingsResponse(
                userId,
                "BELL",
                true,
                70,
                false,
                false,
                "SYSTEM",
                true
        );
        Mockito.when(settingsService.getSettings(userId)).thenReturn(resp);

        MockHttpServletRequestBuilder req = get("/settings")
                .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.claim("user", userId)));

        mockMvc.perform(req)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(userId))
                .andExpect(jsonPath("$.soundType").value("BELL"))
                .andExpect(jsonPath("$.volume").value(70));
    }

    @Test
    void patchSettings_partialUpdate() throws Exception {
        Long userId = 101L;
        UserSettingsResponse resp = new UserSettingsResponse(
                userId,
                "SOFT_DING",
                true,
                50,
                true,
                true,
                "DARK",
                true
        );
        Mockito.when(settingsService.updateSettings(Mockito.eq(userId), Mockito.any(UpdateSettingsRequest.class)))
                .thenReturn(resp);

        MockHttpServletRequestBuilder req = patch("/settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"volume\":50,\"theme\":\"DARK\",\"soundType\":\"SOFT_DING\"}")
                .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.claim("user", userId)));

        mockMvc.perform(req)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(userId))
                .andExpect(jsonPath("$.volume").value(50))
                .andExpect(jsonPath("$.theme").value("DARK"))
                .andExpect(jsonPath("$.soundType").value("SOFT_DING"));
    }
}
