/**
 * Layout Module - Handles common functionality across all pages
 */

import { ApiService } from './api.js';
import { NotificationManager } from './notifications.js';

export class LayoutManager {
    constructor() {
        this.notificationManager = new NotificationManager();
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Initialize logout functionality
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => this.handleLogout(e));
        }

        // Initialize mobile menu toggle if present
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            const mobileMenu = document.getElementById('mobile-menu');
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            
            if (mobileMenu && mobileMenuBtn && 
                !mobileMenu.contains(e.target) && 
                !mobileMenuBtn.contains(e.target)) {
                mobileMenu.classList.add('hidden');
            }
        });
    }

    /**
     * Handle user logout
     */
    async handleLogout(event) {
        event.preventDefault();
        
        try {
            await ApiService.post('/api/auth/logout', {});
            
            // Show success message briefly before redirect
            this.notificationManager.show('Logged out successfully', 'success');
            
            // Redirect to home page after brief delay
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
            
        } catch (error) {
            console.error('Logout error:', error);
            this.notificationManager.show(
                error.message || 'An error occurred while logging out', 
                'error'
            );
        }
    }

    /**
     * Show notification (delegates to NotificationManager)
     * @param {string} message - The message to display
     * @param {string} type - The type of notification ('success', 'error', 'info', 'warning')
     */
    showNotification(message, type = 'info') {
        return this.notificationManager.show(message, type);
    }

    /**
     * Clear all notifications
     */
    clearNotifications() {
        this.notificationManager.clearAll();
    }
} 