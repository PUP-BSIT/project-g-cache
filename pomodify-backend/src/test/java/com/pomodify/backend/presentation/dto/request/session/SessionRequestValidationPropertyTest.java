package com.pomodify.backend.presentation.dto.request.session;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;

import java.util.Set;

/**
 * Property-based tests for SessionRequest and UpdateSessionRequest DTO validation.
 * 
 * Feature: freestyle-pomodoro-settings
 * Property 1: Focus Time Validation
 * Property 2: Break Time Validation
 * Property 3: Long Break Time Validation
 * Property 4: Long Break Interval Validation
 * Validates: Requirements 1.2, 2.2, 3.2, 4.2
 */
class SessionRequestValidationPropertyTest {

    private final Validator validator;

    SessionRequestValidationPropertyTest() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        this.validator = factory.getValidator();
    }

    // ========== Property 1: Focus Time Validation ==========
    // For any focus time value, the system SHALL accept values between 5 and 90 minutes inclusive
    // and reject all other values.
    // Validates: Requirements 1.2, 1.3

    @Property(tries = 100)
    @Label("Property 1: Valid focus time (5-90) should be accepted")
    void validFocusTimeShouldBeAccepted(@ForAll @IntRange(min = 5, max = 90) int focusTime) {
        SessionRequest request = new SessionRequest(
                "FREESTYLE",
                focusTime,
                5,  // valid break time
                4,  // valid cycles
                true,
                15, // valid long break
                150,
                4   // valid long break interval cycles
        );

        Set<ConstraintViolation<SessionRequest>> violations = validator.validate(request);
        
        boolean hasFocusTimeViolation = violations.stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals("focusTimeInMinutes"));
        
        Assertions.assertThat(hasFocusTimeViolation)
                .as("Focus time %d should be valid", focusTime)
                .isFalse();
    }

    @Property(tries = 100)
    @Label("Property 1: Focus time below 5 should be rejected")
    void focusTimeBelowMinShouldBeRejected(@ForAll @IntRange(min = -100, max = 4) int focusTime) {
        SessionRequest request = new SessionRequest(
                "FREESTYLE",
                focusTime,
                5,
                4,
                true,
                15,
                150,
                4
        );

        Set<ConstraintViolation<SessionRequest>> violations = validator.validate(request);
        
        boolean hasFocusTimeViolation = violations.stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals("focusTimeInMinutes"));
        
        Assertions.assertThat(hasFocusTimeViolation)
                .as("Focus time %d should be rejected (below minimum 5)", focusTime)
                .isTrue();
    }

    @Property(tries = 100)
    @Label("Property 1: Focus time above 90 should be rejected")
    void focusTimeAboveMaxShouldBeRejected(@ForAll @IntRange(min = 91, max = 200) int focusTime) {
        SessionRequest request = new SessionRequest(
                "FREESTYLE",
                focusTime,
                5,
                4,
                true,
                15,
                150,
                4
        );

        Set<ConstraintViolation<SessionRequest>> violations = validator.validate(request);
        
        boolean hasFocusTimeViolation = violations.stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals("focusTimeInMinutes"));
        
        Assertions.assertThat(hasFocusTimeViolation)
                .as("Focus time %d should be rejected (above maximum 90)", focusTime)
                .isTrue();
    }

    // ========== Property 2: Break Time Validation ==========
    // For any break time value, the system SHALL accept values between 2 and 10 minutes inclusive
    // and reject all other values.
    // Validates: Requirements 2.2, 2.3

    @Property(tries = 100)
    @Label("Property 2: Valid break time (2-10) should be accepted")
    void validBreakTimeShouldBeAccepted(@ForAll @IntRange(min = 2, max = 10) int breakTime) {
        SessionRequest request = new SessionRequest(
                "FREESTYLE",
                25,
                breakTime,
                4,
                true,
                15,
                150,
                4
        );

        Set<ConstraintViolation<SessionRequest>> violations = validator.validate(request);
        
        boolean hasBreakTimeViolation = violations.stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals("breakTimeInMinutes"));
        
        Assertions.assertThat(hasBreakTimeViolation)
                .as("Break time %d should be valid", breakTime)
                .isFalse();
    }

    @Property(tries = 100)
    @Label("Property 2: Break time below 2 should be rejected")
    void breakTimeBelowMinShouldBeRejected(@ForAll @IntRange(min = -100, max = 1) int breakTime) {
        SessionRequest request = new SessionRequest(
                "FREESTYLE",
                25,
                breakTime,
                4,
                true,
                15,
                150,
                4
        );

        Set<ConstraintViolation<SessionRequest>> violations = validator.validate(request);
        
        boolean hasBreakTimeViolation = violations.stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals("breakTimeInMinutes"));
        
        Assertions.assertThat(hasBreakTimeViolation)
                .as("Break time %d should be rejected (below minimum 2)", breakTime)
                .isTrue();
    }

    @Property(tries = 100)
    @Label("Property 2: Break time above 10 should be rejected")
    void breakTimeAboveMaxShouldBeRejected(@ForAll @IntRange(min = 11, max = 100) int breakTime) {
        SessionRequest request = new SessionRequest(
                "FREESTYLE",
                25,
                breakTime,
                4,
                true,
                15,
                150,
                4
        );

        Set<ConstraintViolation<SessionRequest>> violations = validator.validate(request);
        
        boolean hasBreakTimeViolation = violations.stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals("breakTimeInMinutes"));
        
        Assertions.assertThat(hasBreakTimeViolation)
                .as("Break time %d should be rejected (above maximum 10)", breakTime)
                .isTrue();
    }

    // ========== Property 3: Long Break Time Validation ==========
    // For any long break time value, the system SHALL accept values between 15 and 30 minutes inclusive
    // and reject all other values.
    // Validates: Requirements 3.2, 3.3

    @Property(tries = 100)
    @Label("Property 3: Valid long break time (15-30) should be accepted")
    void validLongBreakTimeShouldBeAccepted(@ForAll @IntRange(min = 15, max = 30) int longBreakTime) {
        SessionRequest request = new SessionRequest(
                "FREESTYLE",
                25,
                5,
                4,
                true,
                longBreakTime,
                150,
                4
        );

        Set<ConstraintViolation<SessionRequest>> violations = validator.validate(request);
        
        boolean hasLongBreakTimeViolation = violations.stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals("longBreakTimeInMinutes"));
        
        Assertions.assertThat(hasLongBreakTimeViolation)
                .as("Long break time %d should be valid", longBreakTime)
                .isFalse();
    }

    @Property(tries = 100)
    @Label("Property 3: Long break time below 15 should be rejected")
    void longBreakTimeBelowMinShouldBeRejected(@ForAll @IntRange(min = -100, max = 14) int longBreakTime) {
        SessionRequest request = new SessionRequest(
                "FREESTYLE",
                25,
                5,
                4,
                true,
                longBreakTime,
                150,
                4
        );

        Set<ConstraintViolation<SessionRequest>> violations = validator.validate(request);
        
        boolean hasLongBreakTimeViolation = violations.stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals("longBreakTimeInMinutes"));
        
        Assertions.assertThat(hasLongBreakTimeViolation)
                .as("Long break time %d should be rejected (below minimum 15)", longBreakTime)
                .isTrue();
    }

    @Property(tries = 100)
    @Label("Property 3: Long break time above 30 should be rejected")
    void longBreakTimeAboveMaxShouldBeRejected(@ForAll @IntRange(min = 31, max = 100) int longBreakTime) {
        SessionRequest request = new SessionRequest(
                "FREESTYLE",
                25,
                5,
                4,
                true,
                longBreakTime,
                150,
                4
        );

        Set<ConstraintViolation<SessionRequest>> violations = validator.validate(request);
        
        boolean hasLongBreakTimeViolation = violations.stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals("longBreakTimeInMinutes"));
        
        Assertions.assertThat(hasLongBreakTimeViolation)
                .as("Long break time %d should be rejected (above maximum 30)", longBreakTime)
                .isTrue();
    }

    // ========== Property 4: Long Break Interval Validation ==========
    // For any long break interval value, the system SHALL accept values between 2 and 10 cycles inclusive
    // and reject all other values.
    // Validates: Requirements 4.2, 4.3

    @Property(tries = 100)
    @Label("Property 4: Valid long break interval (2-10 cycles) should be accepted")
    void validLongBreakIntervalShouldBeAccepted(@ForAll @IntRange(min = 2, max = 10) int intervalCycles) {
        SessionRequest request = new SessionRequest(
                "FREESTYLE",
                25,
                5,
                4,
                true,
                15,
                150,
                intervalCycles
        );

        Set<ConstraintViolation<SessionRequest>> violations = validator.validate(request);
        
        boolean hasIntervalViolation = violations.stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals("longBreakIntervalInCycles"));
        
        Assertions.assertThat(hasIntervalViolation)
                .as("Long break interval %d cycles should be valid", intervalCycles)
                .isFalse();
    }

    @Property(tries = 100)
    @Label("Property 4: Long break interval below 2 should be rejected")
    void longBreakIntervalBelowMinShouldBeRejected(@ForAll @IntRange(min = -100, max = 1) int intervalCycles) {
        SessionRequest request = new SessionRequest(
                "FREESTYLE",
                25,
                5,
                4,
                true,
                15,
                150,
                intervalCycles
        );

        Set<ConstraintViolation<SessionRequest>> violations = validator.validate(request);
        
        boolean hasIntervalViolation = violations.stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals("longBreakIntervalInCycles"));
        
        Assertions.assertThat(hasIntervalViolation)
                .as("Long break interval %d cycles should be rejected (below minimum 2)", intervalCycles)
                .isTrue();
    }

    @Property(tries = 100)
    @Label("Property 4: Long break interval above 10 should be rejected")
    void longBreakIntervalAboveMaxShouldBeRejected(@ForAll @IntRange(min = 11, max = 100) int intervalCycles) {
        SessionRequest request = new SessionRequest(
                "FREESTYLE",
                25,
                5,
                4,
                true,
                15,
                150,
                intervalCycles
        );

        Set<ConstraintViolation<SessionRequest>> violations = validator.validate(request);
        
        boolean hasIntervalViolation = violations.stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals("longBreakIntervalInCycles"));
        
        Assertions.assertThat(hasIntervalViolation)
                .as("Long break interval %d cycles should be rejected (above maximum 10)", intervalCycles)
                .isTrue();
    }

    // ========== UpdateSessionRequest Validation Tests ==========
    // Same properties apply to UpdateSessionRequest

    @Property(tries = 100)
    @Label("UpdateSessionRequest: Valid focus time (5-90) should be accepted")
    void updateRequestValidFocusTimeShouldBeAccepted(@ForAll @IntRange(min = 5, max = 90) int focusTime) {
        UpdateSessionRequest request = new UpdateSessionRequest(
                "FREESTYLE",
                focusTime,
                5,
                4,
                true,
                15,
                180,
                4
        );

        Set<ConstraintViolation<UpdateSessionRequest>> violations = validator.validate(request);
        
        boolean hasFocusTimeViolation = violations.stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals("focusTimeInMinutes"));
        
        Assertions.assertThat(hasFocusTimeViolation)
                .as("UpdateSessionRequest focus time %d should be valid", focusTime)
                .isFalse();
    }

    @Property(tries = 100)
    @Label("UpdateSessionRequest: Valid long break interval (2-10 cycles) should be accepted")
    void updateRequestValidLongBreakIntervalShouldBeAccepted(@ForAll @IntRange(min = 2, max = 10) int intervalCycles) {
        UpdateSessionRequest request = new UpdateSessionRequest(
                "FREESTYLE",
                25,
                5,
                4,
                true,
                15,
                180,
                intervalCycles
        );

        Set<ConstraintViolation<UpdateSessionRequest>> violations = validator.validate(request);
        
        boolean hasIntervalViolation = violations.stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals("longBreakIntervalInCycles"));
        
        Assertions.assertThat(hasIntervalViolation)
                .as("UpdateSessionRequest long break interval %d cycles should be valid", intervalCycles)
                .isFalse();
    }

    // Helper class for assertions
    private static class Assertions {
        static AssertionBuilder assertThat(boolean condition) {
            return new AssertionBuilder(condition);
        }

        static class AssertionBuilder {
            private final boolean condition;
            private String message = "";

            AssertionBuilder(boolean condition) {
                this.condition = condition;
            }

            AssertionBuilder as(String format, Object... args) {
                this.message = String.format(format, args);
                return this;
            }

            void isTrue() {
                if (!condition) {
                    throw new AssertionError(message + " - expected true but was false");
                }
            }

            void isFalse() {
                if (condition) {
                    throw new AssertionError(message + " - expected false but was true");
                }
            }
        }
    }
}
