package com.rodrigo.demo.services;

import com.rodrigo.demo.entities.Address;
import com.rodrigo.demo.entities.User;
import com.rodrigo.demo.repositories.AddressRepository;
import com.rodrigo.demo.repositories.UserRepository;
import com.rodrigo.demo.services.exceptions.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;


@Component
public class AddressService {

    @Autowired
    private AddressRepository addressRepository;
    @Autowired
    private UserRepository userRepository;

    public List<Address> findAll(String email) {
        User user = (User) userRepository.findByEmail(email);
        return addressRepository.findByUserId(user.getId());
    }

    public Address findById(Long id, String email) {
        Address address = addressRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(id));
        if (!address.getUser().getEmail().equals(email)) {
            throw new ResourceNotFoundException(id);
        }
        return address;
    }

    public Address create(Address address, String email) {
        User user = (User) userRepository.findByEmail(email);

        address.setUser(user);

        // Se for o primeiro endereço ou marcado como padrão, remove o padrão dos outros endereços
        boolean isDefault = Boolean.TRUE.equals(address.getDefaultAddress());

        if (isDefault || addressRepository.findByUserId(user.getId()).isEmpty()) {
            address.setDefaultAddress(true);
            removeDefaultFromOtherAddresses(user.getId());
        } else {
            address.setDefaultAddress(false);
        }

        return addressRepository.save(address);
    }

    public void removeDefaultFromOtherAddresses(Long userId) {
        addressRepository.findByUserId(userId).forEach(a -> {
            a.setDefaultAddress(false);
            addressRepository.save(a);
        });
    }

    public Address update(Long id, Address newData, String email) {
        Address address = findById(id, email);

        // Atualiza campos
        address.setStreet(newData.getStreet());
        address.setNumber(newData.getNumber());
        address.setComplement(newData.getComplement());
        address.setNeighborhood(newData.getNeighborhood());
        address.setCity(newData.getCity());
        address.setState(newData.getState());
        address.setZipCode(newData.getZipCode());

        boolean isDefault = Boolean.TRUE.equals(newData.getDefaultAddress());

        if (isDefault) {
            User user = (User) userRepository.findByEmail(email);
            removeDefaultFromOtherAddresses(user.getId());
            address.setDefaultAddress(true);
        }

        return addressRepository.save(address);
    }

    public Address setDefault(Long id, String email) {
        Address address = findById(id, email);
        User user = (User) userRepository.findByEmail(email);
        removeDefaultFromOtherAddresses(user.getId());
        address.setDefaultAddress(true);
        return addressRepository.save(address);
    }

    public void delete(Long id, String email) {
        Address address = findById(id, email);
        Long userId = address.getUser().getId();

        boolean wasDefault = Boolean.TRUE.equals(address.getDefaultAddress());

        // Deleta primeiro
        addressRepository.delete(address);

        // 🔥 FORÇA sincronização com banco
        addressRepository.flush();

        if (wasDefault) {
            List<Address> remaining = addressRepository.findByUserId(userId);

            if (!remaining.isEmpty()) {
                Address newDefault = remaining.get(0);
                newDefault.setDefaultAddress(true);
                addressRepository.save(newDefault);
            }
        }
    }
}
