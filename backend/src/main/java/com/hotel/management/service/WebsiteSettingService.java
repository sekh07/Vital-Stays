package com.hotel.management.service;

import com.hotel.management.dto.WebsiteSettingsUpdateRequest;
import com.hotel.management.entity.WebsiteSetting;
import com.hotel.management.repository.WebsiteSettingRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class WebsiteSettingService {
    private final WebsiteSettingRepository websiteSettingRepository;

    @Value("${google.oauth.client-id:}")
    private String googleClientId;

    public WebsiteSettingService(WebsiteSettingRepository websiteSettingRepository) {
        this.websiteSettingRepository = websiteSettingRepository;
    }

    public Map<String, String> getPublicSettings() {
        ensureDefaults();
        return toMap(websiteSettingRepository.findAll());
    }

    public Map<String, String> getAllSettings() {
        ensureDefaults();
        return toMap(websiteSettingRepository.findAll());
    }

    public Map<String, String> updateSettings(WebsiteSettingsUpdateRequest request) {
        ensureDefaults();
        if (request.getSettings() == null || request.getSettings().isEmpty()) {
            return getAllSettings();
        }

        for (Map.Entry<String, String> entry : request.getSettings().entrySet()) {
            if (entry.getKey() == null || entry.getKey().isBlank()) {
                continue;
            }

            String key = entry.getKey().trim();
            String value = entry.getValue() == null ? "" : entry.getValue().trim();

            WebsiteSetting existing = websiteSettingRepository.findById(key)
                    .orElse(WebsiteSetting.builder().settingKey(key).build());
            existing.setSettingValue(value);
            websiteSettingRepository.save(existing);
        }

        return getAllSettings();
    }

    private Map<String, String> toMap(List<WebsiteSetting> settings) {
        Map<String, String> result = new LinkedHashMap<>();
        for (WebsiteSetting setting : settings) {
            result.put(setting.getSettingKey(), setting.getSettingValue());
        }
        return result;
    }

    private void ensureDefaults() {
        upsertDefault("site.brandName", "Vital Stays");
        upsertDefault("hero.title", "Book Your Perfect Stay");
        upsertDefault("hero.subtitle", "Handpicked rooms, better prices, and fast check-in for every trip.");
        upsertDefault("hero.metric.hotels", "350+");
        upsertDefault("hero.metric.support", "24/7");
        upsertDefault("hero.metric.happy", "1.2M+");
        upsertDefault("offer.1.title", "Last Minute Deals");
        upsertDefault("offer.1.desc", "Save up to 35% on tonight stays");
        upsertDefault("offer.2.title", "Business Friendly");
        upsertDefault("offer.2.desc", "Fast Wi-Fi, workspace, easy invoices");
        upsertDefault("offer.3.title", "Premium Rooms");
        upsertDefault("offer.3.desc", "Handpicked suites with top amenities");
        upsertDefault("auth.google.clientId", googleClientId);
    }

    private void upsertDefault(String key, String value) {
        if (value == null || value.isBlank()) {
            return;
        }

        WebsiteSetting setting = websiteSettingRepository.findById(key)
                .orElse(WebsiteSetting.builder().settingKey(key).build());

        if (setting.getSettingValue() != null && !setting.getSettingValue().isBlank()) {
            return;
        }

        setting.setSettingValue(value);
        websiteSettingRepository.save(setting);
    }
}
