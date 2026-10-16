package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountTransactionService {
    @PersistenceContext private EntityManager entityManager;

    /** Also serialize voucher reservations when an order uses no reward points. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void reserve(User user) {
        entityManager.lock(user, LockModeType.OPTIMISTIC_FORCE_INCREMENT);
    }
}
