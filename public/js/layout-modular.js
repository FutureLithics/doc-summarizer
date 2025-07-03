/**
 * Modular Layout Entry Point
 * Replaces the current layout.js with a modular approach
 */

import { LayoutManager } from './modules/layout.js';
import { notifications } from './modules/notifications.js';

// Initialize layout functionality when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing modular layout...');
    
    // Create global layout manager instance
    window.layoutManager = new LayoutManager();
    
    // Make notifications globally accessible for other modules
    window.notifications = notifications;
    
    console.log('Layout modular initialization complete');
}); 