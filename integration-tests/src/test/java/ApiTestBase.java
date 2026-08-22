import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;

import static io.restassured.RestAssured.given;

/**
 * Shared setup for the suite. Every test goes through the gateway, so the base URL and
 * the login dance belong here rather than being copied into each test class.
 *
 * The gateway URL can be overridden for a stack that is not on localhost:
 *   mvn -pl integration-tests test -Dapi.base.url=http://host:4004
 */
abstract class ApiTestBase {

    protected static final String SEEDED_EMAIL = "testuser@test.com";
    protected static final String SEEDED_PASSWORD = "password123";

    @BeforeAll
    static void configureRestAssured() {
        RestAssured.baseURI = System.getProperty(
                "api.base.url",
                System.getenv().getOrDefault("API_BASE_URL", "http://localhost:4004"));
    }

    protected static String loginPayload(String email, String password) {
        return """
                {
                    "email": "%s",
                    "password": "%s"
                }
                """.formatted(email, password);
    }

    /** A bearer token for the seeded user. Fails the test if login does not succeed. */
    protected static String seededUserToken() {
        return given()
                .contentType(ContentType.JSON)
                .body(loginPayload(SEEDED_EMAIL, SEEDED_PASSWORD))
                .when()
                .post("/auth/login")
                .then()
                .statusCode(200)
                .extract()
                .path("token");
    }

    protected static String patientPayload(String name, String email) {
        return """
                {
                    "name": "%s",
                    "email": "%s",
                    "address": "1 Integration Way, Springfield",
                    "dateOfBirth": "1990-01-01",
                    "registeredDate": "2024-01-01"
                }
                """.formatted(name, email);
    }

    /** Unique per run, so a re-run never trips the unique-email constraint. */
    protected static String uniqueEmail(String prefix) {
        return prefix + "." + System.nanoTime() + "@example.com";
    }
}
