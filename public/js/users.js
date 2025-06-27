/**
 * Users Management JavaScript - Handles user management interface for admin users
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeUsersPage();
});

/**
 * Initialize the users management page
 */
function initializeUsersPage() {
    bindEventListeners();
    loadUsers();
}

/**
 * Bind event listeners
 */
function bindEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-users-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadUsers();
        });
    }

    // Retry button
    const retryBtn = document.getElementById('retry-load-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            loadUsers();
        });
    }

    // Add user button
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            showAddUserModal();
        });
    }

    // Modal close buttons
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelAddBtn = document.getElementById('cancel-add-btn');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            hideAddUserModal();
        });
    }
    
    if (cancelAddBtn) {
        cancelAddBtn.addEventListener('click', () => {
            hideAddUserModal();
        });
    }

    // Add user form
    const addUserForm = document.getElementById('add-user-form');
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUser);
    }

    // Close modal when clicking outside
    const modal = document.getElementById('add-user-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideAddUserModal();
            }
        });
    }

    // Event delegation for dynamically created user action buttons
    const usersTableBody = document.getElementById('users-table-body');
    if (usersTableBody) {
        usersTableBody.addEventListener('click', (e) => {
            const target = e.target;
            const userId = target.closest('tr')?.getAttribute('data-user-id');
            
            if (!userId) return;

            if (target.classList.contains('edit-btn')) {
                e.preventDefault();
                editUser(userId);
            } else if (target.classList.contains('delete-btn')) {
                e.preventDefault();
                deleteUser(userId);
            } else if (target.classList.contains('save-btn')) {
                e.preventDefault();
                saveUser(userId);
            } else if (target.classList.contains('cancel-btn')) {
                e.preventDefault();
                cancelEdit(userId);
            }
        });
    }
}

/**
 * Show the add user modal
 */
function showAddUserModal() {
    const modal = document.getElementById('add-user-modal');
    const form = document.getElementById('add-user-form');
    const errorDiv = document.getElementById('add-user-error');
    
    // Reset form and hide error
    form.reset();
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
    
    // Show modal
    modal.classList.remove('hidden');
    
    // Focus on email input
    const emailInput = document.getElementById('user-email');
    if (emailInput) {
        setTimeout(() => emailInput.focus(), 100);
    }
}

/**
 * Hide the add user modal
 */
function hideAddUserModal() {
    const modal = document.getElementById('add-user-modal');
    modal.classList.add('hidden');
}

/**
 * Handle add user form submission
 * @param {Event} event - Form submit event
 */
async function handleAddUser(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const userData = {
        email: formData.get('email'),
        role: formData.get('role'),
        password: formData.get('password')
    };
    
    // Show loading state
    setAddUserLoading(true);
    hideAddUserError();
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Success - hide modal and refresh users list
        hideAddUserModal();
        loadUsers();
        
        // Show success message (you could add a toast notification here)
        console.log('User created successfully:', result);
        
    } catch (error) {
        console.error('Failed to create user:', error);
        showAddUserError(error.message);
    } finally {
        setAddUserLoading(false);
    }
}

/**
 * Set loading state for add user form
 * @param {boolean} loading - Whether form is in loading state
 */
function setAddUserLoading(loading) {
    const submitBtn = document.getElementById('submit-add-btn');
    const submitText = document.getElementById('submit-btn-text');
    const submitLoading = document.getElementById('submit-btn-loading');
    
    if (loading) {
        submitBtn.disabled = true;
        submitText.classList.add('hidden');
        submitLoading.classList.remove('hidden');
    } else {
        submitBtn.disabled = false;
        submitText.classList.remove('hidden');
        submitLoading.classList.add('hidden');
    }
}

/**
 * Show error message in add user form
 * @param {string} message - Error message to display
 */
