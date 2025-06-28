// DOM Elements
const form = document.getElementById('studentQueryForm');
const successModal = document.getElementById('successModal');
const closeModal = document.getElementById('closeModal');
const successMessage = document.getElementById('successMessage');

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Add loading state
    form.classList.add('loading');
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    try {
        // Get form data
        const formData = new FormData(form);
        const data = {
            fullName: formData.get('fullName'),
            className: formData.get('className'),
            city: formData.get('city'),
            state: formData.get('state'),
            phoneNumber: formData.get('phoneNumber'),
            question: formData.get('question')
        };
        
        // Validate form data
        if (!validateForm(data)) {
            throw new Error('Please fill in all required fields correctly.');
        }
        
        // Submit to server
        const response = await fetch('/api/submit-query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Something went wrong. Please try again.');
        }
        
        // Show success modal
        showSuccessModal(result.message);
        
        // Reset form
        form.reset();
        
        // Add success animation to form
        const formContainer = document.querySelector('.form-container');
        formContainer.classList.add('success-animation');
        setTimeout(() => {
            formContainer.classList.remove('success-animation');
        }, 600);
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    } finally {
        // Remove loading state
        form.classList.remove('loading');
        submitBtn.innerHTML = originalText;
    }
});

// Form validation
function validateForm(data) {
    // Check required fields
    if (!data.fullName || !data.className || !data.city || !data.state || !data.phoneNumber) {
        return false;
    }
    
    // Validate phone number (allow all types)
    const phoneRegex = /^[\d\s\-\+\(\)]{7,16}$/;
    if (!phoneRegex.test(data.phoneNumber.replace(/\s/g, ''))) {
        return false;
    }
    
    // Validate name (should be at least 2 characters)
    if (data.fullName.trim().length < 2) {
        return false;
    }
    
    return true;
}

// Show success modal
function showSuccessModal(message) {
    successMessage.textContent = message;
    successModal.style.display = 'block';
    
    // Add animation class
    setTimeout(() => {
        successModal.querySelector('.modal-content').style.animation = 'modalSlideIn 0.3s ease';
    }, 10);
}

// Close modal
closeModal.addEventListener('click', () => {
    successModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === successModal) {
        successModal.style.display = 'none';
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && successModal.style.display === 'block') {
        successModal.style.display = 'none';
    }
});

// Show error message
function showError(message) {
    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
            <button class="error-close">&times;</button>
        </div>
    `;
    
    // Add styles
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #E74C3C, #C0392B);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(231, 76, 60, 0.3);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
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
        
        .error-content {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .error-close {
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
        
        .error-close:hover {
            opacity: 0.8;
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(errorDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 300);
        }
    }, 5000);
    
    // Close button functionality
    const closeBtn = errorDiv.querySelector('.error-close');
    closeBtn.addEventListener('click', () => {
        errorDiv.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 300);
    });
}

// Real-time form validation
const inputs = form.querySelectorAll('input, select, textarea');
inputs.forEach(input => {
    input.addEventListener('blur', () => {
        validateField(input);
    });
    
    input.addEventListener('input', () => {
        if (input.classList.contains('error')) {
            validateField(input);
        }
    });
});

function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    
    // Remove existing error styling
    field.classList.remove('error');
    
    // Validation rules
    let isValid = true;
    let errorMessage = '';
    
    switch (fieldName) {
        case 'fullName':
            if (value.length < 2) {
                isValid = false;
                errorMessage = 'Name must be at least 2 characters long';
            }
            break;
            
        case 'className':
            if (!value) {
                isValid = false;
                errorMessage = 'Please select a class';
            }
            break;
            
        case 'city':
            if (value.length < 2) {
                isValid = false;
                errorMessage = 'City must be at least 2 characters long';
            }
            break;
            
        case 'state':
            if (value.length < 2) {
                isValid = false;
                errorMessage = 'State must be at least 2 characters long';
            }
            break;
            
        case 'phoneNumber':
            // Allow all types of phone numbers
            const phoneRegex = /^[\d\s\-\+\(\)]{7,16}$/;
            if (!phoneRegex.test(value.replace(/\s/g, ''))) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number';
            }
            break;
    }
    
    if (!isValid) {
        field.classList.add('error');
        showFieldError(field, errorMessage);
    } else {
        removeFieldError(field);
    }
}

function showFieldError(field, message) {
    // Remove existing error message
    removeFieldError(field);
    
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        color: #E74C3C;
        font-size: 0.8rem;
        margin-top: 0.25rem;
        animation: fadeIn 0.3s ease;
    `;
    
    // Add animation style if not exists
    if (!document.querySelector('#field-error-style')) {
        const style = document.createElement('style');
        style.id = 'field-error-style';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-5px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .field-error {
                color: #E74C3C;
                font-size: 0.8rem;
                margin-top: 0.25rem;
                animation: fadeIn 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }
    
    field.parentNode.appendChild(errorDiv);
}

function removeFieldError(field) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

// Phone number formatting
const phoneInput = document.getElementById('phoneNumber');
phoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Format phone number
    if (value.length > 0) {
        if (value.length <= 3) {
            value = value;
        } else if (value.length <= 6) {
            value = value.slice(0, 3) + '-' + value.slice(3);
        } else {
            value = value.slice(0, 3) + '-' + value.slice(3, 6) + '-' + value.slice(6, 10);
        }
    }
    
    e.target.value = value;
});

// Smooth scroll to form on page load
window.addEventListener('load', () => {
    // Add a subtle entrance animation
    const formContainer = document.querySelector('.form-container');
    formContainer.style.opacity = '0';
    formContainer.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        formContainer.style.transition = 'all 0.6s ease';
        formContainer.style.opacity = '1';
        formContainer.style.transform = 'translateY(0)';
    }, 100);
});

// Add focus effects to form elements
inputs.forEach(input => {
    input.addEventListener('focus', () => {
        input.parentNode.style.transform = 'scale(1.02)';
        input.parentNode.style.transition = 'transform 0.2s ease';
    });
    
    input.addEventListener('blur', () => {
        input.parentNode.style.transform = 'scale(1)';
    });
});

// Prevent form submission on Enter key in textarea
const textarea = document.getElementById('question');
textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
        // Allow Shift+Enter for new line
        return;
    } else if (e.key === 'Enter') {
        e.preventDefault();
        form.dispatchEvent(new Event('submit'));
    }
}); 