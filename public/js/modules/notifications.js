/**
 * Notifications Module - Handles all notification and messaging functionality
 * Designed to be easily extensible for future messaging system features
 */

export class NotificationManager {
    constructor() {
        this.notifications = new Map();
        this.notificationCount = 0;
        this.defaultDuration = {
            'success': 3000,
            'info': 4000,
            'warning': 5000,
            'error': 6000
        };
    }

    /**
     * Show a notification
     * @param {string} message - The message to display
     * @param {string} type - The type of notification ('success', 'error', 'info', 'warning')
     * @param {Object} options - Additional options
     * @param {number} options.duration - Custom duration in ms (0 for persistent)
     * @param {boolean} options.persistent - Whether the notification stays until manually closed
     * @param {Function} options.onClick - Callback for when notification is clicked
     * @param {string} options.id - Custom ID for the notification
     * @returns {string} The notification ID
     */
    show(message, type = 'info', options = {}) {
        const notificationId = options.id || `notification-${++this.notificationCount}`;
        
        // Remove existing notification with same ID if it exists
        if (this.notifications.has(notificationId)) {
            this.hide(notificationId);
        }

        const notification = this.createNotificationElement(message, type, options, notificationId);
        
        // Store notification data
        this.notifications.set(notificationId, {
            element: notification,
            type,
            message,
            createdAt: new Date(),
            options
        });

        // Add to DOM
        document.body.appendChild(notification);

        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.add('notification-show');
        });

        // Auto-hide unless persistent
        if (!options.persistent) {
            const duration = options.duration || this.defaultDuration[type] || this.defaultDuration.info;
            setTimeout(() => {
                this.hide(notificationId);
            }, duration);
        }

        return notificationId;
    }

    /**
     * Hide a specific notification
     * @param {string} notificationId - The ID of the notification to hide
     */
    hide(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (!notification) return;

        const element = notification.element;
        
        // Animate out
        element.classList.remove('notification-show');
        element.classList.add('notification-hide');

        // Remove from DOM after animation
        setTimeout(() => {
            if (document.body.contains(element)) {
                document.body.removeChild(element);
            }
            this.notifications.delete(notificationId);
        }, 300);
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        const notificationIds = Array.from(this.notifications.keys());
        notificationIds.forEach(id => this.hide(id));
    }

    /**
     * Get all active notifications
     * @returns {Array} Array of notification data
     */
    getAll() {
        return Array.from(this.notifications.values());
    }

    /**
     * Show a success notification
     * @param {string} message - The message to display
     * @param {Object} options - Additional options
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    /**
     * Show an error notification
     * @param {string} message - The message to display
     * @param {Object} options - Additional options
     */
    error(message, options = {}) {
        return this.show(message, 'error', options);
    }

    /**
     * Show an info notification
     * @param {string} message - The message to display
     * @param {Object} options - Additional options
     */
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    /**
     * Show a warning notification
     * @param {string} message - The message to display
     * @param {Object} options - Additional options
     */
    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    /**
     * Create the notification DOM element
     * @private
     */
    createNotificationElement(message, type, options, notificationId) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.setAttribute('data-notification-id', notificationId);
        
        // Base styles
        notification.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            max-width: 24rem;
            padding: 1rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            z-index: 9999;
            transform: translateX(100%);
            transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
            opacity: 0;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 0.875rem;
            line-height: 1.25rem;
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
        `;

        // Type-specific styling
        const typeStyles = {
            'success': 'background-color: #10b981; color: white;',
            'error': 'background-color: #ef4444; color: white;',
            'warning': 'background-color: #f59e0b; color: white;',
            'info': 'background-color: #3b82f6; color: white;'
        };

        notification.style.cssText += typeStyles[type] || typeStyles.info;

        // Create icon
        const icon = document.createElement('div');
        icon.style.cssText = 'flex-shrink: 0; margin-top: 0.125rem;';
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        icon.textContent = icons[type] || icons.info;

        // Create content
        const content = document.createElement('div');
        content.style.cssText = 'flex: 1; min-width: 0;';
        content.textContent = message;

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
            flex-shrink: 0;
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            padding: 0;
            margin: 0;
            font-size: 1rem;
            line-height: 1;
            opacity: 0.7;
            transition: opacity 0.2s ease;
        `;
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => this.hide(notificationId));
        closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = '1');
        closeBtn.addEventListener('mouseleave', () => closeBtn.style.opacity = '0.7');

        // Assemble notification
        notification.appendChild(icon);
        notification.appendChild(content);
        notification.appendChild(closeBtn);

        // Add click handler if provided
        if (options.onClick) {
            notification.style.cursor = 'pointer';
            notification.addEventListener('click', (e) => {
                if (e.target !== closeBtn) {
                    options.onClick(notificationId);
                }
            });
        }

        return notification;
    }
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    .notification-show {
        transform: translateX(0) !important;
        opacity: 1 !important;
    }
    
    .notification-hide {
        transform: translateX(100%) !important;
        opacity: 0 !important;
    }
    
    .notification:hover {
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
    }
`;
document.head.appendChild(style);

// Global notification manager instance for easy access
export const notifications = new NotificationManager(); 