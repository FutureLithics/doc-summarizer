// public/js/user-profile-modular.js
/**
 * Modular User Profile Page - Initializes profile functionality
 */

import { ProfileManager } from './modules/userProfile.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const profileData = document.getElementById('profile-data');
    
    if (profileData) {
        const userId = profileData.dataset.userId;
        const isOwnProfile = profileData.dataset.isOwnProfile;
        const userRole = profileData.dataset.userRole;
        
        new ProfileManager(userId, isOwnProfile, userRole);
    }
}); 