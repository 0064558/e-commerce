package com.rodrigo.demo.resources;

import com.rodrigo.demo.entities.records.AuthenticationDTO;
import com.rodrigo.demo.entities.records.ForgotPasswordRequestDTO;
import com.rodrigo.demo.entities.records.LoginResponseDTO;
import com.rodrigo.demo.entities.records.ResetPasswordRequestDTO;
import com.rodrigo.demo.entities.records.RegisterDTO;
import com.rodrigo.demo.entities.User;
import com.rodrigo.demo.entities.records.UserResponseDTO;
import com.rodrigo.demo.infra.security.TokenService;
import com.rodrigo.demo.repositories.UserRepository;
import com.rodrigo.demo.services.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(value = "/auth")
public class AuthenticationResource {
    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository repository;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private PasswordResetService passwordResetService;

    @PostMapping("/login")
    public ResponseEntity login(@RequestBody @Valid AuthenticationDTO data) {
        var usernamePassword = new UsernamePasswordAuthenticationToken(data.email(), data.password());

        var auth = this.authenticationManager.authenticate(usernamePassword);

        var token = tokenService.generateToken((User) auth.getPrincipal());
        return ResponseEntity.ok(new LoginResponseDTO(token));
    }

    @PostMapping("/register")
    //@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity register(@RequestBody @Valid RegisterDTO data) {
        if(this.repository.findByEmail(data.email()) != null) {
            return ResponseEntity.badRequest().body("E-mail already in use");
        }
        if (data.taxId() == null || data.taxId().isBlank()) {
            return ResponseEntity.badRequest().body("CPF obrigatorio");
        }
        if (!isValidCpf(data.taxId())) {
            return ResponseEntity.badRequest().body("CPF invalido");
        }
        String encryptedPassword = new BCryptPasswordEncoder().encode(data.password());
        User user = new User(data.name(), data.email(), data.phone(), data.taxId(), encryptedPassword, data.role());
        this.repository.save(user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/password/forgot")
    public ResponseEntity forgotPassword(@RequestBody ForgotPasswordRequestDTO data) {
        passwordResetService.requestReset(data.email());
        return ResponseEntity.ok("Se o e-mail estiver cadastrado, enviaremos as instrucoes para redefinir a senha.");
    }

    @PostMapping("/password/reset")
    public ResponseEntity resetPassword(@RequestBody ResetPasswordRequestDTO data) {
        passwordResetService.resetPassword(data.token(), data.newPassword());
        return ResponseEntity.ok().build();
    }

    private boolean isValidCpf(String value) {
        String digits = value == null ? "" : value.replaceAll("\\D", "");
        if (digits.length() != 11) {
            return false;
        }
        boolean allEqual = true;
        for (int i = 1; i < digits.length(); i++) {
            if (digits.charAt(i) != digits.charAt(0)) {
                allEqual = false;
                break;
            }
        }
        if (allEqual) {
            return false;
        }

        int sum = 0;
        for (int i = 0; i < 9; i++) {
            sum += (digits.charAt(i) - '0') * (10 - i);
        }
        int firstCheck = (sum * 10) % 11;
        if (firstCheck == 10) {
            firstCheck = 0;
        }
        if (firstCheck != digits.charAt(9) - '0') {
            return false;
        }

        sum = 0;
        for (int i = 0; i < 10; i++) {
            sum += (digits.charAt(i) - '0') * (11 - i);
        }
        int secondCheck = (sum * 10) % 11;
        if (secondCheck == 10) {
            secondCheck = 0;
        }
        return secondCheck == digits.charAt(10) - '0';
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(new UserResponseDTO(user));
    }
}
