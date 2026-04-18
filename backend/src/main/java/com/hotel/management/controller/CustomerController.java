package com.hotel.management.controller;

import com.hotel.management.dto.ApiResponse;
import com.hotel.management.dto.CustomerAdminResponse;
import com.hotel.management.service.CustomerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/customers")
public class CustomerController {
    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CustomerAdminResponse>>> getAllCustomers() {
        return ResponseEntity.ok(ApiResponse.success("Customers fetched successfully", customerService.getAllCustomers()));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<CustomerAdminResponse>> updateStatus(
            @PathVariable Long id,
            @RequestParam boolean active
    ) {
        return ResponseEntity.ok(ApiResponse.success("Customer status updated",
                customerService.updateCustomerStatus(id, active)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> deactivate(@PathVariable Long id) {
        customerService.deactivateCustomer(id);
        return ResponseEntity.ok(ApiResponse.success("Customer deactivated", null));
    }
}
