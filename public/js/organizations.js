// public/js/organizations.js
/**
 * Organizations Management JavaScript - Handles organization management interface
 */

// Organizations management functionality
let organizations = [];
let currentOrganization = null;
let isEditMode = false;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    loadOrganizations();
    setupEventListeners();
});

function setupEventListeners() {
    // Add organization button
    const addBtn = document.getElementById('add-organization-btn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddOrganizationModal);
    }

    // Empty state add button
    const emptyAddBtn = document.getElementById('empty-add-organization-btn');
    if (emptyAddBtn) {
        emptyAddBtn.addEventListener('click', showAddOrganizationModal);
    }

    // Modal form submission
    const form = document.getElementById('organization-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Modal cancel buttons
    const cancelBtn = document.getElementById('cancel-organization');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideOrganizationModal);
    }

    const cancelDeleteBtn = document.getElementById('cancel-delete');
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', hideDeleteModal);
    }

    // Confirm delete button
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleDeleteConfirm);
    }

    // Search functionality
    const searchInput = document.getElementById('search-organizations');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Event delegation for dynamically created buttons
    const tbody = document.getElementById('organizations-table-body');
    if (tbody) {
        tbody.addEventListener('click', function(e) {
            if (e.target.classList.contains('edit-btn')) {
                const orgId = e.target.getAttribute('data-org-id');
                editOrganization(orgId);
            } else if (e.target.classList.contains('delete-btn')) {
                const orgId = e.target.getAttribute('data-org-id');
                deleteOrganization(orgId);
            }
        });
    }

    // Close modals when clicking outside
    document.getElementById('organization-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideOrganizationModal();
        }
    });

    document.getElementById('delete-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideDeleteModal();
        }
    });
}

async function loadOrganizations() {
    try {
        showLoading();
        const response = await fetch('/api/organizations');
        
        if (!response.ok) {
            throw new Error('Failed to load organizations');
        }

        organizations = await response.json();
        renderOrganizations(organizations);
        updateStats();
        
    } catch (error) {
        console.error('Error loading organizations:', error);
        showError('Failed to load organizations');
    }
}

