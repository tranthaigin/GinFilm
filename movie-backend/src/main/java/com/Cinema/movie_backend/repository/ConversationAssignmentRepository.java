package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.ConversationAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationAssignmentRepository extends JpaRepository<ConversationAssignment, Long> {

    Optional<ConversationAssignment> findByConversationId(UUID conversationId);

    List<ConversationAssignment> findAll();

    @Modifying
    @Transactional
    @Query("DELETE FROM ConversationAssignment a WHERE a.conversationId = :convId")
    void deleteByConversationId(@Param("convId") UUID conversationId);
}
