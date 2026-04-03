package com.rodrigo.demo.entities.records;

public record ResetPasswordRequestDTO(String token, String newPassword) {
}
