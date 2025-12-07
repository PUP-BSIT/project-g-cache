package com.pomodify.backend.presentation.mapper;

import com.pomodify.backend.domain.model.PomodoroSession;
import com.pomodify.backend.domain.model.SessionNote;
import com.pomodify.backend.domain.model.SessionTodoItem;
import com.pomodify.backend.presentation.dto.note.SessionNoteDto;
import com.pomodify.backend.presentation.dto.note.SessionTodoItemDto;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class SessionNoteMapper {

    public static SessionNoteDto toDto(SessionNote note) {
        if (note == null) return new SessionNoteDto(null, null, List.of());
        List<SessionTodoItemDto> items = note.getItems() == null ? List.of() :
                note.getItems().stream()
                        .sorted(Comparator.comparing(i -> i.getOrderIndex() != null ? i.getOrderIndex() : Integer.MAX_VALUE))
                        .map(i -> new SessionTodoItemDto(i.getId(), i.getText(), i.isDone(), i.getOrderIndex()))
                        .toList();
        return new SessionNoteDto(note.getId(), note.getContent(), items);
    }

    public static void applyDtoToSession(PomodoroSession session, SessionNoteDto dto) {
        if (dto == null) return;

        SessionNote note = session.getNote();
        if (note == null) {
            note = SessionNote.builder()
                    .session(session)
                    .content(dto.content())
                    .items(new ArrayList<>())
                    .build();
            session.setNote(note);
        } else {
            note.setContent(dto.content());
        }

        // rebuild items list from DTO
        note.getItems().clear();
        if (dto.items() != null) {
            int index = 0;
            for (SessionTodoItemDto itemDto : dto.items()) {
                SessionTodoItem item = SessionTodoItem.builder()
                        .note(note)
                        .text(itemDto.text())
                        .done(itemDto.done())
                        .orderIndex(itemDto.orderIndex() != null ? itemDto.orderIndex() : index)
                        .build();
                note.getItems().add(item);
                index++;
            }
        }
    }
}
