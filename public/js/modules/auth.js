// public/js/modules/auth.js
/**
 * Authentication Module - Handles login, signup, and auth-related utilities
 */

import { ApiService } from './api.js';
import { ErrorDisplay, ButtonState } from './ui.js';
import { ValidationUtils } from './utils.js';

// Auth-specific API methods
export class AuthApi {
    static async login(email, password) {
        return ApiService.post('/api/auth/login', { email, password });
    }

    static async signup(email, password) {
        return ApiService.post('/api/auth/signup', { email, password });
    }

    static async logout() {
        return ApiService.post('/api/auth/logout', {});
    }
}

export class AuthValidator {
    static validateLoginForm(email, password) {
        const errors = [];

        if (!ValidationUtils.isRequired(email)) {
            errors.push('Email is required');
        } else if (!ValidationUtils.isEmail(email)) {
            errors.push('Please enter a valid email address');
        }

        if (!ValidationUtils.isRequired(password)) {
            errors.push('Password is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static validateSignupForm(email, password, passwordConfirm) {
        const errors = [];

        if (!ValidationUtils.isRequired(email)) {
            errors.push('Email is required');
        } else if (!ValidationUtils.isEmail(email)) {
            errors.push('Please enter a valid email address');
        }

        if (!ValidationUtils.isRequired(password)) {
            errors.push('Password is required');
        } else if (!ValidationUtils.minLength(password, 6)) {
            errors.push('Password must be at least 6 characters long');
        }

        if (!ValidationUtils.isRequired(passwordConfirm)) {
            errors.push('Password confirmation is required');
        } else if (password !== passwordConfirm) {
            errors.push('Passwords do not match');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static validatePasswordStrength(password) {
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
            noSpaces: !/\s/.test(password)
        };

        const passed = Object.values(checks).filter(Boolean).length;
        const total = Object.keys(checks).length;
        const strength = passed / total;

        let level = 'weak';
        let color = 'bg-red-500';
        if (strength >= 0.8) {
            level = 'strong';
            color = 'bg-green-500';
        } else if (strength >= 0.6) {
            level = 'good';
            color = 'bg-yellow-500';
        } else if (strength >= 0.4) {
            level = 'fair';
            color = 'bg-orange-500';
        }

        return {
            strength,
            level,
            color,
            checks,
            passed,
            total
        };
    }
}

export class AuthForm {
    constructor(formId, errorContainerId) {
        this.form = document.getElementById(formId);
        this.errorContainer = document.getElementById(errorContainerId);
        this.submitButton = this.form?.querySelector('button[type="submit"]');
    }

    getFormData() {
        if (!this.form) return null;

        const formData = new FormData(this.form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            data[key] = typeof value === 'string' ? value.trim() : value;
        }
        
        return data;
    }

    showError(message) {
        if (this.errorContainer) {
            this.errorContainer.textContent = message;
            this.errorContainer.classList.remove('hidden');
        } else {
            ErrorDisplay.showAlert(message);
        }
    }

    hideError() {
        if (this.errorContainer) {
            this.errorContainer.classList.add('hidden');
        }
    }

    showSuccess(message, containerId = null) {
        const container = containerId ? document.getElementById(containerId) : null;
        if (container) {
            container.textContent = message;
            container.classList.remove('hidden');
        } else {
            ErrorDisplay.showAlert(message, 'success');
        }
    }

    hideSuccess(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.classList.add('hidden');
        }
    }

    setLoading(loading, buttonId = null) {
        const buttonToUpdate = buttonId ? document.getElementById(buttonId) : this.submitButton;
        if (buttonToUpdate) {
            if (loading) {
                ButtonState.setLoading(buttonToUpdate.id, 'Loading...');
            } else {
                ButtonState.restore(buttonToUpdate.id);
            }
        }
    }

    reset() {
        if (this.form) {
            this.form.reset();
        }
        this.hideError();
    }

    redirect(url, delay = 0) {
        if (delay > 0) {
            setTimeout(() => {
                window.location.href = url;
            }, delay);
        } else {
            window.location.href = url;
        }
    }

    getReturnUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('returnTo') || '/';
    }
} 