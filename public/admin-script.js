// Admin Dashboard JavaScript with Authentication
class AdminDashboard {
    constructor() {
        this.registrations = [];
        this.filteredRegistrations = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchTerm = '';
        this.classFilter = '';
        this.token = localStorage.getItem('adminToken');
        
        this.initializeElements();
        this.bindEvents();
        this.checkAuthentication();
    }
    
    initializeElements() {
        // Login elements
        this.loginSection = document.getElementById('loginSection');
        this.dashboardSection = document.getElementById('dashboardSection');
        this.loginForm = document.getElementById('loginForm');
        this.logoutBtn = document.getElementById('logoutBtn');
        
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
        
        this.exportCsvBtn = document.getElementById('exportCsvBtn');
    }
    
    bindEvents() {
        // Login form
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // Logout button
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
        
        // Search functionality
        if (this.searchInput) {
        this.searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterRegistrations();
        });
        }
        
        // Class filter
        if (this.classFilterSelect) {
        this.classFilterSelect.addEventListener('change', (e) => {
            this.classFilter = e.target.value;
            this.filterRegistrations();
        });
        }
        
        // Refresh button
        if (this.refreshBtn) {
        this.refreshBtn.addEventListener('click', () => {
            this.refreshBtn.querySelector('i').classList.add('fa-spin');
            this.loadRegistrations().finally(() => {
                setTimeout(() => {
                    this.refreshBtn.querySelector('i').classList.remove('fa-spin');
                }, 1000);
            });
        });
        }
        
        // Pagination
        if (this.prevBtn) {
        this.prevBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderTable();
            }
        });
        }
        
        if (this.nextBtn) {
        this.nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredRegistrations.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderTable();
            }
        });
        }
        
        // Modal events
        if (this.cancelDelete) {
        this.cancelDelete.addEventListener('click', () => {
            this.hideDeleteModal();
        });
        }
        
        if (this.confirmDelete) {
        this.confirmDelete.addEventListener('click', () => {
            this.deleteRegistration();
        });
        }
        
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
        
        if (this.exportCsvBtn) {
            this.exportCsvBtn.addEventListener('click', () => {
                this.exportCsv();
            });
        }
    }
    
    async checkAuthentication() {
        if (!this.token) {
            this.showLogin();
            return;
        }
        
        try {
            const response = await fetch('/api/admin/verify', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                this.showDashboard();
                this.loadRegistrations();
            } else {
                localStorage.removeItem('adminToken');
                this.showLogin();
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            localStorage.removeItem('adminToken');
            this.showLogin();
        }
    }
    
    async handleLogin() {
        const formData = new FormData(this.loginForm);
        const username = formData.get('username');
        const password = formData.get('password');
        
        if (!username || !password) {
            this.showNotification('Please enter both username and password', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.token = result.token;
                localStorage.setItem('adminToken', this.token);
                this.showNotification('Login successful!', 'success');
                this.showDashboard();
                this.loadRegistrations();
            } else {
                this.showNotification(result.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('An error occurred during login', 'error');
        }
    }
    
    handleLogout() {
        localStorage.removeItem('adminToken');
        this.token = null;
        this.showLogin();
        this.showNotification('Logged out successfully', 'success');
    }
    
    showLogin() {
        this.loginSection.style.display = 'flex';
        this.dashboardSection.style.display = 'none';
    }
    
    showDashboard() {
        this.loginSection.style.display = 'none';
        this.dashboardSection.style.display = 'flex';
    }
    
    async loadRegistrations() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/queries', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.handleLogout();
                    return;
                }
                throw new Error('Failed to load registrations');
            }
            
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
            this.showNotification('Failed to load registrations. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async updateStats() {
        try {
            const response = await fetch('/api/stats', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.animateNumber(this.totalRegistrations, result.data.totalRegistrations);
                    this.animateNumber(this.todayRegistrations, result.data.todayRegistrations);
                }
            }
        } catch (error) {
            console.error('Error updating stats:', error);
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCount = this.registrations.filter(reg => 
            new Date(reg.submittedAt) >= today
        ).length;
        
        this.animateNumber(this.totalRegistrations, total);
        this.animateNumber(this.todayRegistrations, todayCount);
    }
    
    animateNumber(element, targetValue) {
        const startValue = 0;
        const duration = 1000;
        const increment = targetValue / (duration / 16);
        let currentValue = startValue;
        
        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            element.textContent = Math.floor(currentValue);
        }, 16);
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
        const registration = this.registrations.find(reg => reg._id === id);
        if (!registration) return;
        
        const details = `
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
                    <a href="tel:${registration.phoneNumber}">${this.escapeHtml(registration.phoneNumber)}</a>
                        </div>
                        <div class="detail-row">
                            <label>Question:</label>
                    <span>${registration.question ? this.escapeHtml(registration.question) : 'No question provided'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Registration Date:</label>
                            <span>${this.formatDate(registration.submittedAt)} at ${this.formatTime(registration.submittedAt)}</span>
                </div>
            </div>
        `;
        
        this.showNotification(details, 'info', 10000);
    }
    
    showDeleteModal(id) {
        const registration = this.registrations.find(reg => reg._id === id);
        if (!registration) return;
        
        this.deleteDetails.textContent = `${registration.fullName} (${registration.className})`;
        this.deleteModal.style.display = 'block';
        this.confirmDelete.onclick = () => this.deleteRegistration(id);
    }
    
    hideDeleteModal() {
        this.deleteModal.style.display = 'none';
    }
    
    async deleteRegistration(id) {
        try {
            const response = await fetch(`/api/queries/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.handleLogout();
                    return;
                }
                throw new Error('Failed to delete registration');
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Registration deleted successfully', 'success');
                this.hideDeleteModal();
                this.loadRegistrations();
            } else {
                throw new Error(result.message || 'Failed to delete registration');
            }
        } catch (error) {
            console.error('Error deleting registration:', error);
            this.showNotification('Failed to delete registration', 'error');
        }
    }
    
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString('en-US', {
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
        if (this.loadingSpinner) {
        this.loadingSpinner.style.display = 'flex';
        }
        if (this.table) {
        this.table.style.display = 'none';
        }
    }
    
    hideLoading() {
        if (this.loadingSpinner) {
        this.loadingSpinner.style.display = 'none';
        }
        if (this.table) {
        this.table.style.display = 'table';
        }
    }
    
    showNoData() {
        if (this.noData) {
            this.noData.style.display = 'flex';
        }
        if (this.table) {
        this.table.style.display = 'none';
        }
    }
    
    hideNoData() {
        if (this.noData) {
        this.noData.style.display = 'none';
        }
        if (this.table) {
        this.table.style.display = 'table';
    }
    }
    
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'linear-gradient(135deg, #27AE60, #2ECC71)' : 
                         type === 'error' ? 'linear-gradient(135deg, #E74C3C, #C0392B)' : 
                         'linear-gradient(135deg, #3498DB, #2980B9)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
            z-index: 3000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        notification.innerHTML = `
            <div class="notification-content">
                <div>${message}</div>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add animation styles if not exists
        if (!document.querySelector('#notification-style')) {
            const style = document.createElement('style');
            style.id = 'notification-style';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                .notification-content {
                    display: flex;
                    align-items: flex-start;
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
        }
        
        document.body.appendChild(notification);
        
        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInRight 0.3s ease reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
        
        // Close button functionality
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
    
    async exportCsv() {
        try {
            this.exportCsvBtn.disabled = true;
            this.exportCsvBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            const response = await fetch('/api/queries/export/csv', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to export CSV');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'registrations.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            this.showNotification('Failed to export CSV', 'error');
        } finally {
            this.exportCsvBtn.disabled = false;
            this.exportCsvBtn.innerHTML = '<i class="fas fa-file-csv"></i> Export CSV';
        }
    }
}

// Initialize admin dashboard
const adminDashboard = new AdminDashboard();

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