// Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.registrations = [];
        this.filteredRegistrations = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchTerm = '';
        this.classFilter = '';
        
        this.initializeElements();
        this.bindEvents();
        this.loadRegistrations();
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.loadRegistrations();
        }, 30000);
    }
    
    initializeElements() {
        // Table elements
        this.tableBody = document.getElementById('registrationsTableBody');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.noData = document.getElementById('noData');
        this.table = document.getElementById('registrationsTable');
        
        // Stats elements
        this.totalRegistrations = document.getElementById('totalRegistrations');
        this.todayRegistrations = document.getElementById('todayRegistrations');
        
        // Control elements
        this.searchInput = document.getElementById('searchInput');
        this.classFilterSelect = document.getElementById('classFilter');
        this.refreshBtn = document.getElementById('refreshBtn');
        
        // Pagination elements
        this.pagination = document.getElementById('pagination');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.currentPageSpan = document.getElementById('currentPage');
        this.totalPagesSpan = document.getElementById('totalPages');
        
        // Modal elements
        this.deleteModal = document.getElementById('deleteModal');
        this.deleteDetails = document.getElementById('deleteDetails');
        this.cancelDelete = document.getElementById('cancelDelete');
        this.confirmDelete = document.getElementById('confirmDelete');
    }
    
    bindEvents() {
        // Search functionality
        this.searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterRegistrations();
        });
        
        // Class filter
        this.classFilterSelect.addEventListener('change', (e) => {
            this.classFilter = e.target.value;
            this.filterRegistrations();
        });
        
        // Refresh button
        this.refreshBtn.addEventListener('click', () => {
            this.refreshBtn.querySelector('i').classList.add('fa-spin');
            this.loadRegistrations().finally(() => {
                setTimeout(() => {
                    this.refreshBtn.querySelector('i').classList.remove('fa-spin');
                }, 1000);
            });
        });
        
        // Pagination
        this.prevBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderTable();
            }
        });
        
        this.nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredRegistrations.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderTable();
            }
        });
        
        // Modal events
        this.cancelDelete.addEventListener('click', () => {
            this.hideDeleteModal();
        });
        
        this.confirmDelete.addEventListener('click', () => {
            this.deleteRegistration();
        });
        
        // Close modal on outside click
        window.addEventListener('click', (e) => {
            if (e.target === this.deleteModal) {
                this.hideDeleteModal();
            }
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.deleteModal.style.display === 'block') {
                this.hideDeleteModal();
            }
        });
    }
    
    async loadRegistrations() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/queries');
            const result = await response.json();
            
            if (result.success) {
                this.registrations = result.data;
                this.filterRegistrations();
                this.updateStats();
            } else {
                throw new Error(result.message || 'Failed to load registrations');
            }
        } catch (error) {
            console.error('Error loading registrations:', error);
            this.showError('Failed to load registrations. Please try again.');
        } finally {
            this.hideLoading();
        }
    }
    
    filterRegistrations() {
        this.filteredRegistrations = this.registrations.filter(registration => {
            const matchesSearch = !this.searchTerm || 
                registration.fullName.toLowerCase().includes(this.searchTerm) ||
                registration.className.toLowerCase().includes(this.searchTerm) ||
                registration.city.toLowerCase().includes(this.searchTerm) ||
                registration.state.toLowerCase().includes(this.searchTerm) ||
                registration.phoneNumber.includes(this.searchTerm);
            
            const matchesClass = !this.classFilter || registration.className === this.classFilter;
            
            return matchesSearch && matchesClass;
        });
        
        this.currentPage = 1;
        this.renderTable();
        this.updatePagination();
    }
    
    renderTable() {
        if (this.filteredRegistrations.length === 0) {
            this.showNoData();
            return;
        }
        
        this.hideNoData();
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredRegistrations.slice(startIndex, endIndex);
        
        this.tableBody.innerHTML = pageData.map(registration => `
            <tr>
                <td>
                    <div class="student-name">
                        <strong>${this.escapeHtml(registration.fullName)}</strong>
                    </div>
                </td>
                <td>
                    <span class="class-badge">${this.escapeHtml(registration.className)}</span>
                </td>
                <td>${this.escapeHtml(registration.city)}</td>
                <td>${this.escapeHtml(registration.state)}</td>
                <td>
                    <a href="tel:${registration.phoneNumber}" class="phone-link">
                        ${this.escapeHtml(registration.phoneNumber)}
                    </a>
                </td>
                <td>
                    ${registration.question ? 
                        `<div class="question-text" title="${this.escapeHtml(registration.question)}">
                            ${this.escapeHtml(registration.question.length > 50 ? 
                                registration.question.substring(0, 50) + '...' : 
                                registration.question)}
                        </div>` : 
                        '<span class="no-question">-</span>'
                    }
                </td>
                <td>
                    <div class="date-info">
                        <div class="date">${this.formatDate(registration.submittedAt)}</div>
                        <div class="time">${this.formatTime(registration.submittedAt)}</div>
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view-btn" onclick="adminDashboard.viewRegistration('${registration._id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="adminDashboard.showDeleteModal('${registration._id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    updateStats() {
        const total = this.registrations.length;
        const today = this.getTodayRegistrations();
        
        // Animate stats update
        this.animateNumber(this.totalRegistrations, total);
        this.animateNumber(this.todayRegistrations, today);
        
        // Add pulse animation to stat cards
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            card.classList.add('updated');
            setTimeout(() => card.classList.remove('updated'), 600);
        });
    }
    
    animateNumber(element, targetValue) {
        const currentValue = parseInt(element.textContent) || 0;
        const increment = (targetValue - currentValue) / 20;
        let current = currentValue;
        
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
                element.textContent = targetValue;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current);
            }
        }, 50);
    }
    
    getTodayRegistrations() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return this.registrations.filter(registration => {
            const registrationDate = new Date(registration.submittedAt);
            registrationDate.setHours(0, 0, 0, 0);
            return registrationDate.getTime() === today.getTime();
        }).length;
    }
    
    updatePagination() {
        const totalPages = Math.ceil(this.filteredRegistrations.length / this.itemsPerPage);
        
        this.currentPageSpan.textContent = this.currentPage;
        this.totalPagesSpan.textContent = totalPages;
        
        this.prevBtn.disabled = this.currentPage <= 1;
        this.nextBtn.disabled = this.currentPage >= totalPages;
        
        this.pagination.style.display = totalPages > 1 ? 'flex' : 'none';
    }
    
    viewRegistration(id) {
        const registration = this.registrations.find(r => r._id === id);
        if (!registration) return;
        
        // Create a detailed view modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <i class="fas fa-user-graduate"></i>
                    <h2>Student Registration Details</h2>
                </div>
                <div class="modal-body">
                    <div class="registration-details">
                        <div class="detail-row">
                            <label>Full Name:</label>
                            <span>${this.escapeHtml(registration.fullName)}</span>
                        </div>
                        <div class="detail-row">
                            <label>Class:</label>
                            <span>${this.escapeHtml(registration.className)}</span>
                        </div>
                        <div class="detail-row">
                            <label>City:</label>
                            <span>${this.escapeHtml(registration.city)}</span>
                        </div>
                        <div class="detail-row">
                            <label>State:</label>
                            <span>${this.escapeHtml(registration.state)}</span>
                        </div>
                        <div class="detail-row">
                            <label>Phone Number:</label>
                            <span><a href="tel:${registration.phoneNumber}">${this.escapeHtml(registration.phoneNumber)}</a></span>
                        </div>
                        <div class="detail-row">
                            <label>Question:</label>
                            <span>${registration.question ? this.escapeHtml(registration.question) : 'No question submitted'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Registration Date:</label>
                            <span>${this.formatDate(registration.submittedAt)} at ${this.formatTime(registration.submittedAt)}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" class="close-btn">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    showDeleteModal(id) {
        const registration = this.registrations.find(r => r._id === id);
        if (!registration) return;
        
        this.deleteDetails.textContent = `${registration.fullName} - ${registration.className} - ${registration.city}`;
        this.confirmDelete.dataset.id = id;
        this.deleteModal.style.display = 'block';
    }
    
    hideDeleteModal() {
        this.deleteModal.style.display = 'none';
        delete this.confirmDelete.dataset.id;
    }
    
    async deleteRegistration() {
        const id = this.confirmDelete.dataset.id;
        if (!id) return;
        
        try {
            const response = await fetch(`/api/queries/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.hideDeleteModal();
                this.showSuccess('Registration deleted successfully!');
                this.loadRegistrations();
            } else {
                throw new Error(result.message || 'Failed to delete registration');
            }
        } catch (error) {
            console.error('Error deleting registration:', error);
            this.showError('Failed to delete registration. Please try again.');
        }
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showLoading() {
        this.loadingSpinner.style.display = 'flex';
        this.table.style.display = 'none';
        this.noData.style.display = 'none';
    }
    
    hideLoading() {
        this.loadingSpinner.style.display = 'none';
        this.table.style.display = 'table';
    }
    
    showNoData() {
        this.noData.style.display = 'block';
        this.table.style.display = 'none';
    }
    
    hideNoData() {
        this.noData.style.display = 'none';
        this.table.style.display = 'table';
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}-notification`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, ${type === 'success' ? '#27AE60, #2ECC71' : '#E74C3C, #C0392B'});
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
            z-index: 3000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInRight 0.3s ease reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
        
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        });
    }
}

// Initialize admin dashboard when page loads
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});

// Add CSS for registration details modal
const style = document.createElement('style');
style.textContent = `
    .registration-details {
        text-align: left;
    }
    
    .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.8rem 0;
        border-bottom: 1px solid #E8E8E8;
    }
    
    .detail-row:last-child {
        border-bottom: none;
    }
    
    .detail-row label {
        font-weight: 600;
        color: #2C3E50;
        min-width: 120px;
    }
    
    .detail-row span {
        color: #7F8C8D;
        text-align: right;
        flex: 1;
    }
    
    .detail-row a {
        color: #3498DB;
        text-decoration: none;
    }
    
    .detail-row a:hover {
        text-decoration: underline;
    }
    
    .class-badge {
        background: linear-gradient(135deg, #3498DB, #2980B9);
        color: white;
        padding: 0.3rem 0.8rem;
        border-radius: 15px;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .phone-link {
        color: #3498DB;
        text-decoration: none;
    }
    
    .phone-link:hover {
        text-decoration: underline;
    }
    
    .question-text {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    .no-question {
        color: #BDC3C7;
        font-style: italic;
    }
    
    .date-info {
        text-align: center;
    }
    
    .date {
        font-weight: 500;
        color: #2C3E50;
    }
    
    .time {
        font-size: 0.8rem;
        color: #7F8C8D;
    }
    
    .student-name {
        font-weight: 600;
        color: #2C3E50;
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: auto;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .notification-close:hover {
        opacity: 0.8;
    }
`;
document.head.appendChild(style); 