function showAddUserError(message) {
    const errorDiv = document.getElementById('add-user-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

/**
 * Hide error message in add user form
 */
function hideAddUserError() {
    const errorDiv = document.getElementById('add-user-error');
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
}

/**
 * Load users from the API
 */
async function loadUsers() {
    showLoadingState();
    
    try {
        const response = await fetch('/api/users', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const users = await response.json();
        displayUsers(users);
        updateStatistics(users);
        
    } catch (error) {
        console.error('Failed to load users:', error);
        showErrorState();
    }
}

/**
 * Display users in the table
 * @param {Array} users - Array of user objects
 */
function displayUsers(users) {
    const tableContainer = document.getElementById('users-table-container');
    const emptyState = document.getElementById('users-empty');
    const loadingState = document.getElementById('users-loading');
    const errorState = document.getElementById('users-error');
    
    // Hide loading and error states
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    
    if (!users || users.length === 0) {
        // Show empty state
        tableContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    // Show table and populate with users
    emptyState.classList.add('hidden');
    tableContainer.classList.remove('hidden');
    
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = '';
    
    users.forEach(user => {
        const row = createUserRow(user);
        tableBody.appendChild(row);
    });
}

/**
 * Create a table row for a user
 * @param {Object} user - User object
 * @returns {HTMLElement} Table row element
 */
function createUserRow(user) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    row.setAttribute('data-user-id', user.id || user._id);
    
    // Format creation date
    const createdDate = new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    // Determine role badge styling
    const roleClass = user.role === 'admin' 
        ? 'bg-purple-100 text-purple-800' 
        : 'bg-gray-100 text-gray-800';
    
    // Determine status (for future use - currently all active)
    const status = 'Active';
    const statusClass = 'bg-green-100 text-green-800';
    
    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
                <div class="flex-shrink-0 h-10 w-10">
                    <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span class="text-blue-600 font-medium text-sm">
                            ${user.email.charAt(0).toUpperCase()}
                        </span>
                    </div>
                </div>
                <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900 user-email" data-original="${escapeHtml(user.email)}">
                        ${escapeHtml(user.email)}
                    </div>
                    <div class="text-sm text-gray-500">
                        ID: ${user.id || user._id}
                    </div>
                </div>
            </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleClass} user-role" data-original="${user.role}">
                ${user.role === 'admin' ? '👑 Admin' : '👤 User'}
            </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            ${createdDate}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                ${status}
            </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <div class="flex space-x-2 justify-end">
                <button class="text-indigo-600 hover:text-indigo-900 edit-btn">
                    Edit
                </button>
                <button class="text-red-600 hover:text-red-900 delete-btn">
                    Delete
                </button>
            </div>
        </td>
    `;
    
    return row;
}

/**
 * Edit user inline
 * @param {string} userId - User ID
 */
function editUser(userId) {
    const row = document.querySelector(`tr[data-user-id="${userId}"]`);
    if (!row) return;

    const emailElement = row.querySelector('.user-email');
    const roleElement = row.querySelector('.user-role');
    const actionsCell = row.querySelector('td:last-child');

    const originalEmail = emailElement.getAttribute('data-original');
    const originalRole = roleElement.getAttribute('data-original');

    // Replace email with input
    emailElement.innerHTML = `
        <input type="email" 
               class="edit-email-input w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
               value="${originalEmail}">
    `;

    // Add real-time email validation
    const emailInput = emailElement.querySelector('.edit-email-input');
    emailInput.addEventListener('input', function() {
        const email = this.value.trim();
        
        // Clear previous errors first
        clearInlineError(this);
        
        // Only validate if there's content (allow empty during typing)
        if (email && email.length > 0) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showInlineError(this, 'Please enter a valid email address');
            }
        }
    });

    // Focus the email input
    emailInput.focus();

    // Replace role with select
    roleElement.innerHTML = `
        <select class="edit-role-select px-2 py-1 border border-gray-300 rounded text-xs">
            <option value="user" ${originalRole === 'user' ? 'selected' : ''}>👤 User</option>
            <option value="admin" ${originalRole === 'admin' ? 'selected' : ''}>👑 Admin</option>
        </select>
    `;

    // Replace actions with save/cancel buttons
    actionsCell.innerHTML = `
        <div class="flex space-x-2 justify-end">
            <button class="text-green-600 hover:text-green-900 save-btn">
                Save
            </button>
            <button class="text-gray-600 hover:text-gray-900 cancel-btn">
                Cancel
            </button>
        </div>
    `;
}

/**
 * Cancel edit mode
 * @param {string} userId - User ID
 */
function cancelEdit(userId) {
    const row = document.querySelector(`tr[data-user-id="${userId}"]`);
    if (!row) return;

    const emailElement = row.querySelector('.user-email');
    const roleElement = row.querySelector('.user-role');
    const actionsCell = row.querySelector('td:last-child');

    // Clear any inline errors before canceling
    const emailInput = emailElement.querySelector('.edit-email-input');
    if (emailInput) {
        clearInlineError(emailInput);
    }

    const originalEmail = emailElement.getAttribute('data-original');
    const originalRole = roleElement.getAttribute('data-original');

    // Restore original email
    emailElement.innerHTML = escapeHtml(originalEmail);

    // Restore original role
    const roleClass = originalRole === 'admin' 
        ? 'bg-purple-100 text-purple-800' 
        : 'bg-gray-100 text-gray-800';
    
    roleElement.className = `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleClass} user-role`;
    roleElement.innerHTML = originalRole === 'admin' ? '👑 Admin' : '👤 User';

    // Restore original actions
    actionsCell.innerHTML = `
        <div class="flex space-x-2 justify-end">
            <button class="text-indigo-600 hover:text-indigo-900 edit-btn">
                Edit
            </button>
            <button class="text-red-600 hover:text-red-900 delete-btn">
                Delete
            </button>
        </div>
    `;
}

/**
 * Save user changes
 * @param {string} userId - User ID
 */
async function saveUser(userId) {
    const row = document.querySelector(`tr[data-user-id="${userId}"]`);
    if (!row) return;

    const emailInput = row.querySelector('.edit-email-input');
    const roleSelect = row.querySelector('.edit-role-select');

    const newEmail = emailInput.value.trim();
    const newRole = roleSelect.value;

    // Validate email is not empty
    if (!newEmail) {
        showInlineError(emailInput, 'Email is required');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
        showInlineError(emailInput, 'Please enter a valid email address');
        return;
    }

    // Remove any existing error styling
    clearInlineError(emailInput);

    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: newEmail,
                role: newRole
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Update the row with new data
        const emailElement = row.querySelector('.user-email');
        const roleElement = row.querySelector('.user-role');
        const actionsCell = row.querySelector('td:last-child');

        // Update email
        emailElement.setAttribute('data-original', result.email);
        emailElement.innerHTML = escapeHtml(result.email);

        // Update role
        const roleClass = result.role === 'admin' 
            ? 'bg-purple-100 text-purple-800' 
            : 'bg-gray-100 text-gray-800';
        
        roleElement.setAttribute('data-original', result.role);
        roleElement.className = `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleClass} user-role`;
        roleElement.innerHTML = result.role === 'admin' ? '👑 Admin' : '👤 User';

        // Restore actions
        actionsCell.innerHTML = `
            <div class="flex space-x-2 justify-end">
                <button class="text-indigo-600 hover:text-indigo-900 edit-btn">
                    Edit
                </button>
                <button class="text-red-600 hover:text-red-900 delete-btn">
                    Delete
                </button>
            </div>
        `;

        // Refresh statistics
        loadUsers();

    } catch (error) {
        console.error('Failed to update user:', error);
        
        // Show error on the email input if it's an email-related error
        if (error.message.toLowerCase().includes('email')) {
            showInlineError(emailInput, error.message);
        } else {
            // For other errors, show a general alert
            alert(`Failed to update user: ${error.message}`);
        }
    }
}

/**
 * Delete user
 * @param {string} userId - User ID
 */
async function deleteUser(userId) {
    const row = document.querySelector(`tr[data-user-id="${userId}"]`);
    if (!row) return;

    const emailElement = row.querySelector('.user-email');
    const userEmail = emailElement.getAttribute('data-original');

    if (!confirm(`Are you sure you want to delete user "${userEmail}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Remove the row from the table
        row.remove();

        // Refresh the users list to update statistics
        loadUsers();

        console.log('User deleted successfully');

    } catch (error) {
        console.error('Failed to delete user:', error);
        alert(`Failed to delete user: ${error.message}`);
    }
}

