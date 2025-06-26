/**
 * Layout JavaScript - Handles common functionality across all pages
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeLogout();
});

/**
 * Initialize logout functionality
 */
function initializeLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

/**
 * Handle user logout
 */
async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (response.ok) {
            // Redirect to home page after successful logout
            window.location.href = '/';
        } else {
            const data = await response.json().catch(() => ({}));
            showNotification(data.message || 'Failed to logout', 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('An error occurred while logging out', 'error');
    }
}

/**
 * Show notification to user
 * @param {string} message - The message to display
 * @param {string} type - The type of notification ('success', 'error', 'info')
 */
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.layout-notification');
    existing.forEach(el => el.remove());

    const notification = document.createElement('div');
    notification.className = `layout-notification fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 max-w-sm`;
    
    // Set color based on type
    switch (type) {
        case 'success':
            notification.classList.add('bg-green-500', 'text-white');
            break;
        case 'error':
            notification.classList.add('bg-red-500', 'text-white');
            break;
        case 'info':
        default:
            notification.classList.add('bg-blue-500', 'text-white');
            break;
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto remove after delay
    const delay = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, delay);
} 