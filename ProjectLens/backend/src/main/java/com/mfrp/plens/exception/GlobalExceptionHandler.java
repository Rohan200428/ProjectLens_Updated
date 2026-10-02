package com.mfrp.plens.exception;

import com.mfrp.plens.dto.ApiDtos.ErrorResponse;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;
import java.util.*;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> api(ApiException e, HttpServletRequest r) {
        return error(e.getStatus(), e.getMessage(), r, Map.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> validation(
            MethodArgumentNotValidException e, HttpServletRequest r) {
        Map<String, String> fields = new LinkedHashMap<>();
        e.getBindingResult()
                .getFieldErrors()
                .forEach(f -> fields.putIfAbsent(f.getField(), f.getDefaultMessage()));
        return error(HttpStatus.BAD_REQUEST, "Please check the required fields.", r, fields);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> forbidden(Exception e, HttpServletRequest r) {
        return error(
                HttpStatus.FORBIDDEN,
                "You do not have permission to perform this action.",
                r,
                Map.of());
    }

    @ExceptionHandler({
        DataIntegrityViolationException.class,
        ObjectOptimisticLockingFailureException.class
    })
    public ResponseEntity<ErrorResponse> conflict(Exception e, HttpServletRequest r) {
        return error(
                HttpStatus.CONFLICT,
                "The submission changed or already exists. Refresh and try again.",
                r,
                Map.of());
    }

    @ExceptionHandler({
        HttpMessageNotReadableException.class,
        MethodArgumentTypeMismatchException.class
    })
    public ResponseEntity<ErrorResponse> malformed(Exception e, HttpServletRequest r) {
        return error(HttpStatus.BAD_REQUEST, "The request contains an invalid value.", r, Map.of());
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> methodNotAllowed(Exception e, HttpServletRequest r) {
        return error(
                HttpStatus.METHOD_NOT_ALLOWED,
                "This resource does not support that action.",
                r,
                Map.of());
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> missing(Exception e, HttpServletRequest r) {
        return error(HttpStatus.NOT_FOUND, "Resource not found.", r, Map.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> unexpected(Exception e, HttpServletRequest r) {
        org.slf4j.LoggerFactory.getLogger(getClass())
                .error("Request failed: {}", r.getRequestURI(), e);
        return error(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Something went wrong. Please try again.",
                r,
                Map.of());
    }

    private ResponseEntity<ErrorResponse> error(
            HttpStatus status, String message, HttpServletRequest r, Map<String, String> errors) {
        return ResponseEntity.status(status)
                .body(
                        new ErrorResponse(
                                Instant.now(), status.value(), message, r.getRequestURI(), errors));
    }
}
