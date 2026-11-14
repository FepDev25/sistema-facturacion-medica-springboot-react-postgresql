package com.fepdev.sfm.backend.security;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.http.Cookie;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class AuthCookieServiceTest {

    private AuthCookieService service(boolean secure) {
        return new AuthCookieService(secure, "Strict", 900_000L, 604_800_000L);
    }

    @Test
    void writeSession_setsHttpOnlyStrictCookies() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        service(false).writeSession(response, "access-token", "refresh-token");

        List<String> cookies = response.getHeaders("Set-Cookie");
        assertThat(cookies).hasSize(2);
        assertThat(cookies.get(0))
                .contains("sfm_access=access-token")
                .contains("Path=/api;")
                .contains("HttpOnly")
                .contains("SameSite=Strict")
                .contains("Max-Age=900");
        assertThat(cookies.get(1))
                .contains("sfm_refresh=refresh-token")
                .contains("Path=/api/v1/auth;")
                .contains("HttpOnly")
                .contains("Max-Age=604800");
        assertThat(cookies.get(0)).doesNotContain("Secure");
        assertThat(response.getHeader("Cache-Control")).isEqualTo("no-store");
    }

    @Test
    void writeSession_addsSecureFlagWhenEnabled() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        service(true).writeSession(response, "a", "r");

        assertThat(response.getHeaders("Set-Cookie")).allMatch(cookie -> cookie.contains("Secure"));
    }

    @Test
    void clearSession_expiresBothCookies() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        service(false).clearSession(response);

        List<String> cookies = response.getHeaders("Set-Cookie");
        assertThat(cookies).hasSize(2);
        assertThat(cookies).allMatch(cookie -> cookie.contains("Max-Age=0"));
    }

    @Test
    void readsCookiesFromRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(
                new Cookie(AuthCookieService.ACCESS_COOKIE, "access"),
                new Cookie(AuthCookieService.REFRESH_COOKIE, "refresh"));

        assertThat(service(false).readAccessToken(request)).isEqualTo("access");
        assertThat(service(false).readRefreshToken(request)).isEqualTo("refresh");
    }

    @Test
    void returnsNullForMissingOrBlankCookies() {
        MockHttpServletRequest empty = new MockHttpServletRequest();
        assertThat(service(false).readAccessToken(empty)).isNull();

        MockHttpServletRequest blank = new MockHttpServletRequest();
        blank.setCookies(new Cookie(AuthCookieService.ACCESS_COOKIE, " "));
        assertThat(service(false).readAccessToken(blank)).isNull();
    }
}
