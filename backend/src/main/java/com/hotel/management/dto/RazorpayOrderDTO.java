package com.hotel.management.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RazorpayOrderDTO {
    private String orderId;
    private Long amount;
    private String currency;
    private String receipt;
    private String keyId;
}
