/**
 * UI Utilities Module - Common UI functions and components
 */

export class Modal {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        this.setupEventListeners();
    }

    show() {
        if (this.modal) {
            this.modal.classList.remove('hidden');
        }
    }

    hide() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
    }

    setupEventListeners() {
        if (this.modal) {
            // Close modal when clicking outside
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hide();
                }
            });

            // Handle close buttons with common IDs
            const closeButtons = this.modal.querySelectorAll('[id*="close"], [id*="Close"], [id*="cancel"], [id*="Cancel"]');
            closeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    this.hide();
                });
            });

            // Handle ESC key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                    this.hide();
                }
            });
        }
    }
}

export class ErrorDisplay {
    static showInModal(containerId, textId, message) {
        const errorContainer = document.getElementById(containerId);
        const errorText = document.getElementById(textId);
        
        if (errorContainer && errorText) {
            errorText.textContent = message;
            errorContainer.classList.remove('hidden');
        } else {
            // Fallback to notification system if available, otherwise alert
            if (window.notifications) {
                window.notifications.error(message);
            } else {
                alert('Error: ' + message);
            }
        }
    }

    static hideInModal(containerId) {
        const errorContainer = document.getElementById(containerId);
        if (errorContainer) {
            errorContainer.classList.add('hidden');
        }
    }

    static showAlert(message, type = 'error') {
        // Use the new notification system if available
        if (window.notifications) {
            const notificationType = type === 'success' ? 'success' : 'error';
            window.notifications.show(message, notificationType);
        } else {
            // Fallback to browser alert
            const prefix = type === 'success' ? 'Success: ' : 'Error: ';
            alert(prefix + message);
        }
    }

    // New methods for better integration
    static success(message, options = {}) {
        if (window.notifications) {
            return window.notifications.success(message, options);
        } else {
            alert('Success: ' + message);
        }
    }

    static error(message, options = {}) {
        if (window.notifications) {
            return window.notifications.error(message, options);
        } else {
            alert('Error: ' + message);
        }
    }

    static info(message, options = {}) {
        if (window.notifications) {
            return window.notifications.info(message, options);
        } else {
            alert('Info: ' + message);
        }
    }

    static warning(message, options = {}) {
        if (window.notifications) {
            return window.notifications.warning(message, options);
        } else {
            alert('Warning: ' + message);
        }
    }
}

export class LoadingState {
    static show(loadingId, emptyId = null) {
        const loading = document.getElementById(loadingId);
        const empty = document.getElementById(emptyId);
        
        if (loading) {
            loading.style.display = 'block';
        }
        if (empty) {
            empty.classList.add('hidden');
        }
    }

    static hide(loadingId) {
        const loading = document.getElementById(loadingId);
        if (loading) {
            loading.style.display = 'none';
        }
    }
}

export class ButtonState {
    static setLoading(buttonId, loadingText = 'Loading...') {
        const button = document.getElementById(buttonId);
        if (button) {
            button.dataset.originalText = button.textContent;
            button.textContent = loadingText;
            button.disabled = true;
        }
    }

    static restore(buttonId) {
        const button = document.getElementById(buttonId);
        if (button && button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            button.disabled = false;
            delete button.dataset.originalText;
        }
    }
}

export class FormUtils {
    static getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return null;

        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            data[key] = typeof value === 'string' ? value.trim() : value;
        }
        
        return data;
    }

    static clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    }

    static focusField(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.focus();
        }
    }
} 