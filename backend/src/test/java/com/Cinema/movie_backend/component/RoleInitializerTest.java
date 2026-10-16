package com.Cinema.movie_backend.component;

import com.Cinema.movie_backend.entity.Role;
import com.Cinema.movie_backend.repository.RoleRepository;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.mockito.Mockito.*;

class RoleInitializerTest {
    @Test void emptyDatabaseReceivesAllRequiredRoles() {
        RoleRepository repository = mock(RoleRepository.class);
        when(repository.findByNameManual(anyString())).thenReturn(Optional.empty());
        new RoleInitializer(repository).run();
        verify(repository, times(3)).save(any(Role.class));
    }
    @Test void existingRolesArePreserved() {
        RoleRepository repository = mock(RoleRepository.class);
        when(repository.findByNameManual(anyString())).thenReturn(Optional.of(new Role()));
        new RoleInitializer(repository).run();
        verify(repository, never()).save(any());
    }
}
