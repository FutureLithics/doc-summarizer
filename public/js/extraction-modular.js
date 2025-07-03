/**
 * Modular Extraction Detail Page - Handles individual extraction functionality
 */

import { ExtractionEditor, ClipboardManager, SharingManager } from './modules/extractionDetail.js';

class ExtractionDetailManager {
    constructor() {
        this.extractionId = this.getExtractionId();
        this.init();
    }

    getExtractionId() {
        // Extract ID from URL path like /extraction/123abc or /extractions/123abc
        const pathParts = window.location.pathname.split('/');
        return pathParts[pathParts.length - 1];
    }

    init() {
        // Initialize editing functionality
        if (this.extractionId) {
            this.editor = new ExtractionEditor(this.extractionId);
            this.sharingManager = new SharingManager(this.extractionId);
        }

        // Setup clipboard functionality
        this.setupClipboard();
    }

    setupClipboard() {
        // Event delegation for copy buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.copy-text-btn')) {
                e.preventDefault();
                const button = e.target.closest('.copy-text-btn');
                ClipboardManager.copyToClipboard(button);
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ExtractionDetailManager();
}); 