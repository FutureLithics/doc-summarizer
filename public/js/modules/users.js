/**
 * Users Module - Handles user management functionality
 */

import { ApiService } from './api.js';
import { Modal, ErrorDisplay, LoadingState, ButtonState, FormUtils } from './ui.js';
import { DateUtils, StringUtils, ValidationUtils } from './utils.js';

// User-specific API methods
export class UserApi {
    static async getAll() {
        return ApiService.get('/api/users');
    }

    static async create(data) {
        return ApiService.post('/api/users', data);
    }

    static async update(id, data) {
        return ApiService.put(`/api/users/${id}`, data);
    }

    static async delete(id) {
        return ApiService.delete(`/api/users/${id}`);
    }

    static async updatePassword(id, data) {
        return ApiService.put(`/api/users/${id}/password`, data);
    }
}

export class UserManager {
    constructor() {
        this.users = [];
        this.organizations = [];
        this.currentUser = null;
        this.isEditMode = false;
        
        // Initialize modals
        this.userModal = new Modal('user-modal');
        this.deleteModal = new Modal('delete-modal');
        
        this.init();
    }

    async init() {
        await this.loadUsers();
        await this.loadOrganizations();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add user buttons
        const addBtn = document.getElementById('add-user-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-users-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadUsers());
        }

        // Modal form submission
        const form = document.getElementById('user-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Modal buttons
        const cancelBtn = document.getElementById('cancel-user');
        const cancelDeleteBtn = document.getElementById('cancel-delete');
        const confirmDeleteBtn = document.getElementById('confirm-delete');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.userModal.hide());
        }
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => this.deleteModal.hide());
        }
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => this.handleDelete());
        }

        // Search functionality
        const searchInput = document.getElementById('search-users');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
        }

        // Event delegation for table buttons
        const tbody = document.getElementById('users-table-body');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                if (e.target.classList.contains('edit-btn')) {
                    const userId = e.target.getAttribute('data-user-id');
                    this.editUser(userId);
                } else if (e.target.classList.contains('delete-btn')) {
                    const userId = e.target.getAttribute('data-user-id');
                    this.showDeleteModal(userId);
                }
            });
        }
    }

    async loadUsers() {
        try {
            console.log('Starting to load users...');
            LoadingState.show('loading-users', 'empty-users');
            
            console.log('Calling UserApi.getAll()...');
            this.users = await UserApi.getAll();
            console.log('Users loaded:', this.users);
            
            console.log('Rendering users...');
            this.renderUsers();
            
            console.log('Updating stats...');
            this.updateStats();
            
            console.log('Users loading completed successfully');
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users');
        }
    }

    async loadOrganizations() {
        try {
            this.organizations = await ApiService.get('/api/organizations');
            this.populateOrganizationSelect();
        } catch (error) {
            console.error('Error loading organizations:', error);
        }
    }

    populateOrganizationSelect() {
        const select = document.getElementById('user-organization');
        if (!select) return;

        select.innerHTML = '<option value="">Select Organization</option>' +
            this.organizations.map(org => 
                `<option value="${org._id}">${StringUtils.escapeHtml(org.name)}</option>`
            ).join('');
    }

    renderUsers(usersToRender = this.users) {
        const tbody = document.getElementById('users-table-body');
        const loading = document.getElementById('loading-users');
        const empty = document.getElementById('empty-users');
        const tableContainer = document.getElementById('users-table-container');

        LoadingState.hide('loading-users');

        if (usersToRender.length === 0) {
            tbody.innerHTML = '';
            if (empty) {
                empty.classList.remove('hidden');
            }
            if (tableContainer) {
                tableContainer.classList.add('hidden');
            }
            return;
        }

        // Show table container and hide empty state
        if (empty) {
            empty.classList.add('hidden');
        }
        if (tableContainer) {
            tableContainer.classList.remove('hidden');
        }

        tbody.innerHTML = usersToRender.map(user => {
            const org = this.organizations.find(o => o._id === user.organizationId);
            const roleBadgeClass = this.getRoleBadgeClass(user.role);
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${StringUtils.escapeHtml(user.email)}</div>
                        <div class="text-sm text-gray-500">ID: ${user._id}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${roleBadgeClass}">
                            ${StringUtils.capitalize(user.role)}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ${org ? StringUtils.escapeHtml(org.name) : '<span class="text-gray-400">No organization</span>'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ${DateUtils.formatDate(user.createdAt)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button data-user-id="${user._id}" class="text-blue-600 hover:text-blue-900 mr-3 edit-btn">
                            Edit
                        </button>
                        <button data-user-id="${user._id}" class="text-red-600 hover:text-red-900 delete-btn">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getRoleBadgeClass(role) {
        const classes = {
            'superadmin': 'bg-purple-100 text-purple-800',
            'admin': 'bg-blue-100 text-blue-800',
            'user': 'bg-green-100 text-green-800'
        };
        return classes[role] || 'bg-gray-100 text-gray-800';
    }

    updateStats() {
        const totalElement = document.getElementById('total-users');
        const adminElement = document.getElementById('admin-users');
        const regularElement = document.getElementById('regular-users');

        if (totalElement) {
            totalElement.textContent = this.users.length;
        }

        if (adminElement) {
            const adminCount = this.users.filter(user => 
                user.role === 'admin' || user.role === 'superadmin'
            ).length;
            adminElement.textContent = adminCount;
        }

        if (regularElement) {
            const regularCount = this.users.filter(user => 
                user.role === 'user'
            ).length;
            regularElement.textContent = regularCount;
        }
    }

    showAddModal() {
        this.isEditMode = false;
        this.currentUser = null;
        
        document.getElementById('modal-title').textContent = 'Add User';
        document.getElementById('save-user').textContent = 'Save User';
        
        FormUtils.clearForm('user-form');
        ErrorDisplay.hideInModal('user-error');
        
        this.userModal.show();
        FormUtils.focusField('user-email');
    }

    editUser(id) {
        const user = this.users.find(u => u._id === id);
        if (!user) return;

        this.isEditMode = true;
        this.currentUser = user;
        
        document.getElementById('modal-title').textContent = 'Edit User';
        document.getElementById('save-user').textContent = 'Update User';
        
        // Populate form
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-role').value = user.role;
        document.getElementById('user-organization').value = user.organizationId || '';
        
        // Hide password field for editing
        const passwordField = document.getElementById('user-password');
        const passwordContainer = passwordField?.closest('.mb-4');
        if (passwordContainer) {
            passwordContainer.style.display = 'none';
        }
        
        ErrorDisplay.hideInModal('user-error');
        this.userModal.show();
        FormUtils.focusField('user-email');
    }

    showDeleteModal(id) {
        const user = this.users.find(u => u._id === id);
        if (!user) return;

        this.currentUser = user;
        document.getElementById('delete-user-name').textContent = user.email;
        this.deleteModal.show();
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const data = FormUtils.getFormData('user-form');
        
        // Validation
        if (!ValidationUtils.isEmail(data.email)) {
            ErrorDisplay.showInModal('user-error', 'user-error-text', 'Please enter a valid email address');
            return;
        }
        
        if (!this.isEditMode && !ValidationUtils.isRequired(data.password)) {
            ErrorDisplay.showInModal('user-error', 'user-error-text', 'Password is required for new users');
            return;
        }

        ButtonState.setLoading('save-user', 'Saving...');

        try {
            let result;
            if (this.isEditMode && this.currentUser) {
                // Remove password from data if editing
                const { password, ...updateData } = data;
                result = await UserApi.update(this.currentUser._id, updateData);
                
                // Update existing user in the list
                const index = this.users.findIndex(u => u._id === this.currentUser._id);
                if (index !== -1) {
                    this.users[index] = result;
                }
            } else {
                result = await UserApi.create(data);
                this.users.push(result);
            }

            this.renderUsers();
            this.updateStats();
            this.userModal.hide();

        } catch (error) {
            console.error('Error saving user:', error);
            ErrorDisplay.showInModal('user-error', 'user-error-text', error.message || 'An error occurred while saving the user');
        } finally {
            ButtonState.restore('save-user');
        }
    }

    async handleDelete() {
        if (!this.currentUser) return;

        ButtonState.setLoading('confirm-delete', 'Deleting...');

        try {
            await UserApi.delete(this.currentUser._id);

            // Remove from local list
            this.users = this.users.filter(u => u._id !== this.currentUser._id);
            
            this.renderUsers();
            this.updateStats();
            this.deleteModal.hide();
            ErrorDisplay.showAlert('User deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting user:', error);
            ErrorDisplay.showAlert(error.message || 'An error occurred while deleting the user');
        } finally {
            ButtonState.restore('confirm-delete');
        }
    }

    handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        
        if (!searchTerm) {
            this.renderUsers();
            return;
        }

        const filtered = this.users.filter(user => 
            user.email.toLowerCase().includes(searchTerm) ||
            user.role.toLowerCase().includes(searchTerm)
        );

        this.renderUsers(filtered);
    }

    showError(message) {
        const loading = document.getElementById('loading-users');
        const tbody = document.getElementById('users-table-body');
        
        LoadingState.hide('loading-users');
        
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center">
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
                retryBtn.addEventListener('click', () => this.loadUsers());
            }
        }
    }
} 