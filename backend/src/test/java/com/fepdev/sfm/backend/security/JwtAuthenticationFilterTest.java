package com.fepdev.sfm.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import java.io.IOException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private UserDetailsServiceImpl userDetailsService;

    @Mock
    private AuthCookieService authCookieService;

    @Mock
    private TokenBlacklistService tokenBlacklistService;

    @Mock
    private FilterChain filterChain;

    @InjectMocks
    private JwtAuthenticationFilter filter;

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void noBearerHeader_continuesWithoutAuthentication() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
        verify(jwtService, never()).extractUsername(any());
    }

    @Test
    void validAccessToken_setsAuthenticationInContext() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        UserDetails user =
                User.withUsername("ana").password("x").authorities("ADMIN").build();
        when(jwtService.extractUsername("token")).thenReturn("ana");
        when(jwtService.extractJti("token")).thenReturn("jti-1");
        when(tokenBlacklistService.isBlacklisted("jti-1")).thenReturn(false);
        when(userDetailsService.loadUserByUsername("ana")).thenReturn(user);
        when(jwtService.isAccessTokenValid("token", user)).thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication())
                .isInstanceOf(UsernamePasswordAuthenticationToken.class);
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void validCookieToken_setsAuthenticationInContext() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        UserDetails user =
                User.withUsername("ana").password("x").authorities("ADMIN").build();
        when(authCookieService.readAccessToken(request)).thenReturn("cookie-token");
        when(jwtService.extractUsername("cookie-token")).thenReturn("ana");
        when(jwtService.extractJti("cookie-token")).thenReturn("jti-2");
        when(tokenBlacklistService.isBlacklisted("jti-2")).thenReturn(false);
        when(userDetailsService.loadUserByUsername("ana")).thenReturn(user);
        when(jwtService.isAccessTokenValid("cookie-token", user)).thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication())
                .isInstanceOf(UsernamePasswordAuthenticationToken.class);
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void blacklistedAccessToken_doesNotAuthenticate() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer revoked");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtService.extractUsername("revoked")).thenReturn("ana");
        when(jwtService.extractJti("revoked")).thenReturn("jti-3");
        when(tokenBlacklistService.isBlacklisted("jti-3")).thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(userDetailsService, never()).loadUserByUsername(any());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void redisFailureDuringBlacklistCheck_failsOpen() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        UserDetails user =
                User.withUsername("ana").password("x").authorities("ADMIN").build();
        when(jwtService.extractUsername("token")).thenReturn("ana");
        when(jwtService.extractJti("token")).thenReturn("jti-4");
        when(tokenBlacklistService.isBlacklisted("jti-4")).thenThrow(new RuntimeException("redis down"));
        when(userDetailsService.loadUserByUsername("ana")).thenReturn(user);
        when(jwtService.isAccessTokenValid("token", user)).thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication())
                .isInstanceOf(UsernamePasswordAuthenticationToken.class);
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void invalidTokenOrUser_notAuthenticatedButFilterContinues() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtService.extractUsername("token")).thenThrow(new JwtException("invalid") {
            private static final long serialVersionUID = 1L;
        });

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }
}
