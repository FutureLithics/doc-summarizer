/**
 * Login Page JavaScript - Handles login form submission and user authentication
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeLoginForm();
});

/**
 * Initialize login form functionality
 */
function initializeLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
}

/**
 * Handle login form submission
 * @param {Event} e - The form submit event
 */
async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');
    
    const elements = getFormElements();
    
    // Show loading state
    setLoadingState(elements, true);
    hideMessage(elements.errorMessage);
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Successful login - redirect to home or returnTo URL
            const urlParams = new URLSearchParams(window.location.search);
            const returnTo = urlParams.get('returnTo') || '/';
            window.location.href = returnTo;
        } else {
            // Show error message
            showErrorMessage(elements.errorMessage, data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showErrorMessage(elements.errorMessage, 'An error occurred. Please try again.');
    } finally {
        // Reset loading state
        setLoadingState(elements, false);
    }
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
        errorMessage: document.getElementById('error-message')
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
 * Hide message element
 * @param {HTMLElement} messageElement - The message element to hide
 */
function hideMessage(messageElement) {
    if (!messageElement) return;
    
    messageElement.classList.add('hidden');
} 