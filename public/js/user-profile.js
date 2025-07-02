/**
 * User Profile JavaScript - Handles profile page functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    getProfileData();
    initializeProfilePage();
});

/**
 * Get profile data
 */
function getProfileData() {
    const profileData = document.getElementById('profile-data');

    // Store user data for JavaScript
    window.profileData = {
        userId: profileData.dataset.userId,
        isOwnProfile: profileData.dataset.isOwnProfile,
        userRole: profileData.dataset.userRole
    };
}

/**
 * Initialize the user profile page
 */
function initializeProfilePage() {
    bindEventListeners();
    loadUserStatistics();
    loadRecentExtractions();
}

/**
 * Bind event listeners
 */
function bindEventListeners() {
    // Edit profile button (for own profile)
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', showEditProfileModal);
    }

    // Edit user button (for admin viewing other users)
    const editUserBtn = document.getElementById('edit-user-btn');
    if (editUserBtn) {
        editUserBtn.addEventListener('click', () => {
            // Redirect to user management with edit mode
            window.location.href = `/users?edit=${window.profileData.userId}`;
        });
    }

    // Modal event listeners
    bindModalEventListeners();
}

/**
 * Bind modal event listeners
 */
function bindModalEventListeners() {
    const editModal = document.getElementById('edit-profile-modal');
    const closeModalBtn = document.getElementById('close-edit-modal');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const editForm = document.getElementById('edit-profile-form');

    // Change Password Modal
    const changePasswordModal = document.getElementById('change-password-modal');
    const closePasswordModalBtn = document.getElementById('close-password-modal');
    const cancelPasswordBtn = document.getElementById('cancel-password');
    const changePasswordForm = document.getElementById('change-password-form');
    const changePasswordBtn = document.getElementById('change-password-btn');

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideEditProfileModal);
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', hideEditProfileModal);
    }

    if (editForm) {
        editForm.addEventListener('submit', handleProfileUpdate);
    }

    // Change Password Modal Events
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', showChangePasswordModal);
    }

    if (closePasswordModalBtn) {
        closePasswordModalBtn.addEventListener('click', hideChangePasswordModal);
    }

    if (cancelPasswordBtn) {
        cancelPasswordBtn.addEventListener('click', hideChangePasswordModal);
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handlePasswordChange);
    }

    // Close modal when clicking outside
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                hideEditProfileModal();
            }
        });
    }

    if (changePasswordModal) {
        changePasswordModal.addEventListener('click', (e) => {
            if (e.target === changePasswordModal) {
                hideChangePasswordModal();
            }
        });
    }

    // Real-time password validation
    const newPasswordInput = document.getElementById('new-password-change');
    const confirmPasswordInput = document.getElementById('confirm-password');
    
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', validatePasswordStrength);
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    }
}

/**
 * Load user statistics including shared files
 */
