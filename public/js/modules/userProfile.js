/**
 * User Profile Module - Handles profile page functionality
 */

import { ApiService } from './api.js';
import { Modal, ErrorDisplay, LoadingState } from './ui.js';
import { StringUtils, DateUtils, ValidationUtils } from './utils.js';
import { AuthValidator } from './auth.js';

export class UserProfileApi {
    static async getUserExtractions(userId, options = {}) {
        const params = new URLSearchParams({
            userId,
            ...options
        });
        return ApiService.get(`/api/extractions?${params}`);
    }

    static async updateUserProfile(userId, updateData) {
        return ApiService.put(`/api/users/${userId}`, updateData);
    }
}

export class ProfileStatistics {
    constructor() {
        this.loadingElements = [
            'total-extractions',
            'owned-extractions', 
            'shared-extractions',
            'success-rate'
        ];
    }

    async loadStatistics(userId) {
        try {
            const extractions = await UserProfileApi.getUserExtractions(userId, { 
                includeShared: true 
            });
            
            const stats = this.calculateStatistics(extractions);
            this.updateStatisticsDisplay(stats);
            
        } catch (error) {
            console.error('Failed to load user statistics:', error);
            this.showFallbackStatistics();
        }
    }

    calculateStatistics(extractions) {
        const totalExtractions = extractions.length;
        const ownedExtractions = extractions.filter(ext => ext.isOwner).length;
        const sharedExtractions = extractions.filter(ext => ext.isShared && !ext.isOwner).length;
        const completedExtractions = extractions.filter(ext => ext.status === 'completed').length;
        const successRate = totalExtractions > 0 
            ? Math.round((completedExtractions / totalExtractions) * 100) 
            : 0;

        return {
            total: totalExtractions,
            owned: ownedExtractions,
            shared: sharedExtractions,
            completed: completedExtractions,
            successRate: `${successRate}%`
        };
    }

    updateStatisticsDisplay(stats) {
        this.updateStatElement('total-extractions', stats.total);
        this.updateStatElement('owned-extractions', stats.owned);
        this.updateStatElement('shared-extractions', stats.shared);
        this.updateStatElement('success-rate', stats.successRate);
    }

    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    showFallbackStatistics() {
        this.loadingElements.forEach(elementId => {
            this.updateStatElement(elementId, '0');
        });
        this.updateStatElement('success-rate', '0%');
    }
}

export class RecentExtractions {
    constructor() {
        this.states = {
            loading: document.getElementById('extractions-loading'),
            error: document.getElementById('extractions-error'),
            list: document.getElementById('extractions-list'),
            empty: document.getElementById('extractions-empty')
        };
    }

    async loadRecentExtractions(userId) {
        try {
            this.showLoading();
            
            const extractions = await UserProfileApi.getUserExtractions(userId, { 
                limit: 5, 
                includeShared: true 
            });
            
            if (extractions.length === 0) {
                this.showEmpty();
            } else {
                this.displayExtractions(extractions);
            }
            
        } catch (error) {
            console.error('Failed to load recent extractions:', error);
            this.showError();
        }
    }

    displayExtractions(extractions) {
        const listContainer = this.states.list;
        const listContent = listContainer.querySelector('div');
        
        if (!listContent) return;
        
        listContent.innerHTML = '';
        
        extractions.forEach(extraction => {
            const extractionElement = this.createExtractionItem(extraction);
            listContent.appendChild(extractionElement);
        });
        
        this.showContent();
    }

