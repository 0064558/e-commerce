package com.rodrigo.demo.entities.records;

import com.rodrigo.demo.entities.enums.UserRole;

public record RegisterDTO(String name, String email, String phone, String password, UserRole role) {
}
