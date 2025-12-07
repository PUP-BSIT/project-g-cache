package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.command.session.*;
import com.pomodify.backend.application.service.SessionService;
import com.pomodify.backend.presentation.dto.item.SessionItem;
import com.pomodify.backend.presentation.dto.request.session.SessionRequest;
import com.pomodify.backend.presentation.dto.response.SessionResponse;
import com.pomodify.backend.presentation.mapper.SessionMapper;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@RestController
@RequestMapping("/activities/{activityId}/sessions")
public class SessionController {

        private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();
        private final SessionService sessionService;

        public SessionController(SessionService sessionService) {
                this.sessionService = sessionService;
        }

    // ───── CRUD Operations ─────

    @PostMapping
        public ResponseEntity<SessionResponse> createSession(@PathVariable Long activityId,
                                                             @RequestBody @Valid SessionRequest request,
                                                             @AuthenticationPrincipal Jwt jwt) {
        Long userId = requireUserId(jwt);
        CreateSessionCommand command = CreateSessionCommand.builder()
                .user(userId)
                .activityId(activityId)
                .sessionType(request.sessionType())
                .focusTimeInMinutes(request.focusTimeInMinutes())
                .breakTimeInMinutes(request.breakTimeInMinutes())
                .cycles(request.cycles())
                .note(null)
                .build();
        SessionItem item = SessionMapper.toItem(sessionService.create(command));
        return ResponseEntity.status(HttpStatus.CREATED).body(SessionMapper.toResponse(item, "Session created successfully"));
    }

    @GetMapping
        public ResponseEntity<SessionResponse> getAllSessions(@AuthenticationPrincipal Jwt jwt,
                                                              @PathVariable Long activityId,
                                                              @RequestParam(required = false) String status) {
        Long userId = requireUserId(jwt);
        List<SessionItem> items = SessionMapper.toItems(
                sessionService.getAll(GetSessionsCommand.builder()
                        .user(userId)
                        .activityId(activityId)
                        .status(status)
                        .build())
        );
        return ResponseEntity.ok(SessionMapper.toResponse(items, "Sessions retrieved successfully"));
    }

        @GetMapping("/{id}")
        public ResponseEntity<SessionResponse> getSession(@AuthenticationPrincipal Jwt jwt,
                                  @PathVariable Long activityId,
                                  @PathVariable Long id) {
            Long userId = requireUserId(jwt);
                SessionItem item = SessionMapper.toItem(sessionService.get(GetSessionCommand.builder().user(userId).sessionId(id).build()));
                return ResponseEntity.ok(SessionMapper.toResponse(item, "Session retrieved successfully"));
        }

        @DeleteMapping("/{id}")
        public ResponseEntity<SessionResponse> deleteSession(@AuthenticationPrincipal Jwt jwt,
                                     @PathVariable Long activityId,
                                     @PathVariable Long id) {
            Long userId = requireUserId(jwt);
                sessionService.delete(DeleteSessionCommand.builder().user(userId).sessionId(id).build());
                return ResponseEntity.ok(new SessionResponse("Session deleted successfully", List.of(),0,0,0));
        }

    // ───── Lifecycle Operations ─────

