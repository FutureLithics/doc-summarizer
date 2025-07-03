/**
 * Extraction Detail Module - Handles individual extraction page functionality
 */

import { ApiService } from './api.js';
import { Modal, ErrorDisplay, ButtonState } from './ui.js';
import { StringUtils, ValidationUtils } from './utils.js';
import { ExtractionsApi } from './extractions.js';

export class ExtractionEditor {
    constructor(extractionId) {
        this.extractionId = extractionId;
        this.isEditMode = false;
        this.originalValues = {};
        this.elements = {};
        this.init();
    }

    init() {
        if (!this.initializeElements()) {
            console.warn('Edit mode: Required elements not found');
            return;
        }
        this.bindEvents();
    }

    initializeElements() {
        this.elements = {
            editBtn: document.getElementById('edit-btn'),
            editBtnText: document.getElementById('edit-btn-text'),
            cancelBtn: document.getElementById('cancel-btn'),
            saveBtn: document.getElementById('save-btn'),
            editActions: document.getElementById('edit-actions'),
            
            // Display elements
            displayFilename: document.getElementById('display-filename'),
            displayFilenameInfo: document.getElementById('display-filename-info'),
            displaySummary: document.getElementById('display-summary'),
            
            // Edit elements
            editFilename: document.getElementById('edit-filename'),
            editFilenameInfo: document.getElementById('edit-filename-info'),
            editSummary: document.getElementById('edit-summary')
        };

        return this.elements.editBtn && 
               (this.elements.displayFilename || this.elements.displayFilenameInfo) &&
               (this.elements.editFilename || this.elements.editFilenameInfo);
    }

    bindEvents() {
        this.elements.editBtn.addEventListener('click', () => this.enterEditMode());
        this.elements.cancelBtn?.addEventListener('click', () => this.cancelEdit());
        this.elements.saveBtn?.addEventListener('click', () => this.saveChanges());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Handle Enter key in filename fields
        this.elements.editFilename?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.elements.editSummary) {
                    this.elements.editSummary.focus();
                } else {
                    this.saveChanges();
                }
            }
        });

        // Sync filename inputs when either changes
        this.elements.editFilename?.addEventListener('input', (e) => {
            if (this.elements.editFilenameInfo) {
                this.elements.editFilenameInfo.value = e.target.value;
            }
        });

        this.elements.editFilenameInfo?.addEventListener('input', (e) => {
            if (this.elements.editFilename) {
                this.elements.editFilename.value = e.target.value;
            }
        });
    }

    storeOriginalValues() {
        this.originalValues = {
            filename: this.elements.displayFilename?.textContent || this.elements.displayFilenameInfo?.textContent || '',
            summary: this.elements.displaySummary?.textContent || ''
        };
    }

    enterEditMode() {
        if (this.isEditMode) return;
        
        this.storeOriginalValues();
        this.isEditMode = true;
        
        // Copy values to edit fields
        if (this.elements.editFilename) {
            this.elements.editFilename.value = this.originalValues.filename;
        }
        if (this.elements.editFilenameInfo) {
            this.elements.editFilenameInfo.value = this.originalValues.filename;
        }
        if (this.elements.editSummary) {
            this.elements.editSummary.value = this.originalValues.summary;
        }
        
        this.toggleDisplayElements(false);
        this.toggleEditElements(true);
        this.updateEditButtonState(true);
        this.showEditActions(true);
        
        // Focus on first edit field
        const firstField = this.elements.editFilename || this.elements.editFilenameInfo;
        if (firstField) {
            setTimeout(() => firstField.focus(), 100);
        }
    }

    exitEditMode() {
        this.isEditMode = false;
        this.toggleDisplayElements(true);
        this.toggleEditElements(false);
        this.updateEditButtonState(false);
        this.showEditActions(false);
    }

    cancelEdit() {
        this.exitEditMode();
        this.showNotification('Changes cancelled', 'info');
    }

    async saveChanges() {
        if (!this.isEditMode) return;
        
        const newFilename = this.elements.editFilename?.value?.trim() || this.elements.editFilenameInfo?.value?.trim() || '';
        const newSummary = this.elements.editSummary?.value?.trim() || '';
        
        // Validation
        if (!ValidationUtils.isRequired(newFilename)) {
            this.showNotification('Filename is required', 'error');
            return;
        }
        
        if (!ValidationUtils.minLength(newFilename, 1) || !ValidationUtils.maxLength(newFilename, 255)) {
            this.showNotification('Filename must be between 1 and 255 characters', 'error');
            return;
        }
        
        if (newSummary && !ValidationUtils.maxLength(newSummary, 1000)) {
            this.showNotification('Summary must be 1000 characters or less', 'error');
            return;
        }
        
        // Check if anything changed
        if (newFilename === this.originalValues.filename && newSummary === this.originalValues.summary) {
            this.exitEditMode();
            this.showNotification('No changes to save', 'info');
            return;
        }
        
        try {
            this.setSaveButtonLoading(true);
            
            const updateData = {
                fileName: newFilename,
                summary: newSummary
            };
            
            await ApiService.put(`/api/extractions/${this.extractionId}`, updateData);
            
            // Update display elements
            if (this.elements.displayFilename) {
                this.elements.displayFilename.textContent = newFilename;
            }
            if (this.elements.displayFilenameInfo) {
                this.elements.displayFilenameInfo.textContent = newFilename;
            }
            if (this.elements.displaySummary) {
                this.elements.displaySummary.textContent = newSummary || 'No summary available';
            }
            
            this.updatePageTitle(newFilename);
            this.exitEditMode();
            this.showNotification('Changes saved successfully!', 'success');
            
        } catch (error) {
            console.error('Save error:', error);
            this.showNotification(error.message || 'Failed to save changes', 'error');
        } finally {
            this.setSaveButtonLoading(false);
        }
    }

    toggleDisplayElements(show) {
        [this.elements.displayFilename, this.elements.displayFilenameInfo, this.elements.displaySummary]
            .forEach(el => {
                if (el) {
                    el.style.display = show ? '' : 'none';
                }
            });
    }

    toggleEditElements(show) {
        [this.elements.editFilename, this.elements.editFilenameInfo, this.elements.editSummary]
            .forEach(el => {
                if (el) {
                    el.style.display = show ? '' : 'none';
                }
            });
    }

    updateEditButtonState(isEditing) {
        if (this.elements.editBtnText) {
            this.elements.editBtnText.textContent = isEditing ? 'Editing...' : 'Edit';
        }
        if (this.elements.editBtn) {
            this.elements.editBtn.disabled = isEditing;
        }
    }

    showEditActions(show) {
        if (this.elements.editActions) {
            this.elements.editActions.style.display = show ? '' : 'none';
        }
    }

    setSaveButtonLoading(loading) {
        if (this.elements.saveBtn) {
            if (loading) {
                ButtonState.setLoading(this.elements.saveBtn.id, 'Saving...');
            } else {
                ButtonState.restore(this.elements.saveBtn.id);
            }
        }
    }

    updatePageTitle(newFileName) {
        document.title = `${newFileName} - Extraction Details`;
    }

    handleKeyboard(e) {
        if (!this.isEditMode) return;
        
        if (e.key === 'Escape') {
            e.preventDefault();
            this.cancelEdit();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.saveChanges();
        }
    }

    showNotification(message, type = 'info') {
        ErrorDisplay.showAlert(message, type);
    }
}

