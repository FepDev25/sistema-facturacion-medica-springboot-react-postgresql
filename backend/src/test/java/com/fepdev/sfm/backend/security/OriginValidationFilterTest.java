package com.fepdev.sfm.backend.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class OriginValidationFilterTest {

    private final OriginValidationFilter filter = new OriginValidationFilter(
            Set.of("https://app.example.com", "http://localhost:5173"));

    private MockHttpServletRequest request(String method, String origin) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, "/api/v1/patients");
        if (origin != null) {
            request.addHeader("Origin", origin);
        }
        return request;
    }

    @Test
    void allowsAllowedOriginOnPost() throws Exception {
        MockFilterChain chain = new MockFilterChain();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request("POST", "https://app.example.com"), response, chain);

        assertThat(chain.getRequest()).isNotNull();
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void blocksUnknownOriginOnPost() throws Exception {
        MockFilterChain chain = new MockFilterChain();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request("POST", "https://evil.example"), response, chain);

        assertThat(chain.getRequest()).isNull();
        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("Origen no permitido");
    }

    @Test
    void blocksNullOrigin() throws Exception {
        MockFilterChain chain = new MockFilterChain();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request("POST", "null"), response, chain);

        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    void allowsSafeMethodsRegardlessOfOrigin() throws Exception {
        MockFilterChain chain = new MockFilterChain();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request("GET", "https://evil.example"), response, chain);

        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void allowsRequestsWithoutBrowserHeaders() throws Exception {
        MockFilterChain chain = new MockFilterChain();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request("POST", null), response, chain);

        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void fallsBackToRefererWhenOriginIsMissing() throws Exception {
        MockHttpServletRequest request = request("POST", null);
        request.addHeader("Referer", "https://app.example.com/patients/1");
        MockFilterChain chain = new MockFilterChain();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void allowsSameOriginRequests() throws Exception {
        MockHttpServletRequest request = request("POST", "http://localhost:8080");
        request.setScheme("http");
        request.addHeader("Host", "localhost:8080");
        MockFilterChain chain = new MockFilterChain();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void blocksUnknownReferer() throws Exception {
        MockHttpServletRequest request = request("POST", null);
        request.addHeader("Referer", "https://evil.example/attack");
        MockFilterChain chain = new MockFilterChain();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(403);
    }
}
