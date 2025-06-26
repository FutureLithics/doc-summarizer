/**
 * Signup Page JavaScript - Handles signup form submission and user registration
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeSignupForm();
});

/**
 * Initialize signup form functionality
 */
function initializeSignupForm() {
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignupSubmit);
    }
    
    // Initialize real-time password confirmation validation
    const passwordConfirm = document.getElementById('password-confirm');
    if (passwordConfirm) {
        passwordConfirm.addEventListener('input', handlePasswordConfirmInput);
    }
}

/**
 * Handle signup form submission
 * @param {Event} e - The form submit event
 */
async function handleSignupSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');
    const passwordConfirm = formData.get('password-confirm');
    
    const elements = getFormElements();
    
    // Client-side validation
    if (!validatePasswords(password, passwordConfirm, elements)) {
        return;
    }
    
    // Show loading state
    setLoadingState(elements, true);
    hideMessages(elements);
    
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Successful signup
            showSuccessMessage(elements.successMessage, 'Account created successfully! You can now sign in.');
            form.reset();
            
            // Redirect to login after a delay
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } else {
            // Show error message
            showErrorMessage(elements.errorMessage, data.message || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showErrorMessage(elements.errorMessage, 'An error occurred. Please try again.');
    } finally {
        // Reset loading state
        setLoadingState(elements, false);
    }
}

/**
 * Handle password confirmation input
 */
function handlePasswordConfirmInput() {
    const password = document.getElementById('password').value;
    const passwordConfirm = this.value;
    
    if (passwordConfirm && password !== passwordConfirm) {
        this.setCustomValidity('Passwords do not match');
        this.classList.add('border-red-500');
        this.classList.remove('border-gray-300');
    } else {
        this.setCustomValidity('');
        this.classList.remove('border-red-500');
        this.classList.add('border-gray-300');
    }
}

/**
 * Validate password fields
 * @param {string} password - The password value
 * @param {string} passwordConfirm - The password confirmation value
 * @param {Object} elements - Form elements object
 * @returns {boolean} Whether validation passed
 */
function validatePasswords(password, passwordConfirm, elements) {
    // Check if passwords match
    if (password !== passwordConfirm) {
        showErrorMessage(elements.errorMessage, 'Passwords do not match');
        hideMessage(elements.successMessage);
        return false;
    }
    
    // Check password length
    if (password.length < 6) {
        showErrorMessage(elements.errorMessage, 'Password must be at least 6 characters long');
        hideMessage(elements.successMessage);
        return false;
    }
    
    return true;
}

/**
 * Get all form elements
 * @returns {Object} Object containing form element references
 */
function getFormElements() {
    return {
        submitButton: document.querySelector('button[type="submit"]'),
        submitText: document.getElementById('submit-text'),
        submitLoading: document.getElementById('submit-loading'),
        errorMessage: document.getElementById('error-message'),
        successMessage: document.getElementById('success-message')
    };
}

/**
 * Set loading state for the form
 * @param {Object} elements - Form elements object
 * @param {boolean} loading - Whether to show loading state
 */
function setLoadingState(elements, loading) {
    if (!elements.submitButton || !elements.submitText || !elements.submitLoading) return;
    
    elements.submitButton.disabled = loading;
    
    if (loading) {
        elements.submitText.classList.add('hidden');
        elements.submitLoading.classList.remove('hidden');
    } else {
        elements.submitText.classList.remove('hidden');
        elements.submitLoading.classList.add('hidden');
    }
}

/**
 * Show error message
 * @param {HTMLElement} errorElement - The error message element
 * @param {string} message - The error message to display
 */
function showErrorMessage(errorElement, message) {
    if (!errorElement) return;
    
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}

/**
 * Show success message
 * @param {HTMLElement} successElement - The success message element
 * @param {string} message - The success message to display
 */
function showSuccessMessage(successElement, message) {
    if (!successElement) return;
    
    successElement.textContent = message;
    successElement.classList.remove('hidden');
}

/**
 * Hide message element
 * @param {HTMLElement} messageElement - The message element to hide
 */
function hideMessage(messageElement) {
    if (!messageElement) return;
    
    messageElement.classList.add('hidden');
}

/**
 * Hide all message elements
 * @param {Object} elements - Form elements object
 */
function hideMessages(elements) {
    hideMessage(elements.errorMessage);
    hideMessage(elements.successMessage);
} 