export class ClipboardManager {
    static copyToClipboard(button, textSelector = 'pre') {
        const textElement = document.querySelector(textSelector);
        if (!textElement) return;

        const originalText = button.textContent;
        const textToCopy = textElement.textContent;

        // Modern clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                this.showCopyFeedback(button, originalText);
            }).catch(() => {
                this.fallbackCopy(textToCopy, button, originalText);
            });
        } else {
            this.fallbackCopy(textToCopy, button, originalText);
        }
    }

    static fallbackCopy(text, button, originalText) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                this.showCopyFeedback(button, originalText);
            } else {
                throw new Error('Copy command failed');
            }
        } catch (err) {
            console.error('Copy failed:', err);
            ErrorDisplay.showAlert('Copy failed. Please manually select and copy the text.', 'error');
        }
    }

    static showCopyFeedback(button, originalText) {
        button.textContent = 'Copied!';
        button.classList.add('bg-green-600', 'hover:bg-green-700');
        button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('bg-green-600', 'hover:bg-green-700');
            button.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }, 2000);
    }
}

export class SharingManager {
    constructor(extractionId) {
        this.extractionId = extractionId;
        this.shareModal = new Modal('shareModal');
        this.sharedUsers = [];
        this.availableUsers = [];
        this.init();
    }

    init() {
        this.bindEventListeners();
    }

