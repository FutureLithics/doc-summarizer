// public/js/login-modular.js
/**
 * Modular Login Page - Handles login form submission
 */

import { AuthApi, AuthValidator, AuthForm } from './modules/auth.js';

class LoginManager {
    constructor() {
        this.authForm = new AuthForm('login-form', 'error-message');
        this.init();
    }

    init() {
        if (this.authForm.form) {
            this.authForm.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        const formData = this.authForm.getFormData();
        if (!formData) return;

        const { email, password } = formData;

        // Validate form
        const validation = AuthValidator.validateLoginForm(email, password);
        if (!validation.isValid) {
            this.authForm.showError(validation.errors[0]);
            return;
        }

        // Clear previous errors and show loading
        this.authForm.hideError();
        this.authForm.setLoading(true);

        try {
            const response = await AuthApi.login(email, password);
            
            // Successful login - redirect
            const returnUrl = this.authForm.getReturnUrl();
            this.authForm.redirect(returnUrl);
            
        } catch (error) {
            console.error('Login error:', error);
            this.authForm.showError(error.message || 'Login failed. Please try again.');
        } finally {
            this.authForm.setLoading(false);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
}); 