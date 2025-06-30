/**
 * User Profile JavaScript - Handles profile page functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeProfilePage();
    getProfileData();
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

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideEditProfileModal);
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', hideEditProfileModal);
    }

    if (editForm) {
        editForm.addEventListener('submit', handleProfileUpdate);
    }

    // Close modal when clicking outside
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                hideEditProfileModal();
            }
        });
    }
}

/**
 * Load user statistics
 */
async function loadUserStatistics() {
    try {
        const response = await fetch(`/api/extractions?userId=${window?.profileData?.userId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const extractions = await response.json();
        
        // Calculate statistics
        const totalExtractions = extractions.length;
        const completedExtractions = extractions.filter(ext => ext.status === 'completed').length;
        const failedExtractions = extractions.filter(ext => ext.status === 'failed').length;
        const successRate = totalExtractions > 0 
            ? Math.round((completedExtractions / totalExtractions) * 100) 
            : 0;

        // Update DOM elements
        updateStatElement('total-extractions', totalExtractions);
        updateStatElement('completed-extractions', completedExtractions);
        updateStatElement('success-rate', `${successRate}%`);

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

        const response = await fetch(`/api/extractions?userId=${window?.profileData?.userId}&limit=5`);
        
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
 * Create an extraction list item
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
                        <p class="text-sm font-medium text-gray-900 truncate">
                            ${escapeHtml(extraction.fileName || 'Unknown file')}
                        </p>
                        <p class="text-sm text-gray-500 truncate">
                            ${escapeHtml(truncatedSummary)}
                        </p>
                    </div>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                    ${statusIcon} ${extraction.status}
                </span>
                <span class="text-sm text-gray-500">${createdDate}</span>
                ${window?.profileData?.isOwnProfile ? `
                    <a href="/extraction/${extraction._id}" 
                       class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View →
                    </a>
                ` : ''}
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