    bindEventListeners() {
        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.showShareModal());
        }

        const shareForm = document.getElementById('shareForm');
        if (shareForm) {
            shareForm.addEventListener('submit', (e) => this.handleShare(e));
        }

        // Modal close buttons
        const closeModalBtn = document.getElementById('closeShareModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.shareModal.hide());
        }

        const cancelBtn = document.getElementById('cancelShare');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.shareModal.hide());
        }

        // Event delegation for unshare buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.unshare-btn')) {
                e.preventDefault();
                const button = e.target.closest('.unshare-btn');
                const userId = button.getAttribute('data-user-id');
                if (userId) {
                    this.handleUnshare(userId);
                }
            }
        });
    }

    async showShareModal() {
        try {
            // First, verify the user has permission to share by loading the extraction
            const extraction = await ApiService.get(`/api/extractions/${this.extractionId}`);
            
            // If we get here without an error, the user can at least view the extraction
            // But we should still check ownership for sharing
            await Promise.all([
                this.loadSharedUsers(),
                this.loadUsersForSharing()
            ]);
            this.shareModal.show();
        } catch (error) {
            console.error('Failed to load sharing data:', error);
            
            if (error.message === 'Extraction not found') {
                ErrorDisplay.showAlert('This extraction is no longer available or you don\'t have permission to access it.', 'error');
            } else {
                ErrorDisplay.showAlert('Failed to load sharing information. Please refresh the page and try again.', 'error');
            }
        }
    }

    async loadUsersForSharing() {
        try {
            this.availableUsers = await ExtractionsApi.getUsers(true);
            this.updateUserSelect();
        } catch (error) {
            console.error('Failed to load users for sharing:', error);
            throw error;
        }
    }

    updateUserSelect() {
        const userSelect = document.getElementById('shareUserSelect');
        if (!userSelect) return;
        
        userSelect.innerHTML = '<option value="">Select a user to share with...</option>';
        
        // Filter out already shared users
        const sharedUserIds = this.sharedUsers.map(user => user._id);
        const availableUsers = this.availableUsers.filter(user => 
            !sharedUserIds.includes(user._id)
        );
        
        availableUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user._id;
            option.textContent = `${user.email} (${user.role})`;
            userSelect.appendChild(option);
        });
    }

    async loadSharedUsers() {
        try {
            const extraction = await ApiService.get(`/api/extractions/${this.extractionId}`);
            this.sharedUsers = extraction.sharedWith || [];
            this.updateSharedUsersList();
        } catch (error) {
            console.error('Failed to load shared users:', error);
            this.sharedUsers = [];
        }
    }

    updateSharedUsersList() {
        const container = document.getElementById('sharedUsersList');
        if (!container) return;
        
        if (this.sharedUsers.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                    <p class="mt-2">Not shared with anyone yet</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.sharedUsers.map(user => this.createSharedUserItem(user)).join('');
    }

    createSharedUserItem(user) {
        const initials = this.getAvatarInitials(user.email);
        const avatarColor = this.getAvatarColor(user.email);
        const roleBadge = this.getRoleBadge(user.role);
        
        return `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0 h-8 w-8 ${avatarColor} rounded-full flex items-center justify-center">
                        <span class="text-white text-sm font-medium">${initials}</span>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-900">${StringUtils.escapeHtml(user.email)}</p>
                        ${roleBadge}
                    </div>
                </div>
                <button 
                    type="button" 
                    class="unshare-btn text-red-600 hover:text-red-800 text-sm font-medium"
                    data-user-id="${user._id}">
                    Remove
                </button>
            </div>
        `;
    }

    async handleShare(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userId = formData.get('userId');
        
        if (!userId) {
            ErrorDisplay.showAlert('Please select a user to share with', 'error');
            return;
        }

        try {
            await ExtractionsApi.shareExtraction(this.extractionId, userId);
            
            // Refresh the shared users list
            await this.loadSharedUsers();
            this.updateUserSelect();
            
            ErrorDisplay.showAlert('Extraction shared successfully!', 'success');
            event.target.reset();
            
        } catch (error) {
            console.error('Share error:', error);
            
            // Handle specific permission errors more gracefully
            if (error.message === 'Only the owner can perform this action') {
                ErrorDisplay.showAlert('You don\'t have permission to share this extraction. Only the owner can share files.', 'error');
                // Hide the share modal if it's a permission error
                if (this.shareModal) {
                    this.shareModal.hide();
                }
            } else if (error.message === 'Extraction already shared with this user') {
                ErrorDisplay.showAlert('This extraction is already shared with the selected user.', 'error');
            } else if (error.message === 'User not found') {
                ErrorDisplay.showAlert('The selected user could not be found.', 'error');
            } else {
                ErrorDisplay.showAlert(error.message || 'Failed to share extraction. Please try again.', 'error');
            }
        }
    }

    async handleUnshare(userId) {
        try {
            await ExtractionsApi.unshareExtraction(this.extractionId, userId);
            
            // Refresh the shared users list
            await this.loadSharedUsers();
            this.updateUserSelect();
            
            ErrorDisplay.showAlert('User removed from sharing', 'success');
            
        } catch (error) {
            console.error('Unshare error:', error);
            
            // Handle specific permission errors more gracefully
            if (error.message === 'Only the owner can perform this action') {
                ErrorDisplay.showAlert('You don\'t have permission to manage sharing for this extraction. Only the owner can remove shared users.', 'error');
            } else {
                ErrorDisplay.showAlert(error.message || 'Failed to remove user. Please try again.', 'error');
            }
        }
    }

    getRoleBadge(role) {
        const badges = {
            admin: '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">👑 Admin</span>',
            superadmin: '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">🔥 Super Admin</span>',
            user: '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">👤 User</span>'
        };
        return badges[role] || badges.user;
    }

    getAvatarInitials(email) {
        return email.substring(0, 2).toUpperCase();
    }

    getAvatarColor(email) {
        const colors = [
            'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
            'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500'
        ];
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            hash = email.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }
} 