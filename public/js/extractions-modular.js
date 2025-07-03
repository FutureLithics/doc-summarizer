// public/js/extractions-modular.js
/**
 * Modular Extractions Page - Handles extraction list functionality
 */

import { ExtractionManager } from './modules/extractions.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ExtractionManager();
}); 