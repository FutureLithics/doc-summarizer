// public/js/signup-modular.js
/**
 * Modular Signup Page - Handles signup form submission and validation
 */

import { AuthApi, AuthValidator, AuthForm } from './modules/auth.js';

class SignupManager {
    constructor() {
        this.authForm = new AuthForm('signup-form', 'error-message');
        this.init();
    }

    init() {
        if (this.authForm.form) {
            this.authForm.form.addEventListener('submit', (e) => this.handleSubmit(e));
            
            // Setup real-time password confirmation validation
            const passwordConfirm = document.getElementById('password-confirm');
            if (passwordConfirm) {
                passwordConfirm.addEventListener('input', () => this.handlePasswordConfirmInput());
            }
        }
    }

    handlePasswordConfirmInput() {
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm');
        
        if (!passwordConfirm) return;
        
        const confirmValue = passwordConfirm.value;
        
        if (confirmValue && password !== confirmValue) {
            passwordConfirm.setCustomValidity('Passwords do not match');
            passwordConfirm.classList.add('border-red-500');
            passwordConfirm.classList.remove('border-gray-300');
        } else {
            passwordConfirm.setCustomValidity('');
            passwordConfirm.classList.remove('border-red-500');
            passwordConfirm.classList.add('border-gray-300');
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        const formData = this.authForm.getFormData();
        if (!formData) return;

        const { email, password, 'password-confirm': passwordConfirm } = formData;

        // Validate form
        const validation = AuthValidator.validateSignupForm(email, password, passwordConfirm);
        if (!validation.isValid) {
            this.authForm.showError(validation.errors[0]);
            this.authForm.hideSuccess('success-message');
            return;
        }

        // Clear previous messages and show loading
        this.authForm.hideError();
        this.authForm.hideSuccess('success-message');
        this.authForm.setLoading(true);

        try {
            const response = await AuthApi.signup(email, password);
            
            // Successful signup
            this.authForm.showSuccess('Account created successfully! You can now sign in.', 'success-message');
            this.authForm.reset();
            
            // Redirect to login after delay
            this.authForm.redirect('/login', 2000);
            
        } catch (error) {
            console.error('Signup error:', error);
            this.authForm.showError(error.message || 'Signup failed. Please try again.');
        } finally {
            this.authForm.setLoading(false);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SignupManager();
}); 