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
                    <div class="text-sm font-medium text-gray-900">
                        ${escapeHtml(user.email)}
                    </div>
                    <div class="text-sm text-gray-500">
                        ID: ${user.id || user._id}
                    </div>
                </div>
            </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleClass}">
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
    `;
    
    return row;
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
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
} 