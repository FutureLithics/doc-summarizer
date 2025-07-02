// public/js/organizations.js
/**
 * Organizations Management JavaScript - Handles organization management interface
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeOrganizationsPage();
});

/**
 * Initialize the organizations management page
 */
function initializeOrganizationsPage() {
    bindEventListeners();
    loadOrganizations();
}

/**
 * Bind event listeners
 */
function bindEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-orgs-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadOrganizations();
        });
    }

    // Retry button
    const retryBtn = document.getElementById('retry-load-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            loadOrganizations();
        });
    }

    // Add organization button (superadmin only)
    const addOrgBtn = document.getElementById('add-org-btn');
    if (addOrgBtn) {
        addOrgBtn.addEventListener('click', () => {
            showAddOrgModal();
        });
    }

    // Modal close buttons
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelAddBtn = document.getElementById('cancel-add-btn');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            hideAddOrgModal();
        });
    }
    
    if (cancelAddBtn) {
        cancelAddBtn.addEventListener('click', () => {
            hideAddOrgModal();
        });
    }

    // Add organization form
    const addOrgForm = document.getElementById('add-org-form');
    if (addOrgForm) {
        addOrgForm.addEventListener('submit', handleAddOrganization);
    }

    // Close modal when clicking outside
    const modal = document.getElementById('add-org-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideAddOrgModal();
            }
        });
    }

    // Event delegation for dynamically created delete buttons
    const orgsTableBody = document.getElementById('orgs-table-body');
    if (orgsTableBody) {
        orgsTableBody.addEventListener('click', (e) => {
            const target = e.target;
            const orgId = target.closest('tr')?.getAttribute('data-org-id');
            
            if (!orgId) return;

            if (target.classList.contains('delete-btn')) {
                e.preventDefault();
                deleteOrganization(orgId);
            }
        });
    }
}

/**
 * Show the add organization modal
 */
function showAddOrgModal() {
    const modal = document.getElementById('add-org-modal');
    const form = document.getElementById('add-org-form');
    const errorDiv = document.getElementById('add-org-error');
    
    // Reset form and hide error
    form.reset();
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
    
    // Show modal
    modal.classList.remove('hidden');
    
    // Focus on name input
    const nameInput = document.getElementById('org-name');
    if (nameInput) {
        setTimeout(() => nameInput.focus(), 100);
    }
}

/**
 * Hide the add organization modal
 */
function hideAddOrgModal() {
    const modal = document.getElementById('add-org-modal');
    modal.classList.add('hidden');
}

/**
 * Handle add organization form submission
 * @param {Event} event - Form submit event
 */
