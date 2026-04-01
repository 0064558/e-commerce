package com.rodrigo.demo.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.annotation.PostConstruct;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class MelhorEnvioAuthService {

    @Value("${melhorenvio.base-url:https://sandbox.melhorenvio.com.br}")
    private String baseUrl;

    @Value("${melhorenvio.client-id:}")
    private String clientId;

    @Value("${melhorenvio.client-secret:}")
    private String clientSecret;

    @Value("${melhorenvio.redirect-uri:}")
    private String redirectUri;

    @Value("${melhorenvio.scope:shipping-calculate}")
    private String scope;

    @Value("${melhorenvio.user-agent:Nexus Store (suporte@nexusstore.local)}")
    private String userAgent;

    @Value("${melhorenvio.access-token:}")
    private String bootstrapAccessToken;

    @Value("${melhorenvio.refresh-token:}")
    private String bootstrapRefreshToken;

    @Value("${melhorenvio.access-token-expires-at:0}")
    private long bootstrapAccessTokenExpiresAt;

    private final RestTemplate restTemplate;
    private volatile TokenState tokenState;

    public MelhorEnvioAuthService() {
        this.restTemplate = new RestTemplate();
    }

    @PostConstruct
    public void init() {
        if (hasText(bootstrapAccessToken)) {
            long expiresAt = bootstrapAccessTokenExpiresAt > 0
                    ? bootstrapAccessTokenExpiresAt
                    : Instant.now().plus(29, ChronoUnit.DAYS).getEpochSecond();
            tokenState = new TokenState(bootstrapAccessToken.trim(), normalizeEmpty(bootstrapRefreshToken), expiresAt);
        }
    }

    public String buildAuthorizeUrl(String state) {
        ensureOAuthConfigured();
        String safeState = hasText(state) ? state.trim() : UUID.randomUUID().toString();

        return UriComponentsBuilder
                .fromUriString(normalizeBaseUrl() + "/oauth/authorize")
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .queryParam("state", safeState)
                .queryParam("scope", normalizeScope(scope))
                .build(true)
                .toUriString();
    }

    public synchronized Map<String, Object> authorizeWithCode(String code) {
        if (!hasText(code)) {
            throw new IllegalStateException("Parametro code ausente no callback OAuth.");
        }
        ensureOAuthConfigured();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("grant_type", "authorization_code");
        payload.put("client_id", clientId);
        payload.put("client_secret", clientSecret);
        payload.put("redirect_uri", redirectUri);
        payload.put("code", code.trim());

        TokenState newToken = requestToken(payload);
        tokenState = newToken;
        return buildStatusFrom(newToken);
    }

    public synchronized String getValidAccessToken() {
        TokenState current = tokenState;
        if (current != null && !current.isExpired()) {
            return current.accessToken();
        }

        if (current != null && hasText(current.refreshToken()) && isOAuthConfigured()) {
            String refreshed = refreshAccessToken();
            if (hasText(refreshed)) {
                return refreshed;
            }
        }

        return null;
    }

    public synchronized String refreshAccessToken() {
        TokenState current = tokenState;
        if (current == null || !hasText(current.refreshToken())) {
            return null;
        }
        ensureOAuthConfigured();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("grant_type", "refresh_token");
        payload.put("client_id", clientId);
        payload.put("client_secret", clientSecret);
        payload.put("refresh_token", current.refreshToken());

        TokenState refreshedToken = requestToken(payload);
        tokenState = refreshedToken;
        return refreshedToken.accessToken();
    }

    public synchronized Map<String, Object> getStatus() {
        return buildStatusFrom(tokenState);
    }

    private TokenState requestToken(Map<String, Object> payload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set("User-Agent", userAgent);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(
                normalizeBaseUrl() + "/oauth/token",
                request,
                Map.class
        );

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new IllegalStateException("Falha ao solicitar token da Melhor Envio.");
        }

        String accessToken = readString(response.getBody(), "access_token");
        if (!hasText(accessToken)) {
            throw new IllegalStateException("Resposta OAuth sem access_token.");
        }

        String refreshToken = readString(response.getBody(), "refresh_token");
        Long expiresIn = readLong(response.getBody(), "expires_in");
        long expiresAt = Instant.now().plusSeconds(Math.max(60L, expiresIn == null ? 1800L : expiresIn) - 60L)
                .getEpochSecond();

        return new TokenState(accessToken, normalizeEmpty(refreshToken), expiresAt);
    }

    private String normalizeBaseUrl() {
        String safe = baseUrl == null ? "" : baseUrl.trim();
        while (safe.endsWith("/")) {
            safe = safe.substring(0, safe.length() - 1);
        }
        return safe;
    }

    private String normalizeScope(String value) {
        if (!hasText(value)) {
            return "shipping-calculate";
        }
        return value.trim().replaceAll("\\s+", " ");
    }

    private Map<String, Object> buildStatusFrom(TokenState state) {
        boolean connected = state != null && hasText(state.accessToken()) && !state.isExpired();
        long expiresAt = state == null ? 0L : state.expiresAtEpochSeconds();

        Map<String, Object> status = new LinkedHashMap<>();
        status.put("connected", connected);
        status.put("hasRefreshToken", state != null && hasText(state.refreshToken()));
        status.put("expiresAtEpochSeconds", expiresAt);
        status.put("oauthConfigured", isOAuthConfigured());
        status.put("baseUrl", normalizeBaseUrl());
        status.put("scope", normalizeScope(scope));
        status.put("redirectUri", normalizeEmpty(redirectUri));
        return status;
    }

    private String readString(Map<?, ?> source, String key) {
        Object value = source.get(key);
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isBlank() ? null : text;
    }

    private Long readLong(Map<?, ?> source, String key) {
        Object value = source.get(key);
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text) {
            try {
                return Long.parseLong(text.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private boolean isOAuthConfigured() {
        return hasText(clientId) && hasText(clientSecret) && hasText(redirectUri) && hasText(baseUrl);
    }

    private void ensureOAuthConfigured() {
        if (!isOAuthConfigured()) {
            throw new IllegalStateException("Credenciais OAuth da Melhor Envio nao configuradas.");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String normalizeEmpty(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private record TokenState(String accessToken, String refreshToken, long expiresAtEpochSeconds) {
        boolean isExpired() {
            return Instant.now().getEpochSecond() >= expiresAtEpochSeconds;
        }
    }
}