    @PostMapping("/{id}/start")
    public ResponseEntity<SessionResponse> startSession(@AuthenticationPrincipal Jwt jwt,
                                                        @PathVariable Long activityId,
                                                        @PathVariable Long id) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.start(StartSessionCommand.builder().user(userId).sessionId(id).build()));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Session started successfully"));
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<SessionResponse> pauseSession(@AuthenticationPrincipal Jwt jwt,
                                                        @PathVariable Long activityId,
                                                        @PathVariable Long id,
                                                        @RequestParam(required = false) String note) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.pause(PauseSessionCommand.builder().user(userId).sessionId(id).note(note).build()));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Session paused successfully"));
    }

    @PostMapping("/{id}/resume")
    public ResponseEntity<SessionResponse> resumeSession(@AuthenticationPrincipal Jwt jwt,
                                                         @PathVariable Long activityId,
                                                         @PathVariable Long id) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.resume(ResumeSessionCommand.builder().user(userId).sessionId(id).build()));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Session resumed successfully"));
    }

    @PostMapping("/{id}/stop")
    public ResponseEntity<SessionResponse> stopSession(@AuthenticationPrincipal Jwt jwt,
                                                       @PathVariable Long activityId,
                                                       @PathVariable Long id,
                                                       @RequestParam(required = false) String note) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.stop(StopSessionCommand.builder().user(userId).sessionId(id).note(note).build()));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Session stopped successfully (current cycle invalidated)"));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<SessionResponse> cancelSession(@AuthenticationPrincipal Jwt jwt,
                                                         @PathVariable Long activityId,
                                                         @PathVariable Long id) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.cancel(CancelSessionCommand.builder().user(userId).sessionId(id).build()));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Session canceled successfully (all cycles invalidated)"));
    }

    @PostMapping("/{id}/finish")
    public ResponseEntity<SessionResponse> finishSession(@AuthenticationPrincipal Jwt jwt,
                                                         @PathVariable Long activityId,
                                                         @PathVariable Long id,
                                                         @RequestParam(required = false) String note) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.finish(FinishSessionCommand.builder().user(userId).sessionId(id).note(note).build()));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Session finished successfully"));
    }

        @PostMapping("/{id}/complete-phase")
        public ResponseEntity<SessionResponse> completePhase(@AuthenticationPrincipal Jwt jwt,
                                     @PathVariable Long activityId,
                                     @PathVariable Long id,
                                                                                                                 @RequestParam(required = false) String note) {
            Long userId = requireUserId(jwt);
                SessionItem item = SessionMapper.toItem(sessionService.completePhase(CompletePhaseCommand.builder().user(userId).sessionId(id).note(note).build()));
                notifyPhaseChange(id, item);
                String msg = "COMPLETED".equals(item.status()) ? "Session completed successfully" : "Phase completed: " + item.currentPhase();
                return ResponseEntity.ok(SessionMapper.toResponse(item, msg));
        }

    @PutMapping("/{id}/note")
    public ResponseEntity<SessionResponse> updateNote(@AuthenticationPrincipal Jwt jwt,
                                                      @PathVariable Long activityId,
                                                      @PathVariable Long id,
                                                      @RequestParam String note) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.updateNote(UpdateSessionNoteCommand.builder().user(userId).sessionId(id).note(note).build()));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Note updated successfully"));
    }

    // ───── Server-Sent Events (SSE) ─────

    @GetMapping(value = "/{id}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeToSessionEvents(@PathVariable Long activityId,
                                               @PathVariable Long id) {
        log.info("Client subscribing to events for session: {}", id);

        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitters.put(id, emitter);

        emitter.onCompletion(() -> {
            log.info("SSE completed for session: {}", id);
            emitters.remove(id);
        });

        emitter.onTimeout(() -> {
            log.warn("SSE timeout for session: {}", id);
            emitters.remove(id);
        });

        emitter.onError((ex) -> {
            log.error("SSE error for session: {}", id, ex);
            emitters.remove(id);
        });

        // Send initial connection confirmation
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("Connected to session " + id + " events"));
        } catch (IOException e) {
            log.error("Error sending initial SSE event", e);
            emitter.completeWithError(e);
        }

        return emitter;
    }

    private Long requireUserId(Jwt jwt) {
        if (jwt == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authentication token");
        }
        Object claim = jwt.getClaim("user");
        if (claim instanceof Integer i) {
            return i.longValue();
        }
        if (claim instanceof Long l) {
            return l;
        }
        if (claim instanceof String s) {
            try { return Long.parseLong(s); } catch (NumberFormatException ignored) { }
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token: missing user claim");
    }

        private void notifyPhaseChange(Long sessionId, SessionItem session) {
        SseEmitter emitter = emitters.get(sessionId);
        if (emitter != null) {
            try {
                Map<String, Object> eventData = new HashMap<>();
                eventData.put("sessionId", session.id());
                eventData.put("currentPhase", session.currentPhase());
                eventData.put("cyclesCompleted", session.cyclesCompleted());
                eventData.put("totalCycles", session.cycles());
                eventData.put("status", session.status());
                eventData.put("timestamp", LocalDateTime.now());

                emitter.send(SseEmitter.event()
                        .name("phase-change")
                        .data(eventData));

                log.info("SSE notification sent for session: {}", sessionId);
            } catch (IOException e) {
                log.error("Error sending SSE notification", e);
                emitter.completeWithError(e);
                emitters.remove(sessionId);
            }
        }
    }

        
}