async function handleAddOrganization(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const orgData = {
        name: formData.get('name'),
        description: formData.get('description')
    };
    
    // Show loading state
    setAddOrgLoading(true);
    hideAddOrgError();
    
    try {
        const response = await fetch('/api/organizations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orgData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Success - hide modal and refresh organizations list
        hideAddOrgModal();
        loadOrganizations();
        
        console.log('Organization created successfully:', result);
        
    } catch (error) {
        console.error('Failed to create organization:', error);
        showAddOrgError(error.message);
    } finally {
        setAddOrgLoading(false);
    }
}

/**
 * Set loading state for add organization form
 * @param {boolean} loading - Whether form is in loading state
 */
function setAddOrgLoading(loading) {
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
 * Show error message in add organization form
 * @param {string} message - Error message to display
 */
function showAddOrgError(message) {
    const errorDiv = document.getElementById('add-org-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

/**
 * Hide error message in add organization form
 */
function hideAddOrgError() {
    const errorDiv = document.getElementById('add-org-error');
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
}

/**
 * Load organizations from the API
 */
async function loadOrganizations() {
    showLoadingState();
    
    try {
        const response = await fetch('/api/organizations', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const organizations = await response.json();
        displayOrganizations(organizations);
        updateStatistics(organizations);
        
    } catch (error) {
        console.error('Failed to load organizations:', error);
        showErrorState();
    }
}

/**
 * Display organizations in the table
 * @param {Array} organizations - Array of organization objects
 */
function displayOrganizations(organizations) {
    const tableContainer = document.getElementById('orgs-table-container');
    const emptyState = document.getElementById('orgs-empty');
    const loadingState = document.getElementById('orgs-loading');
    const errorState = document.getElementById('orgs-error');
    
    // Hide loading and error states
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    
    if (!organizations || organizations.length === 0) {
        // Show empty state
        tableContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    // Show table and populate with organizations
    emptyState.classList.add('hidden');
    tableContainer.classList.remove('hidden');
    
    const tableBody = document.getElementById('orgs-table-body');
    tableBody.innerHTML = '';
    
    organizations.forEach(org => {
        const row = createOrganizationRow(org);
        tableBody.appendChild(row);
    });
}

/**
 * Create a table row for an organization
 * @param {Object} org - Organization object
 * @returns {HTMLElement} Table row element
 */
function createOrganizationRow(org) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    row.setAttribute('data-org-id', org._id);
    
    // Format creation date
    const createdDate = new Date(org.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    // Check if current user is superadmin (from global user object)
    const isSuperAdmin = window.user && window.user.role === 'superadmin';
    
    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
                <div class="flex-shrink-0 h-10 w-10">
                    <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span class="text-blue-600 font-medium text-sm">
                            🏢
                        </span>
                    </div>
                </div>
                <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">
                        ${escapeHtml(org.name)}
                    </div>
                    <div class="text-sm text-gray-500">
                        ID: ${org._id}
                    </div>
                </div>
            </div>
        </td>
        <td class="px-6 py-4">
            <div class="text-sm text-gray-900">
                ${org.description ? escapeHtml(org.description) : '<span class="text-gray-400 italic">No description</span>'}
            </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            ${createdDate}
        </td>
        ${isSuperAdmin ? `
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <button class="text-red-600 hover:text-red-900 delete-btn">
                Delete
            </button>
        </td>
        ` : ''}
    `;
    
    return row;
}

/**
 * Delete organization
 * @param {string} orgId - Organization ID
 */
async function deleteOrganization(orgId) {
    const row = document.querySelector(`tr[data-org-id="${orgId}"]`);
    if (!row) return;

    const orgName = row.querySelector('.text-sm.font-medium.text-gray-900').textContent.trim();

    if (!confirm(`Are you sure you want to delete organization "${orgName}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/organizations/${orgId}`, {
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

        // Refresh the organizations list to update statistics
        loadOrganizations();

        console.log('Organization deleted successfully');

    } catch (error) {
        console.error('Failed to delete organization:', error);
        alert(`Failed to delete organization: ${error.message}`);
    }
}

/**
 * Update organization statistics
 * @param {Array} organizations - Array of organization objects
 */
function updateStatistics(organizations) {
    const totalOrgs = organizations.length;
    const activeOrgs = organizations.length; // All organizations are considered active for now
    
    // Update DOM elements
    const totalElement = document.getElementById('total-orgs');
    const activeElement = document.getElementById('active-orgs');
    
    if (totalElement) totalElement.textContent = totalOrgs;
    if (activeElement) activeElement.textContent = activeOrgs;
}

/**
 * Show loading state
 */
function showLoadingState() {
    const loadingState = document.getElementById('orgs-loading');
    const errorState = document.getElementById('orgs-error');
    const tableContainer = document.getElementById('orgs-table-container');
    const emptyState = document.getElementById('orgs-empty');
    
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    tableContainer.classList.add('hidden');
    emptyState.classList.add('hidden');
    
    // Reset statistics to loading state
    document.getElementById('total-orgs').textContent = '-';
    document.getElementById('active-orgs').textContent = '-';
}

/**
 * Show error state
 */
function showErrorState() {
    const loadingState = document.getElementById('orgs-loading');
    const errorState = document.getElementById('orgs-error');
    const tableContainer = document.getElementById('orgs-table-container');
    const emptyState = document.getElementById('orgs-empty');
    
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
    tableContainer.classList.add('hidden');
    emptyState.classList.add('hidden');
    
    // Reset statistics
    document.getElementById('total-orgs').textContent = '-';
    document.getElementById('active-orgs').textContent = '-';
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