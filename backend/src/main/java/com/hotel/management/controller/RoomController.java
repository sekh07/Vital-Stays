package com.hotel.management.controller;

import com.hotel.management.dto.RoomDTO;
import com.hotel.management.dto.ApiResponse;
import com.hotel.management.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/rooms")
public class RoomController {
    private static final Logger logger = LoggerFactory.getLogger(RoomController.class);

    @Autowired
    private RoomService roomService;

    @PostMapping
    public ResponseEntity<ApiResponse<RoomDTO>> createRoom(@Valid @RequestBody RoomDTO roomDTO) {
        logger.info("Creating room: {}", roomDTO.getRoomNumber());
        try {
            RoomDTO created = roomService.createRoom(roomDTO);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Room created successfully", created));
        } catch (Exception e) {
            logger.error("Error creating room: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error creating room: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RoomDTO>> updateRoom(
            @PathVariable Long id,
            @Valid @RequestBody RoomDTO roomDTO) {
        logger.info("Updating room: {}", id);
        try {
            RoomDTO updated = roomService.updateRoom(id, roomDTO);
            return ResponseEntity.ok(ApiResponse.success("Room updated successfully", updated));
        } catch (Exception e) {
            logger.error("Error updating room: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error updating room: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<RoomDTO>> updateRoomStatus(
            @PathVariable Long id,
            @RequestParam Boolean active) {
        logger.info("Updating room status: {} -> {}", id, active);
        try {
            RoomDTO updated = roomService.updateRoomStatus(id, active);
            return ResponseEntity.ok(ApiResponse.success("Room status updated successfully", updated));
        } catch (Exception e) {
            logger.error("Error updating room status: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error updating room status: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteRoom(@PathVariable Long id) {
        logger.info("Deleting room: {}", id);
        try {
            roomService.deleteRoom(id);
            return ResponseEntity.ok(ApiResponse.success("Room deleted successfully", null));
        } catch (Exception e) {
            logger.error("Error deleting room: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error deleting room: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RoomDTO>> getRoomById(@PathVariable Long id) {
        logger.info("Fetching room: {}", id);
        try {
            RoomDTO room = roomService.getRoomById(id);
            return ResponseEntity.ok(ApiResponse.success("Room fetched successfully", room));
        } catch (Exception e) {
            logger.error("Error fetching room: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Room not found"));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoomDTO>>> getAllRooms() {
        logger.info("Fetching all rooms");
        try {
            List<RoomDTO> rooms = roomService.getAllRooms();
            return ResponseEntity.ok(ApiResponse.success("Rooms fetched successfully", rooms));
        } catch (Exception e) {
            logger.error("Error fetching rooms: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error fetching rooms"));
        }
    }

    @GetMapping("/available")
    public ResponseEntity<ApiResponse<List<RoomDTO>>> getAvailableRooms(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
            @RequestParam(required = false) Integer guests,
            @RequestParam(required = false) String location) {
        logger.info("Fetching available rooms for dates: {} to {}, guests: {}, location: {}", checkIn, checkOut, guests, location);
        final long startNs = System.nanoTime();
        try {
            List<RoomDTO> rooms = roomService.getAvailableRooms(checkIn, checkOut, guests, location);
            final long elapsedMs = (System.nanoTime() - startNs) / 1_000_000;
            logger.info("Available rooms query completed in {} ms (count={})", elapsedMs, rooms.size());
            return ResponseEntity.ok()
                    .header("X-Response-Time-Ms", String.valueOf(elapsedMs))
                    .header("X-Rooms-Count", String.valueOf(rooms.size()))
                    .body(ApiResponse.success("Available rooms fetched", rooms));
        } catch (Exception e) {
            logger.error("Error fetching available rooms: {}", e.getMessage());
            final long elapsedMs = (System.nanoTime() - startNs) / 1_000_000;
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .header("X-Response-Time-Ms", String.valueOf(elapsedMs))
                    .body(ApiResponse.error("Error fetching rooms"));
        }
    }
}