async function loadUserStatistics() {
    try {
        // Load both owned and shared extractions for statistics
        const response = await fetch(`/api/extractions?userId=${window?.profileData?.userId}&includeShared=true`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const extractions = await response.json();
        
        // Calculate statistics
        const totalExtractions = extractions.length;
        const ownedExtractions = extractions.filter(ext => ext.isOwner).length;
        const sharedExtractions = extractions.filter(ext => ext.isShared && !ext.isOwner).length;
        const completedExtractions = extractions.filter(ext => ext.status === 'completed').length;
        const successRate = totalExtractions > 0 
            ? Math.round((completedExtractions / totalExtractions) * 100) 
            : 0;

        // Update DOM elements
        updateStatElement('total-extractions', totalExtractions);
        updateStatElement('completed-extractions', completedExtractions);
        updateStatElement('success-rate', `${successRate}%`);
        
        // Add shared files indicator if there are any
        if (sharedExtractions > 0) {
            updateStatElement('owned-extractions', ownedExtractions);
            updateStatElement('shared-extractions', sharedExtractions);
        }

    } catch (error) {
        console.error('Failed to load user statistics:', error);
        // Show fallback values
        updateStatElement('total-extractions', '0');
        updateStatElement('completed-extractions', '0');
        updateStatElement('success-rate', '0%');
    }
}

/**
 * Update a statistic element
 * @param {string} elementId - The ID of the element to update
 * @param {string|number} value - The value to display
 */
function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

/**
 * Load recent extractions for the user
 */
async function loadRecentExtractions() {
    const loadingState = document.getElementById('extractions-loading');
    const errorState = document.getElementById('extractions-error');
    const listContainer = document.getElementById('extractions-list');
    const emptyState = document.getElementById('extractions-empty');

    try {
        showExtractionsLoading();

        // Include both owned and shared extractions
        const response = await fetch(`/api/extractions?userId=${window?.profileData?.userId}&limit=5&includeShared=true`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const extractions = await response.json();
        
        if (extractions.length === 0) {
            showExtractionsEmpty();
        } else {
            displayRecentExtractions(extractions);
        }

    } catch (error) {
        console.error('Failed to load recent extractions:', error);
        showExtractionsError();
    }
}

/**
 * Display recent extractions
 * @param {Array} extractions - Array of extraction objects
 */
function displayRecentExtractions(extractions) {
    const listContainer = document.getElementById('extractions-list');
    const listContent = listContainer.querySelector('div');
    
    // Clear existing content
    listContent.innerHTML = '';
    
    extractions.forEach(extraction => {
        const extractionElement = createExtractionListItem(extraction);
        listContent.appendChild(extractionElement);
    });
    
    showExtractionsContent();
}

/**
 * Create an extraction list item with sharing indicators
 * @param {Object} extraction - Extraction object
 * @returns {HTMLElement} The created element
 */
function createExtractionListItem(extraction) {
    const item = document.createElement('div');
    item.className = 'px-6 py-4 hover:bg-gray-50';
    
    const statusClass = getStatusClass(extraction.status);
    const statusIcon = getStatusIcon(extraction.status);
    
    const truncatedSummary = extraction.summary 
        ? (extraction.summary.length > 100 ? extraction.summary.substring(0, 100) + '...' : extraction.summary)
        : 'No summary available';
    
    const createdDate = new Date(extraction.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    
    // Determine sharing status and icon
    const sharingInfo = getSharingInfo(extraction);
    
    item.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span class="text-blue-600 text-xs font-semibold">📄</span>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2">
                            <p class="text-sm font-medium text-gray-900 truncate">
                                ${escapeHtml(extraction.fileName || 'Unknown file')}
                            </p>
                            ${sharingInfo.badge}
                        </div>
                        <p class="text-sm text-gray-500 truncate">
                            ${escapeHtml(truncatedSummary)}
                        </p>
                        ${sharingInfo.ownerInfo}
                    </div>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                    ${statusIcon} ${extraction.status}
                </span>
                <span class="text-sm text-gray-500">${createdDate}</span>
                ${getActionButtons(extraction)}
            </div>
        </div>
    `;
    
    return item;
}


/**
 * Get status class for styling
 * @param {string} status - Extraction status
 * @returns {string} CSS classes
 */
function getStatusClass(status) {
    switch (status) {
        case 'completed':
            return 'bg-green-100 text-green-800';
        case 'processing':
            return 'bg-yellow-100 text-yellow-800';
        case 'failed':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

/**
 * Get status icon
 * @param {string} status - Extraction status
 * @returns {string} Icon/emoji
 */
function getStatusIcon(status) {
    switch (status) {
        case 'completed':
            return '✅';
        case 'processing':
            return '⏳';
        case 'failed':
            return '❌';
        default:
            return '❓';
    }
}

/**
 * Show edit profile modal
 */
function showEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    const errorDiv = document.getElementById('profile-error');
    
    // Hide any existing errors
    hideProfileError();
    
    // Show modal
    if (modal) {
        modal.classList.remove('hidden');
        
        // Focus on email input
        const emailInput = document.getElementById('profile-email');
        if (emailInput) {
            setTimeout(() => emailInput.focus(), 100);
        }
    }
}

/**
 * Hide edit profile modal
 */
function hideEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    const form = document.getElementById('edit-profile-form');
    
    if (modal) {
        modal.classList.add('hidden');
    }
    
    if (form) {
        form.reset();
        // Restore original email value
        const emailInput = document.getElementById('profile-email');
        if (emailInput) {
            emailInput.value = emailInput.getAttribute('value');
        }
    }
    
    hideProfileError();
}

/**
 * Handle profile update form submission
 * @param {Event} event - Form submit event
 */
async function handleProfileUpdate(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const updateData = {
        email: formData.get('email'),
        currentPassword: formData.get('currentPassword'),
        newPassword: formData.get('newPassword')
    };
    
    // Validate required current password
    if (!updateData.currentPassword) {
        showProfileError('Current password is required to make changes');
        return;
    }
    
    try {
        const response = await fetch(`/api/users/${window?.profileData?.userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Success - hide modal and reload page to show updated info
        hideEditProfileModal();
        window.location.reload();
        
    } catch (error) {
        console.error('Failed to update profile:', error);
        showProfileError(error.message);
    }
}

/**
 * Show profile error message
 * @param {string} message - Error message to display
 */
function showProfileError(message) {
    const errorDiv = document.getElementById('profile-error');
    const errorText = errorDiv.querySelector('p');
    
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

/**
 * Hide profile error message
 */
function hideProfileError() {
    const errorDiv = document.getElementById('profile-error');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}

/**
 * Show extractions loading state
 */
function showExtractionsLoading() {
    const loadingState = document.getElementById('extractions-loading');
    const errorState = document.getElementById('extractions-error');
    const listContainer = document.getElementById('extractions-list');
    const emptyState = document.getElementById('extractions-empty');
    
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    listContainer.classList.add('hidden');
    emptyState.classList.add('hidden');
}

/**
 * Show extractions error state
 */
function showExtractionsError() {
    const loadingState = document.getElementById('extractions-loading');
    const errorState = document.getElementById('extractions-error');
    const listContainer = document.getElementById('extractions-list');
    const emptyState = document.getElementById('extractions-empty');
    
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
    listContainer.classList.add('hidden');
    emptyState.classList.add('hidden');
}

/**
 * Show extractions content
 */
function showExtractionsContent() {
    const loadingState = document.getElementById('extractions-loading');
    const errorState = document.getElementById('extractions-error');
    const listContainer = document.getElementById('extractions-list');
    const emptyState = document.getElementById('extractions-empty');
    
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    listContainer.classList.remove('hidden');
    emptyState.classList.add('hidden');
}

/**
 * Show extractions empty state
 */
function showExtractionsEmpty() {
    const loadingState = document.getElementById('extractions-loading');
    const errorState = document.getElementById('extractions-error');
    const listContainer = document.getElementById('extractions-list');
    const emptyState = document.getElementById('extractions-empty');
    
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    listContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
} 

/**
 * Show change password modal
 */
function showChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    const errorDiv = document.getElementById('password-error');
    
    // Hide any existing errors
    hidePasswordError();
    
    // Reset password strength indicator
    resetPasswordStrengthIndicator();
    
    // Show modal
    if (modal) {
        modal.classList.remove('hidden');
        
        // Focus on current password input
        const currentPasswordInput = document.getElementById('current-password-change');
        if (currentPasswordInput) {
            setTimeout(() => currentPasswordInput.focus(), 100);
        }
    }
}

/**
 * Hide change password modal
 */
function hideChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    const form = document.getElementById('change-password-form');
    
    if (modal) {
        modal.classList.add('hidden');
    }
    
    if (form) {
        form.reset();
    }
    
    hidePasswordError();
    resetPasswordStrengthIndicator();
}

/**
 * Handle password change form submission
 * @param {Event} event - Form submit event
 */
async function handlePasswordChange(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const passwordData = {
        currentPassword: formData.get('currentPassword'),
        newPassword: formData.get('newPassword'),
        confirmPassword: formData.get('confirmPassword')
    };
    
    // Validate required fields
    if (!passwordData.currentPassword) {
        showPasswordError('Current password is required');
        return;
    }
    
    if (!passwordData.newPassword) {
        showPasswordError('New password is required');
        return;
    }
    
    if (!passwordData.confirmPassword) {
        showPasswordError('Please confirm your new password');
        return;
    }
    
    // Validate password strength
    const strengthValidation = validatePasswordComplexity(passwordData.newPassword);
    if (!strengthValidation.isValid) {
        showPasswordError(strengthValidation.message);
        return;
    }
    
    // Validate password match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
        showPasswordError('New passwords do not match');
        return;
    }
    
    // Validate new password is different from current
    if (passwordData.currentPassword === passwordData.newPassword) {
        showPasswordError('New password must be different from current password');
        return;
    }
    
    try {
        const response = await fetch(`/api/users/${window?.profileData?.userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Success - hide modal and show success message
        hideChangePasswordModal();
        showPasswordSuccessMessage();
        
    } catch (error) {
        console.error('Failed to change password:', error);
        showPasswordError(error.message);
    }
}

/**
 * Validate password complexity
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
function validatePasswordComplexity(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasNoSpaces = !/\s/.test(password);
    
    if (password.length < minLength) {
        return { isValid: false, message: `Password must be at least ${minLength} characters long` };
    }
    
    if (!hasUpperCase) {
        return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    if (!hasLowerCase) {
        return { isValid: false, message: 'Password must contain at least one lowercase letter' };
    }
    
    if (!hasNumbers) {
        return { isValid: false, message: 'Password must contain at least one number' };
    }
    
    if (!hasSpecialChar) {
        return { isValid: false, message: 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)' };
    }
    
    if (!hasNoSpaces) {
        return { isValid: false, message: 'Password cannot contain spaces' };
    }
    
    return { isValid: true, message: 'Password meets all requirements' };
}

/**
 * Validate password strength in real-time
 */
function validatePasswordStrength() {
    const passwordInput = document.getElementById('new-password-change');
    const strengthIndicator = document.getElementById('password-strength');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');
    
    if (!passwordInput || !strengthIndicator) return;
    
    const password = passwordInput.value;
    
    if (password.length === 0) {
        strengthIndicator.classList.add('hidden');
        return;
    }
    
    strengthIndicator.classList.remove('hidden');
    
    const validation = validatePasswordComplexity(password);
    let strength = 0;
    let strengthLabel = '';
    let colorClass = '';
    
    // Calculate strength score
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    if (!/\s/.test(password)) strength++;
    
    // Determine strength level
    if (strength <= 2) {
        strengthLabel = 'Weak';
        colorClass = 'bg-red-500';
    } else if (strength <= 4) {
        strengthLabel = 'Fair';
        colorClass = 'bg-yellow-500';
    } else if (strength <= 5) {
        strengthLabel = 'Good';
        colorClass = 'bg-blue-500';
    } else {
        strengthLabel = 'Strong';
        colorClass = 'bg-green-500';
    }
    
    // Update strength bar
    const percentage = (strength / 6) * 100;
    strengthBar.style.width = `${percentage}%`;
    strengthBar.className = `h-2 rounded-full transition-all duration-300 ${colorClass}`;
    strengthText.textContent = strengthLabel;
    strengthText.className = `text-sm font-medium ${colorClass.replace('bg-', 'text-')}`;
}

/**
 * Validate password match in real-time
 */
function validatePasswordMatch() {
    const newPasswordInput = document.getElementById('new-password-change');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const matchIndicator = document.getElementById('password-match');
    
    if (!newPasswordInput || !confirmPasswordInput || !matchIndicator) return;
    
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (confirmPassword.length === 0) {
        matchIndicator.classList.add('hidden');
        return;
    }
    
    matchIndicator.classList.remove('hidden');
    
    if (newPassword === confirmPassword) {
        matchIndicator.innerHTML = '<span class="text-green-600 text-sm">✓ Passwords match</span>';
    } else {
        matchIndicator.innerHTML = '<span class="text-red-600 text-sm">✗ Passwords do not match</span>';
    }
}

/**
 * Reset password strength indicator
 */
function resetPasswordStrengthIndicator() {
    const strengthIndicator = document.getElementById('password-strength');
    const matchIndicator = document.getElementById('password-match');
    
    if (strengthIndicator) {
        strengthIndicator.classList.add('hidden');
    }
    
    if (matchIndicator) {
        matchIndicator.classList.add('hidden');
    }
}

/**
 * Show password error message
 * @param {string} message - Error message to display
 */
function showPasswordError(message) {
    const errorDiv = document.getElementById('password-error');
    const errorText = errorDiv.querySelector('p');
    
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

/**
 * Hide password error message
 */
function hidePasswordError() {
    const errorDiv = document.getElementById('password-error');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}

/**
 * Show password success message
 */
function showPasswordSuccessMessage() {
    // Create temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 rounded-md p-4 z-50';
    successDiv.innerHTML = `
        <div class="flex items-center">
            <span class="text-green-600 mr-2">✓</span>
            <p class="text-green-800 font-medium">Password changed successfully!</p>
        </div>
    `;
    
    document.body.appendChild(successDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

/**
 * Get action buttons based on user permissions
 * @param {Object} extraction - Extraction object
 * @returns {string} HTML for action buttons
 */
function getActionButtons(extraction) {
    const isOwnProfile = window?.profileData?.isOwnProfile;
    const canEdit = extraction.canEdit;
    const canDelete = extraction.canDelete;
    
    if (!isOwnProfile) {
        return '';
    }
    
    let buttons = '';
    
    // View button - always available if user has access
    if (canEdit) {
        buttons += `<a href="/extraction/${extraction._id}" 
                       class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View →
                    </a>`;
    }
    
    return buttons;
}

/**
 * Get sharing information for an extraction
 * @param {Object} extraction - Extraction object
 * @returns {Object} Sharing info with badge and owner details
 */
function getSharingInfo(extraction) {
    const isOwner = extraction.isOwner;
    const isShared = extraction.isShared;
    
    let badge = '';
    let ownerInfo = '';
    
    if (isShared && !isOwner) {
        badge = `<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
            🔗 Shared
        </span>`;
        
        if (extraction.userId && extraction.userId.email) {
            ownerInfo = `<p class="text-xs text-gray-400">
                Shared by ${escapeHtml(extraction.userId.email)}
            </p>`;
        }
    } else if (isOwner && extraction.sharedWith && extraction.sharedWith.length > 0) {
        badge = `<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            👥 Shared with ${extraction.sharedWith.length}
        </span>`;
    }
    
    return { badge, ownerInfo };
}