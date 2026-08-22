import io.restassured.http.ContentType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Login and token validation, through the gateway. Requires a running stack.
 */
class AuthIntegrationTest extends ApiTestBase {

    @Test
    @DisplayName("the seeded user can log in and receives a three-part JWT")
    void seededUserCanLogIn() {
        given()
                .contentType(ContentType.JSON)
                .body(loginPayload(SEEDED_EMAIL, SEEDED_PASSWORD))
                .when()
                .post("/auth/login")
                .then()
                .statusCode(200)
                .body("token", notNullValue())
                // Header.payload.signature — catches an empty or truncated token,
                // which "not null" alone would happily accept.
                .body("token", matchesPattern("^[\\w-]+\\.[\\w-]+\\.[\\w-]+$"));
    }

    @Test
    @DisplayName("a wrong password is rejected")
    void wrongPasswordIsRejected() {
        given()
                .contentType(ContentType.JSON)
                .body(loginPayload(SEEDED_EMAIL, "not-the-password"))
                .when()
                .post("/auth/login")
                .then()
                .statusCode(401);
    }

    @Test
    @DisplayName("an unknown user is rejected")
    void unknownUserIsRejected() {
        given()
                .contentType(ContentType.JSON)
                .body(loginPayload("nobody@example.com", "password123"))
                .when()
                .post("/auth/login")
                .then()
                .statusCode(401);
    }

    @Test
    @DisplayName("login is case-sensitive on the email")
    void loginIsCaseSensitiveOnEmail() {
        given()
                .contentType(ContentType.JSON)
                .body(loginPayload(SEEDED_EMAIL.toUpperCase(), SEEDED_PASSWORD))
                .when()
                .post("/auth/login")
                .then()
                .statusCode(401);
    }

    @Test
    @DisplayName("/auth/validate accepts a freshly issued token")
    void validateAcceptsFreshToken() {
        given()
                .header("Authorization", "Bearer " + seededUserToken())
                .when()
                .get("/auth/validate")
                .then()
                .statusCode(200);
    }

    @Test
    @DisplayName("/auth/validate rejects a token that was not signed by the auth service")
    void validateRejectsForeignToken() {
        String foreign = "eyJhbGciOiJIUzI1NiJ9"
                + ".eyJzdWIiOiJhdHRhY2tlckB0ZXN0LmNvbSIsInJvbGUiOiJBRE1JTiJ9"
                + ".ZmFrZXNpZ25hdHVyZXRoYXRpc25vdHZhbGlkYXRhbGw";

        given()
                .header("Authorization", "Bearer " + foreign)
                .when()
                .get("/auth/validate")
                .then()
                .statusCode(401);
    }

    /**
     * Documents a real quirk rather than the behaviour you would expect. AuthController
     * declares @RequestHeader("Authorization") without required = false, so Spring
     * rejects a missing header with 400 before the method body runs — which also makes
     * its own `authHeader == null` branch unreachable. Change this to 401 if the
     * controller is ever fixed to treat a missing header as unauthorised.
     */
    @Test
    @DisplayName("/auth/validate answers 400, not 401, when the Authorization header is absent")
    void validateReturnsBadRequestWhenHeaderIsAbsent() {
        given()
                .when()
                .get("/auth/validate")
                .then()
                .statusCode(400);
    }

    @Test
    @DisplayName("/auth/validate rejects a header that is not a Bearer token")
    void validateRejectsNonBearerScheme() {
        given()
                .header("Authorization", "Basic dXNlcjpwYXNz")
                .when()
                .get("/auth/validate")
                .then()
                .statusCode(401);
    }
}
