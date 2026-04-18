package com.hotel.management.repository;

import com.hotel.management.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByEmail(String email);

    java.util.List<Customer> findAllByOrderByCreatedAtDesc();

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    boolean existsByPhoneAndIdNot(String phone, Long id);
}
