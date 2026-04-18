package com.hotel.management.service;

import com.hotel.management.dto.RoomDTO;
import com.hotel.management.entity.Room;
import com.hotel.management.exception.ResourceNotFoundException;
import com.hotel.management.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RoomService {
    private static final Logger logger = LoggerFactory.getLogger(RoomService.class);

    @Autowired
    private RoomRepository roomRepository;

    public RoomDTO createRoom(RoomDTO roomDTO) {
        logger.info("Creating room: {}", roomDTO.getRoomNumber());
        
        if (roomRepository.existsByRoomNumber(roomDTO.getRoomNumber())) {
            throw new IllegalArgumentException("Room number already exists: " + roomDTO.getRoomNumber());
        }

        Room room = Room.builder()
                .roomNumber(roomDTO.getRoomNumber())
                .type(roomDTO.getType())
                .pricePerNight(BigDecimal.valueOf(roomDTO.getPricePerNight()))
                .description(roomDTO.getDescription())
                .capacity(roomDTO.getCapacity())
                .active(true)
                .build();

        Room savedRoom = roomRepository.save(room);
        logger.info("Room created successfully: {}", savedRoom.getId());
        
        return mapToDTO(savedRoom);
    }

    public RoomDTO updateRoom(Long id, RoomDTO roomDTO) {
        logger.info("Updating room: {}", id);
        
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found"));

        room.setType(roomDTO.getType());
        room.setPricePerNight(BigDecimal.valueOf(roomDTO.getPricePerNight()));
        room.setDescription(roomDTO.getDescription());
        room.setCapacity(roomDTO.getCapacity());
        if (roomDTO.getActive() != null) {
            room.setActive(roomDTO.getActive());
        }

        Room updatedRoom = roomRepository.save(room);
        logger.info("Room updated successfully: {}", id);
        
        return mapToDTO(updatedRoom);
    }

    public RoomDTO updateRoomStatus(Long id, Boolean active) {
        logger.info("Updating room status: {} -> {}", id, active);

        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found"));

        room.setActive(Boolean.TRUE.equals(active));
        Room updatedRoom = roomRepository.save(room);

        logger.info("Room status updated successfully: {}", id);
        return mapToDTO(updatedRoom);
    }

    public void deleteRoom(Long id) {
        logger.info("Deleting room: {}", id);
        
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found"));
        
        room.setActive(false);
        roomRepository.save(room);
        
        logger.info("Room deleted (marked inactive): {}", id);
    }

    public RoomDTO getRoomById(Long id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found"));
        return mapToDTO(room);
    }

    public List<RoomDTO> getAllRooms() {
        return roomRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<RoomDTO> getAvailableRooms() {
        return roomRepository.findByActive(true).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<RoomDTO> getAvailableRooms(LocalDate checkIn, LocalDate checkOut) {
        return getAvailableRooms(checkIn, checkOut, null, null);
    }

    public List<RoomDTO> getAvailableRooms(LocalDate checkIn, LocalDate checkOut, Integer guests, String location) {
        Integer normalizedGuests = guests;
        if (normalizedGuests != null && normalizedGuests <= 0) {
            throw new IllegalArgumentException("Guests must be greater than 0");
        }

        String normalizedLocation = location == null ? null : location.trim();

        if (checkIn == null || checkOut == null) {
            return roomRepository.findAvailableRoomsByFilters(normalizedGuests, normalizedLocation).stream()
                    .map(this::mapToDTO)
                    .collect(Collectors.toList());
        }

        if (!checkIn.isBefore(checkOut)) {
            throw new IllegalArgumentException("Check-out date must be after check-in date");
        }

        return roomRepository.findAvailableRoomsBetweenDates(checkIn, checkOut, normalizedGuests, normalizedLocation).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private RoomDTO mapToDTO(Room room) {
        return RoomDTO.builder()
                .id(room.getId())
                .roomNumber(room.getRoomNumber())
                .type(room.getType())
                .pricePerNight(room.getPricePerNight().doubleValue())
                .description(room.getDescription())
                .capacity(room.getCapacity())
                .active(room.getActive())
                .build();
    }
}