    createExtractionItem(extraction) {
        const item = document.createElement('div');
        item.className = 'px-6 py-4 hover:bg-gray-50';
        
        const statusInfo = this.getStatusInfo(extraction.status);
        const sharingInfo = this.getSharingInfo(extraction);
        const truncatedSummary = StringUtils.truncate(
            extraction.summary || 'No summary available', 
            100
        );
        const createdDate = DateUtils.formatDate(extraction.createdAt, {
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
                            <div class="flex items-center space-x-2">
                                <p class="text-sm font-medium text-gray-900 truncate">
                                    ${StringUtils.escapeHtml(extraction.fileName || 'Unknown file')}
                                </p>
                                ${sharingInfo.badge}
                            </div>
                            <p class="text-sm text-gray-500 truncate">
                                ${StringUtils.escapeHtml(truncatedSummary)}
                            </p>
                            ${sharingInfo.ownerInfo}
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.class}">
                        ${statusInfo.icon} ${extraction.status}
                    </span>
                    <span class="text-sm text-gray-500">${createdDate}</span>
                    ${this.getActionButtons(extraction)}
                </div>
            </div>
        `;
        
        return item;
    }

    getStatusInfo(status) {
        const statusMap = {
            completed: { class: 'bg-green-100 text-green-800', icon: '✅' },
            processing: { class: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
            failed: { class: 'bg-red-100 text-red-800', icon: '❌' },
            default: { class: 'bg-gray-100 text-gray-800', icon: '❓' }
        };
        return statusMap[status] || statusMap.default;
    }

    getSharingInfo(extraction) {
        let badge = '';
        let ownerInfo = '';
        
        if (extraction.isShared && !extraction.isOwner) {
            badge = '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">🔗 Shared</span>';
            if (extraction.ownerEmail) {
                ownerInfo = `<p class="text-xs text-gray-400">Shared by ${StringUtils.escapeHtml(extraction.ownerEmail)}</p>`;
            }
        } else if (extraction.sharedWith && extraction.sharedWith.length > 0) {
            badge = '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">📤 Shared</span>';
        }
        
        return { badge, ownerInfo };
    }

    getActionButtons(extraction) {
        return `
            <a href="/extraction/${extraction._id}" 
               class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View →
            </a>
        `;
    }

    showLoading() {
        this.hideAllStates();
        if (this.states.loading) {
            this.states.loading.classList.remove('hidden');
        }
    }

    showError() {
        this.hideAllStates();
        if (this.states.error) {
            this.states.error.classList.remove('hidden');
        }
    }

    showContent() {
        this.hideAllStates();
        if (this.states.list) {
            this.states.list.classList.remove('hidden');
        }
    }

    showEmpty() {
        this.hideAllStates();
        if (this.states.empty) {
            this.states.empty.classList.remove('hidden');
        }
    }

    hideAllStates() {
        Object.values(this.states).forEach(element => {
            if (element) {
                element.classList.add('hidden');
            }
        });
    }
}

export class ProfileManager {
    constructor(userId, isOwnProfile, userRole) {
        this.userId = userId;
        this.isOwnProfile = JSON.parse(isOwnProfile);
        this.userRole = userRole;
        this.statistics = new ProfileStatistics();
        this.recentExtractions = new RecentExtractions();
        this.editModal = null;
        this.passwordModal = null;
        this.init();
    }

    init() {
        this.setupModals();
        this.bindEventListeners();
        this.loadData();
    }

    setupModals() {
        this.editModal = new Modal('edit-profile-modal');
        this.passwordModal = new Modal('change-password-modal');
    }

    bindEventListeners() {
        // Edit profile button
        const editProfileBtn = document.getElementById('edit-profile-btn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => this.showEditModal());
        }

        // Change password button
        const changePasswordBtn = document.getElementById('change-password-btn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => this.showPasswordModal());
        }

        // Edit user button (for admins)
        const editUserBtn = document.getElementById('edit-user-btn');
        if (editUserBtn) {
            editUserBtn.addEventListener('click', () => {
                window.location.href = `/users?edit=${this.userId}`;
            });
        }

        // Forms
        const editForm = document.getElementById('edit-profile-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        }

        const passwordForm = document.getElementById('change-password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
        }

        // Real-time validation
        this.setupPasswordValidation();
    }

    setupPasswordValidation() {
        const newPasswordInput = document.getElementById('new-password-change');
        const confirmPasswordInput = document.getElementById('confirm-password');
        
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', () => this.validatePasswordStrength());
        }
        
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => this.validatePasswordMatch());
        }
    }

    async loadData() {
        await Promise.all([
            this.statistics.loadStatistics(this.userId),
            this.recentExtractions.loadRecentExtractions(this.userId)
        ]);
    }

    showEditModal() {
        this.editModal.show();
        this.hideProfileError();
        
        // Focus on email input
        const emailInput = document.getElementById('profile-email');
        if (emailInput) {
            setTimeout(() => emailInput.focus(), 100);
        }
    }

    showPasswordModal() {
        this.passwordModal.show();
        this.hidePasswordError();
    }

    async handleProfileUpdate(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const updateData = {
            email: formData.get('email'),
            currentPassword: formData.get('currentPassword'),
            newPassword: formData.get('newPassword')
        };
        
        // Validation
        if (!updateData.currentPassword) {
            this.showProfileError('Current password is required to make changes');
            return;
        }

        try {
            await UserProfileApi.updateUserProfile(this.userId, updateData);
            this.editModal.hide();
            ErrorDisplay.showAlert('Profile updated successfully!', 'success');
            
            // Refresh page if email changed
            if (updateData.email) {
                setTimeout(() => window.location.reload(), 1500);
            }
            
        } catch (error) {
            console.error('Profile update error:', error);
            this.showProfileError(error.message || 'Failed to update profile');
        }
    }

    async handlePasswordChange(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const passwordData = {
            currentPassword: formData.get('current-password-change'),
            newPassword: formData.get('new-password-change'),
            confirmPassword: formData.get('confirm-password')
        };

        // Client-side validation
        const validation = AuthValidator.validateSignupForm(
            'dummy@email.com', // We don't need email validation here
            passwordData.newPassword,
            passwordData.confirmPassword
        );

        if (!validation.isValid) {
            this.showPasswordError(validation.errors[0]);
            return;
        }

        if (!passwordData.currentPassword) {
            this.showPasswordError('Current password is required');
            return;
        }

        try {
            await UserProfileApi.updateUserProfile(this.userId, {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            
            this.passwordModal.hide();
            ErrorDisplay.showAlert('Password changed successfully!', 'success');
            
        } catch (error) {
            console.error('Password change error:', error);
            this.showPasswordError(error.message || 'Failed to change password');
        }
    }

    validatePasswordStrength() {
        const passwordInput = document.getElementById('new-password-change');
        const strengthIndicator = document.getElementById('password-strength');
        
        if (!passwordInput || !strengthIndicator) return;
        
        const password = passwordInput.value;
        const strength = AuthValidator.validatePasswordStrength(password);
        
        strengthIndicator.innerHTML = `
            <div class="text-xs text-gray-600 mb-1">Password strength: ${StringUtils.capitalize(strength.level)}</div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="${strength.color} h-2 rounded-full transition-all duration-300" 
                     style="width: ${strength.strength * 100}%"></div>
            </div>
        `;
    }

    validatePasswordMatch() {
        const newPassword = document.getElementById('new-password-change');
        const confirmPassword = document.getElementById('confirm-password');
        const matchIndicator = document.getElementById('password-match');
        
        if (!newPassword || !confirmPassword || !matchIndicator) return;
        
        const doMatch = newPassword.value === confirmPassword.value;
        const hasValues = newPassword.value && confirmPassword.value;
        
        if (hasValues) {
            if (doMatch) {
                matchIndicator.innerHTML = '<div class="text-xs text-green-600">✅ Passwords match</div>';
                confirmPassword.classList.remove('border-red-500');
                confirmPassword.classList.add('border-green-500');
            } else {
                matchIndicator.innerHTML = '<div class="text-xs text-red-600">❌ Passwords do not match</div>';
                confirmPassword.classList.remove('border-green-500');
                confirmPassword.classList.add('border-red-500');
            }
        } else {
            matchIndicator.innerHTML = '';
            confirmPassword.classList.remove('border-red-500', 'border-green-500');
        }
    }

    showProfileError(message) {
        const errorElement = document.getElementById('profile-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        } else {
            ErrorDisplay.showAlert(message, 'error');
        }
    }

    hideProfileError() {
        const errorElement = document.getElementById('profile-error');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }

    showPasswordError(message) {
        const errorElement = document.getElementById('password-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        } else {
            ErrorDisplay.showAlert(message, 'error');
        }
    }

    hidePasswordError() {
        const errorElement = document.getElementById('password-error');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }
} 