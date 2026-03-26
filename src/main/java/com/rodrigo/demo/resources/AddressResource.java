package com.rodrigo.demo.resources;

import com.rodrigo.demo.entities.Address;
import com.rodrigo.demo.services.AddressService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/addresses")
public class AddressResource {

    @Autowired
    private AddressService addressService;

    @GetMapping
    public ResponseEntity<List<Address>> findAll(Authentication authentication) {
        return ResponseEntity.ok(addressService.findAll(authentication.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Address> findById(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(addressService.findById(id, auth.getName()));
    }

    @PostMapping
    public ResponseEntity<Address> create(@RequestBody Address address, Authentication auth) {
        Address created = addressService.create(address, auth.getName());
        URI uri = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(created.getId()).toUri();
        return ResponseEntity.created(uri).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Address> update(@PathVariable Long id,
                                          @RequestBody Address address,
                                          Principal principal) {

        String email = principal.getName();

        Address updated = addressService.update(id, address, email);

        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/default")
    public ResponseEntity<Address> setDefault(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(addressService.setDefault(id, auth.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        addressService.delete(id, auth.getName());
        return ResponseEntity.noContent().build();
    }
}
