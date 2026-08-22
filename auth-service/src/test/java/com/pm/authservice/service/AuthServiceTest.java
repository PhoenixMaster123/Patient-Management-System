package com.pm.authservice.service;

import com.pm.authservice.dto.LoginRequestDTO;
import com.pm.authservice.model.User;
import com.pm.authservice.util.JwtUtil;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Authentication is the only gate in front of the patient registry, so the cases that
 * matter are the ones where it must refuse: unknown user, wrong password, bad token.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserService userService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private AuthService authService;

    private LoginRequestDTO login;

    @BeforeEach
    void setUp() {
        login = new LoginRequestDTO();
        login.setEmail("testuser@test.com");
        login.setPassword("password123");
    }

    private static User user() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("testuser@test.com");
        user.setPassword("$2b$12$hashed");
        user.setRole("ADMIN");
        return user;
    }

    @Test
    @DisplayName("correct credentials produce a token")
    void issuesTokenForCorrectCredentials() {
        when(userService.findByEmail("testuser@test.com")).thenReturn(Optional.of(user()));
        when(passwordEncoder.matches("password123", "$2b$12$hashed")).thenReturn(true);
        when(jwtUtil.generateToken("testuser@test.com", "ADMIN")).thenReturn("a.b.c");

        assertThat(authService.authenticate(login)).contains("a.b.c");
    }

    @Test
    @DisplayName("an unknown email produces no token, and no password check is attempted")
    void refusesUnknownEmail() {
        when(userService.findByEmail("testuser@test.com")).thenReturn(Optional.empty());

        assertThat(authService.authenticate(login)).isEmpty();

        verify(passwordEncoder, never()).matches(anyString(), anyString());
        verify(jwtUtil, never()).generateToken(anyString(), anyString());
    }

    @Test
    @DisplayName("a wrong password produces no token")
    void refusesWrongPassword() {
        when(userService.findByEmail("testuser@test.com")).thenReturn(Optional.of(user()));
        when(passwordEncoder.matches("password123", "$2b$12$hashed")).thenReturn(false);

        assertThat(authService.authenticate(login)).isEmpty();

        verify(jwtUtil, never()).generateToken(anyString(), anyString());
    }

    @Test
    @DisplayName("the role on the token comes from the stored user, not the request")
    void tokenRoleComesFromStoredUser() {
        User user = user();
        user.setRole("NURSE");
        when(userService.findByEmail("testuser@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(jwtUtil.generateToken("testuser@test.com", "NURSE")).thenReturn("nurse.token");

        assertThat(authService.authenticate(login)).contains("nurse.token");
    }

    @Test
    @DisplayName("validateToken is true for a token the util accepts")
    void validatesGoodToken() {
        assertThat(authService.validateToken("good.token")).isTrue();
    }

    @Test
    @DisplayName("validateToken turns a JwtException into false rather than propagating it")
    void swallowsJwtExceptionAsFalse() {
        doThrow(new JwtException("Invalid JWT")).when(jwtUtil).validateToken("bad.token");

        assertThat(authService.validateToken("bad.token")).isFalse();
    }
}
