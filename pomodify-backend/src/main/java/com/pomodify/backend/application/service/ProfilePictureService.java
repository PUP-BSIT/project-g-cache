package com.pomodify.backend.application.service;

import com.pomodify.backend.application.result.UserResult;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import com.pomodify.backend.domain.valueobject.Email;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProfilePictureService {

    private final UserRepository userRepository;

    @Value("${app.upload.dir:uploads/profile-pictures}")
    private String uploadDir;

    @Value("${app.base-url:http://localhost:8081}")
    private String baseUrl;

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList("jpg", "jpeg", "png", "gif", "webp");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final int MAX_DIMENSION = 400;

    @Transactional
    public UserResult uploadProfilePicture(String userEmail, MultipartFile file) throws IOException {
        // Validate file
        validateFile(file);

        Email emailVO = Email.of(userEmail);
        User user = userRepository.findByEmail(emailVO)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Delete old profile picture if exists
        if (user.getProfilePictureUrl() != null) {
            deleteOldProfilePicture(user.getProfilePictureUrl());
        }

        // Process and save new image
        String fileName = generateFileName(file.getOriginalFilename());
        Path uploadPath = Paths.get(uploadDir);
        
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Resize image
        byte[] resizedImage = resizeImage(file.getBytes(), getFileExtension(file.getOriginalFilename()));
        
        Path filePath = uploadPath.resolve(fileName);
        Files.write(filePath, resizedImage);

        // Update user with new profile picture URL
        String profilePictureUrl = "/api/v2/auth/users/me/profile-picture/" + fileName;
        user.setProfilePictureUrl(profilePictureUrl);
        User savedUser = userRepository.save(user);

        log.info("Profile picture uploaded for user: {}", userEmail);

        return UserResult.builder()
                .firstName(savedUser.getFirstName())
                .lastName(savedUser.getLastName())
                .email(savedUser.getEmail().getValue())
                .isEmailVerified(savedUser.isEmailVerified())
                .backupEmail(savedUser.getBackupEmail())
                .profilePictureUrl(savedUser.getProfilePictureUrl())
                .build();
    }

    @Transactional
    public UserResult deleteProfilePicture(String userEmail) {
        Email emailVO = Email.of(userEmail);
        User user = userRepository.findByEmail(emailVO)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getProfilePictureUrl() != null) {
            deleteOldProfilePicture(user.getProfilePictureUrl());
            user.setProfilePictureUrl(null);
            userRepository.save(user);
            log.info("Profile picture deleted for user: {}", userEmail);
        }

        return UserResult.builder()
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail().getValue())
                .isEmailVerified(user.isEmailVerified())
                .backupEmail(user.getBackupEmail())
                .profilePictureUrl(null)
                .build();
    }

    public byte[] getProfilePicture(String fileName) throws IOException {
        Path filePath = Paths.get(uploadDir).resolve(fileName);
        if (!Files.exists(filePath)) {
            throw new IllegalArgumentException("Profile picture not found");
        }
        return Files.readAllBytes(filePath);
    }

    public String getContentType(String fileName) {
        String extension = getFileExtension(fileName).toLowerCase();
        return switch (extension) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "gif" -> "image/gif";
            case "webp" -> "image/webp";
            default -> "application/octet-stream";
        };
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds maximum allowed size of 5MB");
        }

        String extension = getFileExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new IllegalArgumentException("File type not supported. Allowed types: " + String.join(", ", ALLOWED_EXTENSIONS));
        }
    }

    private String generateFileName(String originalFilename) {
        String extension = getFileExtension(originalFilename);
        return UUID.randomUUID().toString() + "." + extension;
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1);
    }

    private void deleteOldProfilePicture(String profilePictureUrl) {
        try {
            String fileName = profilePictureUrl.substring(profilePictureUrl.lastIndexOf("/") + 1);
            Path filePath = Paths.get(uploadDir).resolve(fileName);
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.warn("Failed to delete old profile picture: {}", e.getMessage());
        }
    }

    private byte[] resizeImage(byte[] imageData, String format) throws IOException {
        ByteArrayInputStream inputStream = new ByteArrayInputStream(imageData);
        BufferedImage originalImage = ImageIO.read(inputStream);
        
        if (originalImage == null) {
            throw new IllegalArgumentException("Invalid image file");
        }

        int originalWidth = originalImage.getWidth();
        int originalHeight = originalImage.getHeight();

        // If image is already small enough, return original
        if (originalWidth <= MAX_DIMENSION && originalHeight <= MAX_DIMENSION) {
            return imageData;
        }

        // Calculate new dimensions maintaining aspect ratio
        int newWidth, newHeight;
        if (originalWidth > originalHeight) {
            newWidth = MAX_DIMENSION;
            newHeight = (int) ((double) originalHeight / originalWidth * MAX_DIMENSION);
        } else {
            newHeight = MAX_DIMENSION;
            newWidth = (int) ((double) originalWidth / originalHeight * MAX_DIMENSION);
        }

        // Create resized image
        BufferedImage resizedImage = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = resizedImage.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(originalImage, 0, 0, newWidth, newHeight, null);
        g.dispose();

        // Convert to byte array
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        String outputFormat = format.equalsIgnoreCase("png") ? "png" : "jpg";
        ImageIO.write(resizedImage, outputFormat, outputStream);
        
        return outputStream.toByteArray();
    }
}
