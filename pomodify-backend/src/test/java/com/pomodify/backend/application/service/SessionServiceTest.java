package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.session.GetSessionCommand;
import com.pomodify.backend.application.command.session.UpdateSessionNoteCommand;
import com.pomodify.backend.application.helper.DomainHelper;
import com.pomodify.backend.application.helper.UserHelper;
import com.pomodify.backend.application.result.SessionResult;
import com.pomodify.backend.domain.model.PomodoroSession;
import com.pomodify.backend.domain.repository.PomodoroSessionRepository;
import com.pomodify.backend.domain.model.SessionNote;
import com.pomodify.backend.domain.model.SessionTodoItem;
import com.pomodify.backend.application.service.PushNotificationService;
import com.pomodify.backend.presentation.dto.note.SessionNoteDto;
import com.pomodify.backend.presentation.dto.note.SessionTodoItemDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class SessionServiceTest {

    private PomodoroSessionRepository sessionRepository;
    private DomainHelper domainHelper;
    private UserHelper userHelper;
    private PushNotificationService pushNotificationService;
    private BadgeService badgeService;
    private SessionService sessionService;

    @BeforeEach
    void setUp() {
        sessionRepository = mock(PomodoroSessionRepository.class);
        domainHelper = mock(DomainHelper.class);
        userHelper = mock(UserHelper.class);
        pushNotificationService = mock(PushNotificationService.class);
        badgeService = mock(BadgeService.class);

        sessionService = new SessionService(sessionRepository, domainHelper, userHelper, pushNotificationService, badgeService);
    }

    @Test
    @DisplayName("updates session note and checklist items via PUT and exposes them in GET")
    void updateNoteAndRetrieveWithChecklist() {
        Long userId = 1L;
        Long sessionId = 10L;

        PomodoroSession session = new PomodoroSession();
        session.setId(sessionId);
        session.setFocusDuration(Duration.ofMinutes(25));
        session.setBreakDuration(Duration.ofMinutes(5));
        session.setTotalCycles(4);
        SessionNote note = new SessionNote();
        note.setSession(session);
        session.setNote(note);

        when(domainHelper.getSessionOrThrow(sessionId, userId)).thenReturn(session);
        when(userHelper.getUserOrThrow(userId)).thenReturn(null);
        when(sessionRepository.save(any(PomodoroSession.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionRepository.findById(eq(sessionId))).thenReturn(Optional.of(session));

        SessionTodoItemDto algebra = new SessionTodoItemDto(null, "Algebra exercise", false, 0);
        SessionTodoItemDto geometry = new SessionTodoItemDto(null, "Geometry review", true, 1);
        SessionNoteDto noteDto = new SessionNoteDto(null, "NOTE: Things I need to do", List.of(algebra, geometry));

        SessionResult updated = sessionService.updateNote(
                UpdateSessionNoteCommand.builder()
                        .user(userId)
                        .sessionId(sessionId)
                        .note(noteDto)
                        .build()
        );

        assertThat(updated.note()).isNotNull();
        assertThat(updated.note().content()).isEqualTo("NOTE: Things I need to do");
        assertThat(updated.note().items()).hasSize(2);
        assertThat(updated.note().items().get(0).text()).isEqualTo("Algebra exercise");
        assertThat(updated.note().items().get(0).done()).isFalse();
        assertThat(updated.note().items().get(1).text()).isEqualTo("Geometry review");
        assertThat(updated.note().items().get(1).done()).isTrue();

        SessionResult fetched = sessionService.get(
                GetSessionCommand.builder()
                        .user(userId)
                        .sessionId(sessionId)
                        .build()
        );

        assertThat(fetched.note()).isNotNull();
        assertThat(fetched.note().content()).isEqualTo("NOTE: Things I need to do");
        assertThat(fetched.note().items()).hasSize(2);
        assertThat(fetched.note().items().get(0).text()).isEqualTo("Algebra exercise");
        assertThat(fetched.note().items().get(1).text()).isEqualTo("Geometry review");
    }

    @Test
    @DisplayName("toggles a single checklist item done flag")
    void toggleTodoItemDone() {
        Long userId = 1L;
        Long sessionId = 20L;

        PomodoroSession session = new PomodoroSession();
        session.setId(sessionId);
        session.setFocusDuration(Duration.ofMinutes(25));
        session.setBreakDuration(Duration.ofMinutes(5));
        session.setTotalCycles(4);

        SessionNote note = new SessionNote();
        note.setSession(session);

        SessionTodoItem item = new SessionTodoItem();
        item.setId(100L);
        item.setNote(note);
        item.setText("Algebra exercise");
        item.setDone(false);

        note.getItems().add(item);
        session.setNote(note);

        when(domainHelper.getSessionOrThrow(sessionId, userId)).thenReturn(session);
        when(sessionRepository.save(any(PomodoroSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SessionResult result = sessionService.toggleTodoItem(userId, sessionId, 100L);

        assertThat(result.note().items()).hasSize(1);
        assertThat(result.note().items().get(0).done()).isTrue();
    }

    @Test
    @DisplayName("patches text and orderIndex of a checklist item")
    void patchTodoItem() {
        Long userId = 1L;
        Long sessionId = 30L;

        PomodoroSession session = new PomodoroSession();
        session.setId(sessionId);
        session.setFocusDuration(Duration.ofMinutes(25));
        session.setBreakDuration(Duration.ofMinutes(5));
        session.setTotalCycles(4);

        SessionNote note = new SessionNote();
        note.setSession(session);

        SessionTodoItem item = new SessionTodoItem();
        item.setId(200L);
        item.setNote(note);
        item.setText("Old text");
        item.setDone(false);
        item.setOrderIndex(0);

        note.getItems().add(item);
        session.setNote(note);

        when(domainHelper.getSessionOrThrow(sessionId, userId)).thenReturn(session);
        when(sessionRepository.save(any(PomodoroSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SessionTodoItemDto patch = new SessionTodoItemDto(null, "New text", true, 5);

        SessionResult result = sessionService.patchTodoItem(userId, sessionId, 200L, patch);

        assertThat(result.note().items()).hasSize(1);
        assertThat(result.note().items().get(0).text()).isEqualTo("New text");
        assertThat(result.note().items().get(0).done()).isTrue();
        assertThat(result.note().items().get(0).orderIndex()).isEqualTo(5);
    }

    @Test
    @DisplayName("deletes a single checklist item")
    void deleteTodoItem() {
        Long userId = 1L;
        Long sessionId = 40L;

        PomodoroSession session = new PomodoroSession();
        session.setId(sessionId);
        session.setFocusDuration(Duration.ofMinutes(25));
        session.setBreakDuration(Duration.ofMinutes(5));
        session.setTotalCycles(4);

        SessionNote note = new SessionNote();
        note.setSession(session);

        SessionTodoItem item1 = new SessionTodoItem();
        item1.setId(300L);
        item1.setNote(note);
        item1.setText("Algebra exercise");

        SessionTodoItem item2 = new SessionTodoItem();
        item2.setId(301L);
        item2.setNote(note);
        item2.setText("Geometry review");

        note.getItems().add(item1);
        note.getItems().add(item2);
        session.setNote(note);

        when(domainHelper.getSessionOrThrow(sessionId, userId)).thenReturn(session);
        when(sessionRepository.save(any(PomodoroSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SessionResult result = sessionService.deleteTodoItem(userId, sessionId, 300L);

        assertThat(result.note().items()).hasSize(1);
        assertThat(result.note().items().get(0).text()).isEqualTo("Geometry review");
    }
}
