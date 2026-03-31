package com.fepdev.sfm.backend.security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final SystemUserRepository systemUserRepository;

    public UserDetailsServiceImpl(SystemUserRepository systemUserRepository) {
        this.systemUserRepository = systemUserRepository;
    }

    // Carga el usuario por username para autenticacion. 
    // Retorna un UserDetails con username, password hash y rol.
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return systemUserRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + username));
    }
}
