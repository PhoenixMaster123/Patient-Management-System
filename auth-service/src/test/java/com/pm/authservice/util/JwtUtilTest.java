package com.pm.authservice.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The gateway trusts whatever this class signs, so the signature checks matter more
 * than the happy path. HMAC-SHA256 needs at least 32 bytes of key material.
 */
class JwtUtilTest {

    private static final String KEY = secret("a-test-signing-key-that-is-long-enough-32");
    private static final String OTHER_KEY = secret("a-different-signing-key-of-the-same-len!!");

    private final JwtUtil jwtUtil = new JwtUtil(KEY);

    private static String secret(String raw) {
        return Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    @DisplayName("a token it generated is a token it accepts")
    void roundTripsItsOwnToken() {
        String token = jwtUtil.generateToken("testuser@test.com", "ADMIN");

        assertThatCode(() -> jwtUtil.validateToken(token)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("the token carries the email as subject and the role as a claim")
    void carriesEmailAndRole() {
        String token = jwtUtil.generateToken("testuser@test.com", "ADMIN");

        SecretKey key = Keys.hmacShaKeyFor(Base64.getDecoder().decode(KEY));
        Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();

        assertThat(claims.getSubject()).isEqualTo("testuser@test.com");
        assertThat(claims.get("role", String.class)).isEqualTo("ADMIN");
        assertThat(claims.getExpiration()).isAfter(claims.getIssuedAt());
    }

    @Test
    @DisplayName("a token signed with someone else's key is rejected")
    void rejectsForeignSignature() {
        String foreign = new JwtUtil(OTHER_KEY).generateToken("testuser@test.com", "ADMIN");

        assertThatThrownBy(() -> jwtUtil.validateToken(foreign))
                .isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("a payload wearing another token's signature is rejected")
    void rejectsSplicedToken() {
        // Flipping one character of the signature is not a reliable tamper: the final
        // base64url character carries padding bits, so a changed character can decode
        // to the same 32 bytes. Splicing a different token's signature always differs.
        String[] mine = jwtUtil.generateToken("testuser@test.com", "ADMIN").split("\\.");
        String[] other = jwtUtil.generateToken("someone.else@test.com", "ADMIN").split("\\.");
        String spliced = mine[0] + "." + mine[1] + "." + other[2];

        assertThatThrownBy(() -> jwtUtil.validateToken(spliced))
                .isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("a token whose claims were edited is rejected")
    void rejectsEditedClaims() {
        String[] parts = jwtUtil.generateToken("testuser@test.com", "ADMIN").split("\\.");
        String forgedClaims = Base64.getUrlEncoder().withoutPadding().encodeToString(
                "{\"sub\":\"attacker@test.com\",\"role\":\"ADMIN\"}".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> jwtUtil.validateToken(parts[0] + "." + forgedClaims + "." + parts[2]))
                .isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("garbage is rejected rather than thrown as something unexpected")
    void rejectsMalformedToken() {
        assertThatThrownBy(() -> jwtUtil.validateToken("not-a-jwt"))
                .isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("an empty token is rejected")
    void rejectsEmptyToken() {
        assertThatThrownBy(() -> jwtUtil.validateToken(""))
                .isInstanceOf(RuntimeException.class);
    }
}
