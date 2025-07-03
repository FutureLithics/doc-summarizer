/**
 * Modular Organizations Entry Point
 * This replaces the current organizations.js with a modular approach
 */

import { OrganizationManager } from './modules/organizations.js';

// Initialize the organization manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing modular organizations page...');
    new OrganizationManager();
}); 