package com.rodrigo.demo.entities.records;

import com.rodrigo.demo.entities.User;
import com.rodrigo.demo.entities.enums.UserRole;

public record UserResponseDTO(Long id, String name, String email, String phone, UserRole role) {

    public UserResponseDTO(User user) {
        this(user.getId(), user.getName(), user.getEmail(), user.getPhone(), user.getRole());
    }
}