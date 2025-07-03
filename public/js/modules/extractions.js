/**
 * Extractions Module - Handles extraction list functionality, uploads, and management
 */

import { ApiService } from './api.js';
import { Modal, ErrorDisplay, LoadingState } from './ui.js';
import { ValidationUtils, StringUtils } from './utils.js';

export class ExtractionsApi {
    static async getExtractions(options = {}) {
        const params = new URLSearchParams(options);
        return ApiService.get(`/api/extractions?${params}`);
    }

    static async uploadExtraction(formData) {
        return ApiService.post('/api/extractions/upload', formData, false); // false = don't JSON stringify
    }

    static async deleteExtraction(extractionId) {
        return ApiService.delete(`/api/extractions/${extractionId}`);
    }

    static async reassignExtraction(extractionId, userId) {
        return ApiService.put(`/api/extractions/${extractionId}/reassign`, { userId });
    }

    static async shareExtraction(extractionId, userId) {
        return ApiService.post(`/api/extractions/${extractionId}/share`, { userId });
    }

    static async unshareExtraction(extractionId, userId) {
        return ApiService.delete(`/api/extractions/${extractionId}/unshare`, { userId });
    }

    static async getUsers(forSharing = false) {
        const params = forSharing ? '?forSharing=true' : '';
        return ApiService.get(`/api/users${params}`);
    }
}

export class FileUploadManager {
    constructor(formId, onUploadSuccess) {
        this.form = document.getElementById(formId);
        this.onUploadSuccess = onUploadSuccess;
        this.allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.init();
    }

    init() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleUpload(e));
            
            const fileInput = this.form.querySelector('input[type="file"]');
            if (fileInput) {
                fileInput.addEventListener('change', (e) => this.validateFile(e));
            }
        }
    }

    validateFile(event) {
        const file = event.target.files[0];
        const errorContainer = this.form.querySelector('.upload-error');
        
        if (!file) return;
        
        // Clear previous errors
        if (errorContainer) {
            errorContainer.classList.add('hidden');
        }
        
        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            this.showUploadError('Invalid file type. Only PDF, TXT, and DOCX files are allowed.');
            event.target.value = '';
            return false;
        }
        
        // Check file size
        if (file.size > this.maxFileSize) {
            this.showUploadError('File is too large. Maximum size is 50MB.');
            event.target.value = '';
            return false;
        }
        
        return true;
    }

    async handleUpload(event) {
        event.preventDefault();
        
        const formData = new FormData(this.form);
        const fileInput = this.form.querySelector('input[type="file"]');
        
        if (!fileInput.files[0]) {
            this.showUploadError('Please select a file to upload.');
            return;
        }

        if (!this.validateFile({ target: fileInput })) {
            return;
        }

        try {
            this.setUploadingState(true);
            await ExtractionsApi.uploadExtraction(formData);
            
            this.form.reset();
            this.showUploadSuccess('File uploaded successfully!');
            
            if (this.onUploadSuccess) {
                this.onUploadSuccess();
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showUploadError(error.message || 'Upload failed. Please try again.');
        } finally {
            this.setUploadingState(false);
        }
    }

    setUploadingState(uploading) {
        const submitButton = this.form.querySelector('button[type="submit"]');
        const submitText = this.form.querySelector('.submit-text');
        const submitLoading = this.form.querySelector('.submit-loading');
        
        if (submitButton) {
            submitButton.disabled = uploading;
        }
        
        if (submitText && submitLoading) {
            if (uploading) {
                submitText.classList.add('hidden');
                submitLoading.classList.remove('hidden');
            } else {
                submitText.classList.remove('hidden');
                submitLoading.classList.add('hidden');
            }
        }
    }

    showUploadError(message) {
        const errorContainer = this.form.querySelector('.upload-error');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.classList.remove('hidden');
        } else {
            ErrorDisplay.showAlert(message, 'error');
        }
    }

    showUploadSuccess(message) {
        const successContainer = this.form.querySelector('.upload-success');
        if (successContainer) {
            successContainer.textContent = message;
            successContainer.classList.remove('hidden');
            setTimeout(() => {
                successContainer.classList.add('hidden');
            }, 3000);
        } else {
            ErrorDisplay.showAlert(message, 'success');
        }
    }
}

export class ExtractionManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEventListeners();
        this.setupFileUpload();
        this.setupReassignModal();
    }

    bindEventListeners() {
        // Event delegation for action buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.delete-extraction-btn')) {
                e.preventDefault();
                const button = e.target.closest('.delete-extraction-btn');
                const extractionId = button.getAttribute('data-extraction-id');
                if (extractionId) {
                    this.handleDelete(extractionId);
                }
            }
            
            if (e.target.closest('.reassign-extraction-btn')) {
                e.preventDefault();
                const button = e.target.closest('.reassign-extraction-btn');
                const extractionId = button.getAttribute('data-extraction-id');
                if (extractionId) {
                    this.showReassignModal(extractionId);
                }
            }
        });
    }

    setupFileUpload() {
        this.uploadManager = new FileUploadManager('uploadForm', () => {
            // Refresh page after successful upload
            window.location.reload();
        });
    }

    setupReassignModal() {
        this.reassignModal = new Modal('reassignModal');
        this.currentExtractionId = null;
        
        const reassignForm = document.getElementById('reassignForm');
        if (reassignForm) {
            reassignForm.addEventListener('submit', (e) => this.handleReassign(e));
        }
    }

    async handleDelete(extractionId) {
        const confirmed = await this.showDeleteConfirmation();
        if (!confirmed) return;
        
        try {
            await ExtractionsApi.deleteExtraction(extractionId);
            ErrorDisplay.showAlert('Extraction deleted successfully!', 'success');
            
            // Remove the row from the table or refresh page
            window.location.reload();
            
        } catch (error) {
            console.error('Delete error:', error);
            ErrorDisplay.showAlert(error.message || 'Failed to delete extraction', 'error');
        }
    }

    showDeleteConfirmation() {
        return new Promise((resolve) => {
            const confirmed = confirm('Are you sure you want to delete this extraction? This action cannot be undone.');
            resolve(confirmed);
        });
    }

    async showReassignModal(extractionId) {
        this.currentExtractionId = extractionId;
        
        try {
            await this.loadUsersForReassign();
            this.reassignModal.show();
        } catch (error) {
            console.error('Failed to load users:', error);
            ErrorDisplay.showAlert('Failed to load users for reassignment', 'error');
        }
    }

    async loadUsersForReassign() {
        try {
            const users = await ExtractionsApi.getUsers();
            const userSelect = document.getElementById('userSelect');
            
            if (!userSelect) return;
            
            // Clear existing options
            userSelect.innerHTML = '<option value="">Select a user...</option>';
            
            // Add user options
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user._id;
                option.textContent = `${user.email} (${user.role})`;
                userSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('Failed to load users:', error);
            throw error;
        }
    }

    async handleReassign(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userId = formData.get('userId');
        
        if (!this.currentExtractionId || !userId) {
            ErrorDisplay.showAlert('Please select a user', 'error');
            return;
        }

        try {
            await ExtractionsApi.reassignExtraction(this.currentExtractionId, userId);
            
            this.reassignModal.hide();
            ErrorDisplay.showAlert('Extraction reassigned successfully!', 'success');
            
            // Refresh page to show updated assignment
            window.location.reload();
            
        } catch (error) {
            console.error('Reassignment error:', error);
            ErrorDisplay.showAlert(error.message || 'Failed to reassign extraction', 'error');
        }
    }
} 