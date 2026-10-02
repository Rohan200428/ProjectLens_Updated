package com.mfrp.plens.service;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mfrp.plens.config.EvaluationProperties;
import com.sun.net.httpserver.HttpServer;

import org.junit.jupiter.api.*;

import java.net.*;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

class GeminiClientTest {
    private HttpServer server;
    private final ObjectMapper json = new ObjectMapper();
    private EvaluationProperties config;
    private GeminiClient client;
    private final AtomicReference<String> requestBody = new AtomicReference<>();
    private final AtomicReference<String> requestKey = new AtomicReference<>();
    private String response;
    private int status;

    @BeforeEach
    void setup() throws Exception {
        config = new EvaluationProperties();
        config.setApiKey("test-placeholder-key");
        config.setModel("test-model");
        response =
                "{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[{\"text\":\"{\\\"alignmentScore\\\":82,\\\"matchedCriteria\\\":[1],\\\"missingCriteria\\\":[],\\\"explanation\\\":\\\"Good"
                    + " evidence.\\\"}\"}]}}]}";
        status = 200;
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext(
                "/models/test-model:generateContent",
                exchange -> {
                    requestBody.set(
                            new String(
                                    exchange.getRequestBody().readAllBytes(),
                                    StandardCharsets.UTF_8));
                    requestKey.set(exchange.getRequestHeaders().getFirst("x-goog-api-key"));
                    byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(status, bytes.length);
                    exchange.getResponseBody().write(bytes);
                    exchange.close();
                });
        server.start();
        client =
                new GeminiClient(
                        json,
                        config,
                        HttpClient.newHttpClient(),
                        URI.create(
                                "http://127.0.0.1:" + server.getAddress().getPort() + "/models/"));
    }

    @AfterEach
    void cleanup() {
        server.stop(0);
    }

    @Test
    void sendsStructuredSchemaAndBackendHeaderAndReadsJson() throws Exception {
        var result =
                client.evaluate(
                        Map.of(
                                "project",
                                Map.of(
                                        "title",
                                        "Test project",
                                        "technologyStack",
                                        List.of(
                                                Map.of(
                                                        "name",
                                                        "Angular",
                                                        "category",
                                                        "FRONTEND")))),
                        List.of(1L));
        assertThat(result.get("alignmentScore").asInt()).isEqualTo(82);
        var body = json.readTree(requestBody.get());
        assertThat(
                        body.path("generationConfig")
                                .path("responseFormat")
                                .path("text")
                                .path("mimeType")
                                .asText())
                .isEqualTo("application/json");
        assertThat(
                        body.path("generationConfig")
                                .path("responseFormat")
                                .path("text")
                                .path("schema")
                                .path("required")
                                .size())
                .isEqualTo(4);
        assertThat(requestBody.get())
                .contains("technologyStack", "FRONTEND")
                .doesNotContain(config.getApiKey());
        assertThat(requestKey.get()).isEqualTo(config.getApiKey());
    }

    @Test
    void apiErrorsDoNotLeakResponseOrCredential() {
        status = 429;
        response = config.getApiKey();
        assertThatThrownBy(() -> client.evaluate(Map.of(), List.of(1L)))
                .hasMessage("Gemini evaluation unavailable");
    }

    @Test
    void rejectsIncompleteAndMalformedResponses() {
        response = "{\"candidates\":[{\"finishReason\":\"MAX_TOKENS\"}]}";
        assertThatThrownBy(() -> client.evaluate(Map.of(), List.of(1L)))
                .isInstanceOf(IllegalStateException.class);
        response = "invalid";
        assertThatThrownBy(() -> client.evaluate(Map.of(), List.of(1L)))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void refusesCredentialEcho() {
        response = response.replace("Good evidence.", config.getApiKey());
        assertThatThrownBy(() -> client.evaluate(Map.of(), List.of(1L)))
                .hasMessage("Gemini evaluation unavailable");
    }
}
