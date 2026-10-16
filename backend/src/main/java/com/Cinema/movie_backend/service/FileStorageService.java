package com.Cinema.movie_backend.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
public class FileStorageService {

    @Autowired
    private Cloudinary cloudinary;

    public FileStorageService() {
    }

    public String storeFile(MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                return null;
            }
            
            // Upload the file to Cloudinary
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
            
            // Return the secure URL provided by Cloudinary
            return uploadResult.get("secure_url").toString();
            
        } catch (IOException ex) {
            throw new RuntimeException("Không thể lưu file " + file.getOriginalFilename() + ". Vui lòng thử lại!", ex);
        }
    }
}