/**
 * Update user statistics
 * @param {Array} users - Array of user objects
 */
function updateStatistics(users) {
    const totalUsers = users.length;
    const adminUsers = users.filter(user => user.role === 'admin').length;
    const regularUsers = users.filter(user => user.role === 'user').length;
    
    // Update DOM elements
    const totalElement = document.getElementById('total-users');
    const adminElement = document.getElementById('admin-users');
    const regularElement = document.getElementById('regular-users');
    
    if (totalElement) totalElement.textContent = totalUsers;
    if (adminElement) adminElement.textContent = adminUsers;
    if (regularElement) regularElement.textContent = regularUsers;
}

/**
 * Show loading state
 */
function showLoadingState() {
    const loadingState = document.getElementById('users-loading');
    const errorState = document.getElementById('users-error');
    const tableContainer = document.getElementById('users-table-container');
    const emptyState = document.getElementById('users-empty');
    
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    tableContainer.classList.add('hidden');
    emptyState.classList.add('hidden');
    
    // Reset statistics to loading state
    document.getElementById('total-users').textContent = '-';
    document.getElementById('admin-users').textContent = '-';
    document.getElementById('regular-users').textContent = '-';
}

/**
 * Show error state
 */
function showErrorState() {
    const loadingState = document.getElementById('users-loading');
    const errorState = document.getElementById('users-error');
    const tableContainer = document.getElementById('users-table-container');
    const emptyState = document.getElementById('users-empty');
    
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
    tableContainer.classList.add('hidden');
    emptyState.classList.add('hidden');
    
    // Reset statistics
    document.getElementById('total-users').textContent = '-';
    document.getElementById('admin-users').textContent = '-';
    document.getElementById('regular-users').textContent = '-';
}

/**
 * Show inline error for form input
 * @param {HTMLElement} input - Input element to show error for
 * @param {string} message - Error message to display
 */
function showInlineError(input, message) {
    // Remove any existing error
    clearInlineError(input);
    
    // Add error styling to input
    input.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
    input.classList.remove('border-gray-300', 'focus:border-blue-500', 'focus:ring-blue-500');
    
    // Create and insert error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'inline-error-message text-red-500 text-xs mt-1';
    errorDiv.textContent = message;
    
    // Insert error message after the input
    input.parentNode.insertBefore(errorDiv, input.nextSibling);
    
    // Focus the input
    input.focus();
}

/**
 * Clear inline error for form input
 * @param {HTMLElement} input - Input element to clear error for
 */
function clearInlineError(input) {
    // Remove error styling from input
    input.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
    input.classList.add('border-gray-300', 'focus:border-blue-500', 'focus:ring-blue-500');
    
    // Remove any existing error message
    const existingError = input.parentNode.querySelector('.inline-error-message');
    if (existingError) {
        existingError.remove();
    }
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