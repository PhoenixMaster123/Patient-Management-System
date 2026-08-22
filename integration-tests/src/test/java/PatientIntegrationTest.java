import io.restassured.http.ContentType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * The patient registry through the gateway. Requires a running stack.
 *
 * Note the response shape: GET /api/patients returns a JSON *array*, not an object
 * with a "patients" key. Asserting on a key that does not exist passes vacuously
 * against an array, so these tests assert on the array itself.
 */
class PatientIntegrationTest extends ApiTestBase {

    @Test
    @DisplayName("the roster is refused without a token")
    void rosterRequiresAToken() {
        given()
                .when()
                .get("/api/patients")
                .then()
                .statusCode(401);
    }

    @Test
    @DisplayName("the roster is refused with a malformed token")
    void rosterRejectsMalformedToken() {
        given()
                .header("Authorization", "Bearer not-a-jwt")
                .when()
                .get("/api/patients")
                .then()
                .statusCode(401);
    }

    @Test
    @DisplayName("the roster returns the seeded patients, each with the expected fields")
    void rosterReturnsSeededPatients() {
        given()
                .header("Authorization", "Bearer " + seededUserToken())
                .when()
                .get("/api/patients")
                .then()
                .statusCode(200)
                .body("size()", greaterThan(0))
                .body("id", everyItem(notNullValue()))
                .body("name", everyItem(notNullValue()))
                .body("email", everyItem(notNullValue()))
                // The seed data is well known, so assert on it rather than on "not null".
                .body("name", hasItem("John Doe"))
                .body("email", hasItem("john.doe@example.com"));
    }

    @Test
    @DisplayName("PatientResponseDTO carries no registeredDate, so the roster must not expose one")
    void rosterDoesNotExposeRegisteredDate() {
        List<java.util.Map<String, Object>> patients = given()
                .header("Authorization", "Bearer " + seededUserToken())
                .when()
                .get("/api/patients")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getList("$");

        org.hamcrest.MatcherAssert.assertThat(patients, everyItem(not(hasKey("registeredDate"))));
    }

    @Test
    @DisplayName("a patient can be created, read back, updated and removed")
    void patientLifecycle() {
        String token = seededUserToken();
        String email = uniqueEmail("lifecycle");

        // Create
        String id = given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(patientPayload("Lifecycle Patient", email))
                .when()
                .post("/api/patients")
                .then()
                .statusCode(200)
                .body("name", equalTo("Lifecycle Patient"))
                .body("email", equalTo(email))
                .body("id", notNullValue())
                .extract()
                .path("id");
        assertNotNull(id);

        try {
            // Read back through the roster
            given()
                    .header("Authorization", "Bearer " + token)
                    .when()
                    .get("/api/patients")
                    .then()
                    .statusCode(200)
                    .body("id", hasItem(id))
                    .body("email", hasItem(email));

            // Update
            String updated = """
                    {
                        "name": "Lifecycle Patient Renamed",
                        "email": "%s",
                        "address": "2 Integration Way, Shelbyville",
                        "dateOfBirth": "1991-02-02"
                    }
                    """.formatted(email);

            given()
                    .header("Authorization", "Bearer " + token)
                    .contentType(ContentType.JSON)
                    .body(updated)
                    .when()
                    .put("/api/patients/" + id)
                    .then()
                    .statusCode(200)
                    .body("name", equalTo("Lifecycle Patient Renamed"))
                    .body("address", equalTo("2 Integration Way, Shelbyville"))
                    .body("dateOfBirth", equalTo("1991-02-02"));
        } finally {
            // Delete, so a re-run starts from the same registry it found
            given()
                    .header("Authorization", "Bearer " + token)
                    .when()
                    .delete("/api/patients/" + id)
                    .then()
                    .statusCode(204);
        }

        // Gone
        given()
                .header("Authorization", "Bearer " + token)
                .when()
                .get("/api/patients")
                .then()
                .statusCode(200)
                .body("id", not(hasItem(id)));
    }

    @Test
    @DisplayName("a duplicate email is rejected with a message")
    void duplicateEmailIsRejected() {
        given()
                .header("Authorization", "Bearer " + seededUserToken())
                .contentType(ContentType.JSON)
                .body(patientPayload("Duplicate Doe", "john.doe@example.com"))
                .when()
                .post("/api/patients")
                .then()
                .statusCode(400)
                .body("message", equalTo("Email address already exists"));
    }

    @Test
    @DisplayName("validation errors come back per field")
    void validationErrorsAreReportedPerField() {
        String invalid = """
                {
                    "name": "",
                    "email": "not-an-email",
                    "address": "",
                    "dateOfBirth": "1990-01-01",
                    "registeredDate": "2024-01-01"
                }
                """;

        given()
                .header("Authorization", "Bearer " + seededUserToken())
                .contentType(ContentType.JSON)
                .body(invalid)
                .when()
                .post("/api/patients")
                .then()
                .statusCode(400)
                .body("name", equalTo("Name is required"))
                .body("email", equalTo("Email should be valid"))
                .body("address", equalTo("Address is required"));
    }

    @Test
    @DisplayName("creating without a registeredDate is rejected")
    void registeredDateIsRequiredOnCreate() {
        String missing = """
                {
                    "name": "No Registered Date",
                    "email": "%s",
                    "address": "1 Integration Way, Springfield",
                    "dateOfBirth": "1990-01-01"
                }
                """.formatted(uniqueEmail("noregdate"));

        given()
                .header("Authorization", "Bearer " + seededUserToken())
                .contentType(ContentType.JSON)
                .body(missing)
                .when()
                .post("/api/patients")
                .then()
                .statusCode(400)
                .body("registeredDate", equalTo("Registered date is required"));
    }

    @Test
    @DisplayName("updating an unknown id is rejected")
    void updatingUnknownIdIsRejected() {
        String unknown = "00000000-0000-0000-0000-000000000000";

        given()
                .header("Authorization", "Bearer " + seededUserToken())
                .contentType(ContentType.JSON)
                .body(patientPayload("Ghost Patient", uniqueEmail("ghost")))
                .when()
                .put("/api/patients/" + unknown)
                .then()
                .statusCode(400)
                .body("message", equalTo("Patient not found"));
    }

    private static org.hamcrest.Matcher<Object> notNullValue() {
        return org.hamcrest.Matchers.notNullValue();
    }
}
