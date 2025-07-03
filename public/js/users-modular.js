// public/js/users-modular.js
/**
 * Modular Users Entry Point
 * This replaces the current users.js with a modular approach
 */

import { UserManager } from './modules/users.js';

// Initialize the user manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing modular users page...');
    new UserManager();
}); 