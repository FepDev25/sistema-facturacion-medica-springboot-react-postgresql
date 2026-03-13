package com.fepdev.sfm.backend.shared.exception;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestController;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;

// Clase para manejar las excepciones de la aplicacion
@RestController
public class HandlerException {

    // entidad no encontrada: 404 not found
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEntityNotFound(EntityNotFoundException ex, HttpServletRequest request){
        return buildErrorResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request.getRequestURI());
    }

    // errores de validacion de campos: 400 bad request
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpServletRequest request){
        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return buildErrorResponse(HttpStatus.BAD_REQUEST, errorMessage, request.getRequestURI());
    }

    // violacion de reglas de negocio
    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ErrorResponse> handleBusinessRuleException(BusinessRuleException ex, HttpServletRequest request){
        return buildErrorResponse(HttpStatus.UNPROCESSABLE_CONTENT, ex.getMessage(), request.getRequestURI());
    }

    // violacion de constraint de base de datos: 409 conflict
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDatabaseConstraints(DataIntegrityViolationException ex, HttpServletRequest request) {
        // Aquí traducimos el error técnico a algo legible
        String message = "No se pudo procesar la solicitud debido a un conflicto de datos (posible registro duplicado o restricción de base de datos).";
        return buildErrorResponse(HttpStatus.CONFLICT, message, request.getRequestURI());
    }

    // error de autenticacion - token invalido o expirado (401 unauthorized)
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, "Credenciales inválidas o token expirado.", request.getRequestURI());
    }

    // error de acceso denegado - Tiene token pero no permisos (403 Forbidden)
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.FORBIDDEN, "No tienes los permisos necesarios para realizar esta acción.", request.getRequestURI());
    }

    // metodo privado reutilizable para construir la respuesta de los errores
    private ResponseEntity<ErrorResponse> buildErrorResponse(HttpStatus status, String message, String path){
        ErrorResponse errorResponse = new ErrorResponse(
            LocalDateTime.now(),
            status.value(),
            status.getReasonPhrase(),
            message,
            path
        );

        return new ResponseEntity<>(errorResponse, status);
    }

}
