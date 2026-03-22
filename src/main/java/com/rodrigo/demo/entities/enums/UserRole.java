package com.rodrigo.demo.entities.enums;

public enum UserRole {
    ADMIN("ADMIN"),
    USER("USER");

    private String role;

    UserRole(String Role) {
        this.role = Role;
    }

    public String getRole() {
        return role;
    }
}
