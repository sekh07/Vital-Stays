package com.hotel.management.service;

import com.hotel.management.dto.CustomerAdminResponse;
import com.hotel.management.entity.Customer;
import com.hotel.management.exception.ResourceNotFoundException;
import com.hotel.management.repository.CustomerRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomerService {
    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    public List<CustomerAdminResponse> getAllCustomers() {
        return customerRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toAdminResponse)
                .toList();
    }

    public CustomerAdminResponse updateCustomerStatus(Long id, boolean active) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        customer.setActive(active);
        Customer saved = customerRepository.save(customer);
        return toAdminResponse(saved);
    }

    public void deactivateCustomer(Long id) {
        updateCustomerStatus(id, false);
    }

    private CustomerAdminResponse toAdminResponse(Customer customer) {
        return CustomerAdminResponse.builder()
                .id(customer.getId())
                .name(customer.getName())
                .email(customer.getEmail())
                .phone(customer.getPhone())
                .verified(customer.getVerified())
                .active(customer.getActive())
                .createdAt(customer.getCreatedAt())
                .build();
    }
}
