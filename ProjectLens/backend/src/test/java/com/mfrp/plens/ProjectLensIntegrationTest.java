package com.mfrp.plens;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mfrp.plens.model.*;
import com.mfrp.plens.repository.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ProjectLensIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired PodRepository pods;
  @Autowired UserRepository users;
  @Autowired ProjectSubmissionRepository submissions;
  @Autowired NotificationRepository notifications;
  @Autowired PasswordEncoder passwords;
  @Autowired com.mfrp.plens.config.ProjectLensProperties properties;
  @Autowired com.mfrp.plens.config.EvaluationProperties evaluationConfig;
  @Autowired CohortCriteriaRepository criteria;
  @Autowired SubmissionEvaluationRepository evaluations;

  @org.springframework.test.context.bean.override.mockito.MockitoBean
  com.mfrp.plens.service.GeminiClient gemini;

  private static final String LEAD = "testlead@projectlens.com";
  private static final String LOW =
      "A community marketplace for neighborhood produce and local pickup schedules.";
  private static final String SEVENTY =
      "Angular Spring Boot REST API MySQL authentication AI analytics";
  private static final String FULL = SEVENTY + " validation JUnit tests architecture documentation";

  @BeforeEach
  void newPod() {
    evaluationConfig.setApiKey("");
    evaluationConfig.setMode(com.mfrp.plens.config.EvaluationProperties.Mode.AUTO);
    Pod p = new Pod();
    p.setName("Test pod " + UUID.randomUUID());
    pods.save(p);
    User u = new User();
    u.setName("Test Lead");
    u.setEmail(LEAD);
    u.setPod(p);
    u.setRole(Role.POD_LEAD);
    u.setPassword(passwords.encode("ProjectLens123!"));
    users.save(u);
  }

  private Map<String, Object> idea(String objectives) {
    return new LinkedHashMap<>(
        Map.of(
            "projectTitle",
            "Community exchange",
            "problemStatement",
            LOW,
            "objectives",
            objectives,
            "technologyStack",
            List.of(Map.of("name", "TypeScript", "category", "LANGUAGE")),
            "documentationLink",
            "https://example.com/design"));
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void descriptionLimitAndStructuredTechnologiesAreValidated() throws Exception {
    var request = idea(FULL);
    request.put("problemStatement", "x".repeat(1001));
    mvc.perform(
            post("/api/submissions")
                .contentType("application/json")
                .content(json.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
    request.put("problemStatement", "x".repeat(1000));
    request.put(
        "technologyStack",
        List.of(
            Map.of("name", "Angular", "category", "FRONTEND"),
            Map.of("name", "angular", "category", "FRONTEND")));
    mvc.perform(
            post("/api/submissions")
                .contentType("application/json")
                .content(json.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
    request.put("technologyStack", List.of(Map.of("name", "Angular", "category", "DATABASE")));
    mvc.perform(
            post("/api/submissions")
                .contentType("application/json")
                .content(json.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
    request.put(
        "technologyStack",
        List.of(
            Map.of("name", "Angular", "category", "FRONTEND"),
            Map.of("name", "Spring Boot", "category", "BACKEND"),
            Map.of("name", "MySQL", "category", "DATABASE")));
    var created =
        json.readTree(
            mvc.perform(
                    post("/api/submissions")
                        .contentType("application/json")
                        .content(json.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());
    mvc.perform(get("/api/submissions/" + created.get("id").asLong()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.technologyStack[0].category").value("FRONTEND"))
        .andExpect(jsonPath("$.technologyStack[1].name").value("Spring Boot"))
        .andExpect(jsonPath("$.technologyStack[2].category").value("DATABASE"));
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void objectivesLimitAppliesToCreationAndRevisionWithoutTruncation() throws Exception {
    mvc.perform(
            post("/api/submissions")
                .contentType("application/json")
                .content(json.writeValueAsString(idea("x".repeat(1001)))))
        .andExpect(status().isBadRequest());
    var created =
        json.readTree(
            mvc.perform(
                    post("/api/submissions")
                        .contentType("application/json")
                        .content(json.writeValueAsString(idea("x".repeat(1000)))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.objectives").value("x".repeat(1000)))
                .andReturn()
                .getResponse()
                .getContentAsString());
    long id = created.get("id").asLong();
    var request = idea("y".repeat(1001));
    request.put("version", created.get("version").asLong());
    for (String path : List.of("/api/submissions/" + id, "/api/submissions/" + id + "/resubmit")) {
      var method = path.endsWith("/resubmit") ? post(path) : put(path);
      mvc.perform(method.contentType("application/json").content(json.writeValueAsString(request)))
          .andExpect(status().isBadRequest());
    }
    mvc.perform(get("/api/submissions/" + id))
        .andExpect(jsonPath("$.objectives").value("x".repeat(1000)));
    request.put("objectives", "y".repeat(1000));
    mvc.perform(
            post("/api/submissions/" + id + "/resubmit")
                .contentType("application/json")
                .content(json.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.objectives").value("y".repeat(1000)));
  }

  private com.fasterxml.jackson.databind.node.ObjectNode geminiResult(double score) {
    var result = json.createObjectNode();
    result.put("alignmentScore", score);
    result.put(
        "explanation", "Evidence evaluated against the supplied cohort learning objectives.");
    result.put("recommendation", "Trainer approval is advisory only.");
    var matched = result.putArray("matchedCriteria");
    criteria.findByActiveTrueOrderByIdAsc().forEach(c -> matched.add(c.getId()));
    result.putArray("missingCriteria");
    return result;
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void noKeyUsesRulesAndStoresSourceWithoutCallingGemini() throws Exception {
    var s = createIdea(FULL);
    assertThat(s.path("evaluation").path("source").asText()).isEqualTo("RULE_BASED");
    assertThat(evaluations.findBySubmissionId(s.get("id").asLong()).orElseThrow().getSource())
        .isEqualTo(EvaluationSource.RULE_BASED);
    org.mockito.Mockito.verifyNoInteractions(gemini);
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void configuredGeminiQualifiesAtThresholdAndPersistsSourceAndKeepsLocalOverlap()
      throws Exception {
    evaluationConfig.setApiKey("placeholder-test-key");
    org.mockito.Mockito.when(
            gemini.evaluate(
                org.mockito.ArgumentMatchers.anyMap(), org.mockito.ArgumentMatchers.anyList()))
        .thenReturn(geminiResult(70));
    var s = createIdea(LOW);
    assertThat(s.get("alignmentScore").asDouble()).isEqualTo(70);
    assertThat(s.get("status").asText()).isEqualTo("PENDING_REVIEW");
    assertThat(s.path("evaluation").path("source").asText()).isEqualTo("GEMINI");
    assertThat(s.path("evaluation").path("overlapDetails").asText()).isNotBlank();
    assertThat(s.toString()).doesNotContain(evaluationConfig.getApiKey());
    assertThat(evaluations.findBySubmissionId(s.get("id").asLong()).orElseThrow().getSource())
        .isEqualTo(EvaluationSource.GEMINI);
    org.mockito.Mockito.verify(gemini)
        .evaluate(org.mockito.ArgumentMatchers.anyMap(), org.mockito.ArgumentMatchers.anyList());
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void geminiCannotOverrideBelowThresholdWorkflow() throws Exception {
    evaluationConfig.setApiKey("placeholder-test-key");
    evaluationConfig.setMode(com.mfrp.plens.config.EvaluationProperties.Mode.GEMINI);
    org.mockito.Mockito.when(
            gemini.evaluate(
                org.mockito.ArgumentMatchers.anyMap(), org.mockito.ArgumentMatchers.anyList()))
        .thenReturn(geminiResult(69.99));
    var s = createIdea(FULL);
    assertThat(s.get("status").asText()).isEqualTo("NEEDS_IMPROVEMENT");
    assertThat(s.path("evaluation").path("source").asText()).isEqualTo("GEMINI");
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void geminiFailureFallsBackWithoutInterruptingSubmission() throws Exception {
    evaluationConfig.setApiKey("placeholder-test-key");
    org.mockito.Mockito.when(
            gemini.evaluate(
                org.mockito.ArgumentMatchers.anyMap(), org.mockito.ArgumentMatchers.anyList()))
        .thenThrow(new IllegalStateException("Remote unavailable"));
    var s = createIdea(FULL);
    assertThat(s.get("alignmentScore").asDouble()).isEqualTo(100);
    assertThat(s.path("evaluation").path("source").asText()).isEqualTo("RULE_BASED");
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void malformedGeminiCriteriaFallsBack() throws Exception {
    evaluationConfig.setApiKey("placeholder-test-key");
    var bad = geminiResult(100);
    bad.withArray("matchedCriteria").add(999999L);
    org.mockito.Mockito.when(
            gemini.evaluate(
                org.mockito.ArgumentMatchers.anyMap(), org.mockito.ArgumentMatchers.anyList()))
        .thenReturn(bad);
    var s = createIdea(LOW);
    assertThat(s.path("evaluation").path("source").asText()).isEqualTo("RULE_BASED");
    assertThat(s.get("status").asText()).isEqualTo("NEEDS_IMPROVEMENT");
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void ruleModeNeverCallsGeminiEvenWithKey() throws Exception {
    evaluationConfig.setApiKey("placeholder-test-key");
    evaluationConfig.setMode(com.mfrp.plens.config.EvaluationProperties.Mode.RULE_BASED);
    var s = createIdea(FULL);
    assertThat(s.path("evaluation").path("source").asText()).isEqualTo("RULE_BASED");
    org.mockito.Mockito.verifyNoInteractions(gemini);
  }

  private JsonNode createIdea(String text) throws Exception {
    return json.readTree(
        mvc.perform(
                post("/api/submissions")
                    .contentType("application/json")
                    .content(json.writeValueAsString(idea(text))))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  private String login(String email, String password) throws Exception {
    var result =
        mvc.perform(
                post("/api/auth/login")
                    .contentType("application/json")
                    .content(json.writeValueAsString(Map.of("email", email, "password", password))))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return json.readTree(result).get("token").asText();
  }

  @Test
  void validLoginIssuesWorkingJwtAndNeverReturnsPassword() throws Exception {
    String token = login("trainer@projectlens.com", "ProjectLens123!");
    mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.role").value("TRAINER"))
        .andExpect(jsonPath("$.password").doesNotExist());
    assertThat(users.findByEmailIgnoreCase("trainer@projectlens.com").orElseThrow().getPassword())
        .startsWith("$2a$");
  }

  @Test
  void invalidLoginHasGeneric401() throws Exception {
    for (String email : List.of("trainer@projectlens.com", "unknown@example.com"))
      mvc.perform(
              post("/api/auth/login")
                  .contentType("application/json")
                  .content(json.writeValueAsString(Map.of("email", email, "password", "wrong"))))
          .andExpect(status().isUnauthorized())
          .andExpect(jsonPath("$.message").value("Invalid email or password."));
  }

  @Test
  void protectedApiRejectsAnonymousAndMalformedJwt() throws Exception {
    mvc.perform(get("/api/criteria")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/criteria").header("Authorization", "Bearer invalid.jwt.value"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void tamperedJwtRejected() throws Exception {
    String token = login("trainer@projectlens.com", "ProjectLens123!");
    String[] parts = token.split("\\.");
    parts[1] =
        Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString("{\"sub\":\"other@example.com\"}".getBytes());
    mvc.perform(get("/api/criteria").header("Authorization", "Bearer " + String.join(".", parts)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void missingFieldsRejected() throws Exception {
    var request = idea(FULL);
    request.put("projectTitle", "");
    request.put("documentationLink", "javascript:alert(1)");
    mvc.perform(
            post("/api/submissions")
                .contentType("application/json")
                .content(json.writeValueAsString(request)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors.projectTitle").exists())
        .andExpect(jsonPath("$.errors.documentationLink").exists());
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void malformedUrlRejectedByBackend() throws Exception {
    var request = idea(FULL);
    request.put("documentationLink", "https://");
    mvc.perform(
            post("/api/submissions")
                .contentType("application/json")
                .content(json.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void lowScoreStaysWithPodAndNotifies() throws Exception {
    JsonNode s = createIdea(LOW);
    assertThat(s.get("alignmentScore").asDouble()).isZero();
    assertThat(s.get("status").asText()).isEqualTo("NEEDS_IMPROVEMENT");
    assertThat(s.get("evaluation").get("missingCriteria").size()).isEqualTo(10);
    assertThat(
            notifications.findByUserIdOrderByCreatedAtDesc(
                users.findByEmailIgnoreCase(LEAD).orElseThrow().getId()))
        .anyMatch(n -> n.getTitle().contains("improvement"));
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void exactlySeventyQualifies() throws Exception {
    JsonNode s = createIdea(SEVENTY);
    assertThat(s.get("alignmentScore").asDouble()).isEqualTo(70);
    assertThat(s.get("status").asText()).isEqualTo("PENDING_REVIEW");
    assertThat(s.get("evaluation").get("matchedCriteria").size()).isEqualTo(7);
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void fullScoreHasExplainableEvidence() throws Exception {
    JsonNode s = createIdea(FULL);
    assertThat(s.get("alignmentScore").asDouble()).isEqualTo(100);
    assertThat(
            s.get("evaluation")
                .get("matchedCriteria")
                .get(0)
                .get("matchedKeywords")
                .get(0)
                .asText())
        .isEqualTo("angular");
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void duplicatePodIdeaRejected() throws Exception {
    createIdea(LOW);
    mvc.perform(
            post("/api/submissions")
                .contentType("application/json")
                .content(json.writeValueAsString(idea(FULL))))
        .andExpect(status().isConflict());
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void reviseLowScoreReevaluatesSameSubmission() throws Exception {
    JsonNode s = createIdea(LOW);
    var request = idea(FULL);
    request.put("version", s.get("version").asLong());
    mvc.perform(
            post("/api/submissions/" + s.get("id").asLong() + "/resubmit")
                .contentType("application/json")
                .content(json.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(s.get("id").asLong()))
        .andExpect(jsonPath("$.status").value("PENDING_REVIEW"))
        .andExpect(jsonPath("$.alignmentScore").value(100.0));
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void staleRevisionRejected() throws Exception {
    JsonNode s = createIdea(LOW);
    var request = idea(FULL);
    request.put("version", -1);
    mvc.perform(
            put("/api/submissions/" + s.get("id").asLong())
                .contentType("application/json")
                .content(json.writeValueAsString(request)))
        .andExpect(status().isConflict());
  }

  @Test
  @WithMockUser(username = "trainer@projectlens.com", roles = "TRAINER")
  void trainerOnlySeesQualifyingIdeas() throws Exception {
    var data =
        json.readTree(
            mvc.perform(get("/api/reviews"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
    for (var s : data) assertThat(s.get("alignmentScore").asDouble()).isGreaterThanOrEqualTo(70);
    var low =
        submissions.findAll().stream()
            .filter(s -> s.getAlignmentScore() < 70)
            .findFirst()
            .orElseThrow();
    mvc.perform(get("/api/reviews/" + low.getId())).andExpect(status().isNotFound());
    mvc.perform(get("/api/submissions/" + low.getId())).andExpect(status().isNotFound());
  }

  @Test
  @WithMockUser(username = "trainer@projectlens.com", roles = "TRAINER")
  void approvesAndNotifies() throws Exception {
    decision("APPROVED");
  }

  @Test
  @WithMockUser(username = "trainer@projectlens.com", roles = "TRAINER")
  void rejectsAndNotifies() throws Exception {
    decision("REJECTED");
  }

  @Test
  @WithMockUser(username = "trainer@projectlens.com", roles = "TRAINER")
  void requestsRevisionAndNotifies() throws Exception {
    decision("NEEDS_REVISION");
  }

  private void decision(String decision) throws Exception {
    var s =
        submissions.findAll().stream()
            .filter(x -> x.getStatus() == SubmissionStatus.PENDING_REVIEW)
            .findFirst()
            .orElseThrow();
    String request =
        json.writeValueAsString(
            Map.of(
                "decision",
                decision,
                "comments",
                "Measurable review feedback.",
                "version",
                s.getVersion()));
    mvc.perform(
            post("/api/reviews/" + s.getId() + "/decision")
                .contentType("application/json")
                .content(request))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value(decision))
        .andExpect(jsonPath("$.decisions[0].comments").value("Measurable review feedback."));
    mvc.perform(
            post("/api/reviews/" + s.getId() + "/decision")
                .contentType("application/json")
                .content(request))
        .andExpect(status().isConflict());
    assertThat(notifications.findByUserIdOrderByCreatedAtDesc(s.getSubmittedBy().getId()))
        .anyMatch(n -> n.getTitle().startsWith("Trainer decision"));
  }

  @Test
  @WithMockUser(username = "member1@projectlens.com", roles = "POD_MEMBER")
  void memberIsReadOnly() throws Exception {
    mvc.perform(get("/api/submissions/my")).andExpect(status().isOk());
    mvc.perform(
            post("/api/submissions")
                .contentType("application/json")
                .content(json.writeValueAsString(idea(FULL))))
        .andExpect(status().isForbidden());
    mvc.perform(
            put("/api/submissions/1")
                .contentType("application/json")
                .content(json.writeValueAsString(idea(FULL))))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/reviews")).andExpect(status().isForbidden());
    mvc.perform(put("/api/submissions/1").contentType("application/json").content("{}"))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void leadCannotReviewOrAccessAnotherPod() throws Exception {
    mvc.perform(get("/api/reviews")).andExpect(status().isForbidden());
    mvc.perform(post("/api/reviews/1/decision").contentType("application/json").content("{}"))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/submissions/" + submissions.findAll().get(0).getId()))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(username = "member2@projectlens.com", roles = "POD_MEMBER")
  void memberCanReadTrainerComments() throws Exception {
    mvc.perform(get("/api/submissions/my"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].decisions[0].comments").isNotEmpty());
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void notificationOwnershipEnforced() throws Exception {
    var n = notifications.findAll().get(0);
    mvc.perform(patch("/api/notifications/" + n.getId() + "/read"))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(username = "trainer@projectlens.com", roles = "TRAINER")
  void criteriaAreReadOnly() throws Exception {
    mvc.perform(get("/api/criteria"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.criteria.length()").value(10));
    mvc.perform(post("/api/criteria").contentType("application/json").content("{}"))
        .andExpect(status().isMethodNotAllowed());
  }

  @Test
  @WithMockUser(username = LEAD, roles = "POD_LEAD")
  void configuredThresholdChangesWorkflow() throws Exception {
    double original = properties.getReviewThreshold();
    try {
      properties.setReviewThreshold(80);
      JsonNode s = createIdea(SEVENTY);
      assertThat(s.get("alignmentScore").asDouble()).isEqualTo(70);
      assertThat(s.get("status").asText()).isEqualTo("NEEDS_IMPROVEMENT");
    } finally {
      properties.setReviewThreshold(original);
    }
  }
}