function renderOrganizations(orgsToRender = organizations) {
    const tbody = document.getElementById('organizations-table-body');
    const loading = document.getElementById('loading-organizations');
    const empty = document.getElementById('empty-organizations');

    // Hide loading
    if (loading) {
        loading.style.display = 'none';
    }

    if (orgsToRender.length === 0) {
        tbody.innerHTML = '';
        if (empty) {
            empty.classList.remove('hidden');
        }
        return;
    }

    if (empty) {
        empty.classList.add('hidden');
    }

    tbody.innerHTML = orgsToRender.map(org => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${escapeHtml(org.name)}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-600 max-w-xs truncate">
                    ${org.description ? escapeHtml(org.description) : '<span class="text-gray-400">No description</span>'}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                ${formatDate(org.createdAt)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button data-org-id="${org._id}" class="text-blue-600 hover:text-blue-900 mr-3 edit-btn">
                    Edit
                </button>
                <button data-org-id="${org._id}" class="text-red-600 hover:text-red-900 delete-btn">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function updateStats() {
    const totalElement = document.getElementById('total-organizations');
    const monthlyElement = document.getElementById('monthly-organizations');

    if (totalElement) {
        totalElement.textContent = organizations.length;
    }

    if (monthlyElement) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyCount = organizations.filter(org => {
            const orgDate = new Date(org.createdAt);
            return orgDate.getMonth() === currentMonth && orgDate.getFullYear() === currentYear;
        }).length;
        monthlyElement.textContent = monthlyCount;
    }
}

function showAddOrganizationModal() {
    isEditMode = false;
    currentOrganization = null;
    
    document.getElementById('modal-title').textContent = 'Add Organization';
    document.getElementById('save-organization').textContent = 'Save Organization';
    
    // Clear form
    document.getElementById('organization-form').reset();
    
    showOrganizationModal();
}

function editOrganization(id) {
    const org = organizations.find(o => o._id === id);
    if (!org) return;

    isEditMode = true;
    currentOrganization = org;
    
    document.getElementById('modal-title').textContent = 'Edit Organization';
    document.getElementById('save-organization').textContent = 'Update Organization';
    
    // Populate form
    document.getElementById('org-name').value = org.name;
    document.getElementById('org-description').value = org.description || '';
    
    showOrganizationModal();
}

function deleteOrganization(id) {
    const org = organizations.find(o => o._id === id);
    if (!org) return;

    currentOrganization = org;
    document.getElementById('delete-org-name').textContent = org.name;
    showDeleteModal();
}

function showOrganizationModal() {
    document.getElementById('organization-modal').classList.remove('hidden');
    hideModalError();
    document.getElementById('org-name').focus();
}

function hideOrganizationModal() {
    document.getElementById('organization-modal').classList.add('hidden');
    document.getElementById('organization-form').reset();
    currentOrganization = null;
    isEditMode = false;
}

function showDeleteModal() {
    document.getElementById('delete-modal').classList.remove('hidden');
}

function hideDeleteModal() {
    document.getElementById('delete-modal').classList.add('hidden');
    currentOrganization = null;
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name').trim(),
        description: formData.get('description').trim()
    };

    if (!data.name) {
        showNotification('Organization name is required', 'error');
        return;
    }

    const saveBtn = document.getElementById('save-organization');
    const originalText = saveBtn.textContent;

    try {
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        let response;
        if (isEditMode && currentOrganization) {
            response = await fetch(`/api/organizations/${currentOrganization._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch('/api/organizations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        }

        if (!response.ok) {
            let errorMessage = 'Failed to save organization';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (jsonError) {
                console.warn('Failed to parse error response as JSON:', jsonError);
                errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        
        if (isEditMode) {
            // Update existing organization in the list
            const index = organizations.findIndex(o => o._id === currentOrganization._id);
            if (index !== -1) {
                organizations[index] = result;
            }
        } else {
            // Add new organization to the list
            organizations.push(result);
        }

        renderOrganizations();
        updateStats();
        hideOrganizationModal();

    } catch (error) {
        console.error('Error saving organization:', error);
        showModalError(error.message || 'An error occurred while saving the organization');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

async function handleDeleteConfirm() {
    if (!currentOrganization) return;

    const deleteBtn = document.getElementById('confirm-delete');
    const originalText = deleteBtn.textContent;

    try {
        deleteBtn.textContent = 'Deleting...';
        deleteBtn.disabled = true;

        const response = await fetch(`/api/organizations/${currentOrganization._id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            let errorMessage = 'Failed to delete organization';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (jsonError) {
                console.warn('Failed to parse error response as JSON:', jsonError);
                errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        // Remove from local list
        organizations = organizations.filter(o => o._id !== currentOrganization._id);
        
        renderOrganizations();
        updateStats();
        hideDeleteModal();
        alert('Organization deleted successfully');

    } catch (error) {
        console.error('Error deleting organization:', error);
        alert('Error: ' + (error.message || 'An error occurred while deleting the organization'));
    } finally {
        deleteBtn.textContent = originalText;
        deleteBtn.disabled = false;
    }
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (!searchTerm) {
        renderOrganizations();
        return;
    }

    const filtered = organizations.filter(org => 
        org.name.toLowerCase().includes(searchTerm) ||
        (org.description && org.description.toLowerCase().includes(searchTerm))
    );

    renderOrganizations(filtered);
}

function showLoading() {
    const loading = document.getElementById('loading-organizations');
    const empty = document.getElementById('empty-organizations');
    
    if (loading) {
        loading.style.display = 'block';
    }
    if (empty) {
        empty.classList.add('hidden');
    }
}

function showError(message) {
    const loading = document.getElementById('loading-organizations');
    const tbody = document.getElementById('organizations-table-body');
    
    if (loading) {
        loading.style.display = 'none';
    }
    
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-8 text-center">
                    <div class="text-red-600 mb-2">⚠️ ${message}</div>
                    <button class="text-blue-600 hover:text-blue-800 text-sm retry-load-btn">
                        Try again
                    </button>
                </td>
            </tr>
        `;
        
        // Add event listener for retry button
        const retryBtn = tbody.querySelector('.retry-load-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', loadOrganizations);
        }
    }
}

// Utility functions

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Removed complex toast notification system - using simple modal errors instead

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Organization management system

// Simple error display for modal
function showModalError(message) {
    const errorContainer = document.getElementById('organization-error');
    const errorText = document.getElementById('organization-error-text');
    
    if (errorContainer && errorText) {
        errorText.textContent = message;
        errorContainer.classList.remove('hidden');
    } else {
        // Fallback to alert if modal elements not found
        alert('Error: ' + message);
    }
}

function hideModalError() {
    const errorContainer = document.getElementById('organization-error');
    if (errorContainer) {
        errorContainer.classList.add('hidden');
    }
}

