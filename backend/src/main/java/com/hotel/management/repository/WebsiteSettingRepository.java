package com.hotel.management.repository;

import com.hotel.management.entity.WebsiteSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WebsiteSettingRepository extends JpaRepository<WebsiteSetting, String> {
}
