package com.studentplatform.backend.security;

import com.studentplatform.backend.repository.UserRepository;
import com.studentplatform.backend.service.UserDocumentLookupService;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserDocumentLookupService userDocumentLookupService;

    public AppUserDetailsService(UserRepository userRepository, UserDocumentLookupService userDocumentLookupService) {
        this.userRepository = userRepository;
        this.userDocumentLookupService = userDocumentLookupService;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String normalizedEmail = username.toLowerCase().trim();
        try {
            return userRepository.findByEmail(normalizedEmail)
                    .map(AppUserDetails::new)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found."));
        } catch (Exception ignored) {
            return userDocumentLookupService.findByEmail(normalizedEmail)
                    .map(AppUserDetails::new)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found."));
        }
    }
}
