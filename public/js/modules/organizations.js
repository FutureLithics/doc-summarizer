/**
 * Organizations Module - Handles organization management functionality
 */

import { OrganizationApi } from './api.js';
import { Modal, ErrorDisplay, LoadingState, ButtonState, FormUtils } from './ui.js';
import { DateUtils, StringUtils } from './utils.js';

export class OrganizationManager {
    constructor() {
        this.organizations = [];
        this.currentOrganization = null;
        this.isEditMode = false;
        
        // Initialize modals
        this.organizationModal = new Modal('organization-modal');
        this.deleteModal = new Modal('delete-modal');
        
        this.init();
    }

    async init() {
        await this.loadOrganizations();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add organization buttons
        const addBtn = document.getElementById('add-organization-btn');
        const emptyAddBtn = document.getElementById('empty-add-organization-btn');
        
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }
        if (emptyAddBtn) {
            emptyAddBtn.addEventListener('click', () => this.showAddModal());
        }

        // Modal form submission
        const form = document.getElementById('organization-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Modal buttons
        const cancelBtn = document.getElementById('cancel-organization');
        const cancelDeleteBtn = document.getElementById('cancel-delete');
        const confirmDeleteBtn = document.getElementById('confirm-delete');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.organizationModal.hide());
        }
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => this.deleteModal.hide());
        }
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => this.handleDelete());
        }

        // Search functionality
        const searchInput = document.getElementById('search-organizations');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
        }

        // Event delegation for table buttons
        const tbody = document.getElementById('organizations-table-body');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                if (e.target.classList.contains('edit-btn')) {
                    const orgId = e.target.getAttribute('data-org-id');
                    this.editOrganization(orgId);
                } else if (e.target.classList.contains('delete-btn')) {
                    const orgId = e.target.getAttribute('data-org-id');
                    this.showDeleteModal(orgId);
                }
            });
        }
    }

    async loadOrganizations() {
        try {
            LoadingState.show('loading-organizations', 'empty-organizations');
            this.organizations = await OrganizationApi.getAll();
            this.renderOrganizations();
            this.updateStats();
        } catch (error) {
            console.error('Error loading organizations:', error);
            this.showError('Failed to load organizations');
        }
    }

    renderOrganizations(orgsToRender = this.organizations) {
        const tbody = document.getElementById('organizations-table-body');
        const loading = document.getElementById('loading-organizations');
        const empty = document.getElementById('empty-organizations');

        LoadingState.hide('loading-organizations');

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
                    <div class="text-sm font-medium text-gray-900">${StringUtils.escapeHtml(org.name)}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-600 max-w-xs truncate">
                        ${org.description ? StringUtils.escapeHtml(org.description) : '<span class="text-gray-400">No description</span>'}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ${DateUtils.formatDate(org.createdAt)}
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

    updateStats() {
        const totalElement = document.getElementById('total-organizations');
        const monthlyElement = document.getElementById('monthly-organizations');

        if (totalElement) {
            totalElement.textContent = this.organizations.length;
        }

        if (monthlyElement) {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlyCount = this.organizations.filter(org => {
                const orgDate = new Date(org.createdAt);
                return orgDate.getMonth() === currentMonth && orgDate.getFullYear() === currentYear;
            }).length;
            monthlyElement.textContent = monthlyCount;
        }
    }

    showAddModal() {
        this.isEditMode = false;
        this.currentOrganization = null;
        
        document.getElementById('modal-title').textContent = 'Add Organization';
        document.getElementById('save-organization').textContent = 'Save Organization';
        
        FormUtils.clearForm('organization-form');
        ErrorDisplay.hideInModal('organization-error');
        
        this.organizationModal.show();
        FormUtils.focusField('org-name');
    }

    editOrganization(id) {
        const org = this.organizations.find(o => o._id === id);
        if (!org) return;

        this.isEditMode = true;
        this.currentOrganization = org;
        
        document.getElementById('modal-title').textContent = 'Edit Organization';
        document.getElementById('save-organization').textContent = 'Update Organization';
        
        // Populate form
        document.getElementById('org-name').value = org.name;
        document.getElementById('org-description').value = org.description || '';
        
        ErrorDisplay.hideInModal('organization-error');
        this.organizationModal.show();
        FormUtils.focusField('org-name');
    }

    showDeleteModal(id) {
        const org = this.organizations.find(o => o._id === id);
        if (!org) return;

        this.currentOrganization = org;
        document.getElementById('delete-org-name').textContent = org.name;
        this.deleteModal.show();
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const data = FormUtils.getFormData('organization-form');
        if (!data.name) {
            ErrorDisplay.showInModal('organization-error', 'organization-error-text', 'Organization name is required');
            return;
        }

        ButtonState.setLoading('save-organization', 'Saving...');

        try {
            let result;
            if (this.isEditMode && this.currentOrganization) {
                result = await OrganizationApi.update(this.currentOrganization._id, data);
                // Update existing organization in the list
                const index = this.organizations.findIndex(o => o._id === this.currentOrganization._id);
                if (index !== -1) {
                    this.organizations[index] = result;
                }
            } else {
                result = await OrganizationApi.create(data);
                this.organizations.push(result);
            }

            this.renderOrganizations();
            this.updateStats();
            this.organizationModal.hide();

        } catch (error) {
            console.error('Error saving organization:', error);
            ErrorDisplay.showInModal('organization-error', 'organization-error-text', error.message || 'An error occurred while saving the organization');
        } finally {
            ButtonState.restore('save-organization');
        }
    }

    async handleDelete() {
        if (!this.currentOrganization) return;

        ButtonState.setLoading('confirm-delete', 'Deleting...');

        try {
            await OrganizationApi.delete(this.currentOrganization._id);

            // Remove from local list
            this.organizations = this.organizations.filter(o => o._id !== this.currentOrganization._id);
            
            this.renderOrganizations();
            this.updateStats();
            this.deleteModal.hide();
            ErrorDisplay.showAlert('Organization deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting organization:', error);
            ErrorDisplay.showAlert(error.message || 'An error occurred while deleting the organization');
        } finally {
            ButtonState.restore('confirm-delete');
        }
    }

    handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        
        if (!searchTerm) {
            this.renderOrganizations();
            return;
        }

        const filtered = this.organizations.filter(org => 
            org.name.toLowerCase().includes(searchTerm) ||
            (org.description && org.description.toLowerCase().includes(searchTerm))
        );

        this.renderOrganizations(filtered);
    }

    showError(message) {
        const loading = document.getElementById('loading-organizations');
        const tbody = document.getElementById('organizations-table-body');
        
        LoadingState.hide('loading-organizations');
        
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
                retryBtn.addEventListener('click', () => this.loadOrganizations());
            }
        }
    }
} 