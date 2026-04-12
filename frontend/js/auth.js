/**
 * Auth.js - Login and registration logic with regex validation
 */

// ============================================
// REGEX PATTERNS
// ============================================
const REGEX_PATTERNS = {
    // Email: RFC 5322 simplified pattern
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    
    // Password: Minimum 8 chars, 1 uppercase, 1 lowercase, 1 number
    password: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/,
    
    // Strong password: 8+ chars, uppercase, lowercase, number, special char
    strongPassword: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    
    // Full Name: 2+ words, letters and spaces only
    fullName: /^[a-zA-Z\s]{2,}$/,
    
    // Phone: International format support
    phone: /^[+]?[\d\s\-()]{7,}$/,
};

// ============================================
// VALIDATION MESSAGES
// ============================================
const VALIDATION_MESSAGES = {
    email: {
        required: 'Email address is required',
        invalid: 'Please enter a valid email address (e.g., user@example.com)',
    },
    password: {
        required: 'Password is required',
        invalid: 'Password must be at least 8 characters with uppercase, lowercase, and a number',
        tooShort: 'Password must be at least 8 characters',
        noUppercase: 'Password must contain at least one uppercase letter',
        noLowercase: 'Password must contain at least one lowercase letter',
        noNumber: 'Password must contain at least one number',
    },
    fullName: {
        required: 'Full name is required',
        invalid: 'Please enter a valid name (letters and spaces only, minimum 2 characters)',
    },
    phone: {
        invalid: 'Please enter a valid phone number',
    },
    confirmPassword: {
        required: 'Please confirm your password',
        mismatch: 'Passwords do not match',
    },
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate email using regex
 */
function validateEmail(email) {
    if (!email) {
        return {
            valid: false,
            message: VALIDATION_MESSAGES.email.required,
        };
    }
    
    if (!REGEX_PATTERNS.email.test(email)) {
        return {
            valid: false,
            message: VALIDATION_MESSAGES.email.invalid,
        };
    }
    
    return { valid: true, message: '' };
}

/**
 * Validate password using regex
 */
function validatePassword(password) {
    if (!password) {
        return {
            valid: false,
            message: VALIDATION_MESSAGES.password.required,
        };
    }
    
    if (password.length < 8) {
        return {
            valid: false,
            message: VALIDATION_MESSAGES.password.tooShort,
        };
    }
    
    if (!/[A-Z]/.test(password)) {
        return {
            valid: false,
            message: VALIDATION_MESSAGES.password.noUppercase,
        };
    }
    
    if (!/[a-z]/.test(password)) {
        return {
            valid: false,
            message: VALIDATION_MESSAGES.password.noLowercase,
        };
    }
    
    if (!/\d/.test(password)) {
        return {
            valid: false,
            message: VALIDATION_MESSAGES.password.noNumber,
        };
    }
    
    return { valid: true, message: '' };
}

/**
 * Update input field styling and error message
 */
function updateFieldStatus(fieldId, isValid, message = '') {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}Error`);
    
    if (isValid) {
        field.classList.remove('error');
        field.classList.add('success');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
        }
    } else {
        field.classList.remove('success');
        field.classList.add('error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }
}

/**
 * Clear field status
 */
function clearFieldStatus(fieldId) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}Error`);
    
    field.classList.remove('error', 'success');
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }
}

/**
 * Validate full name using regex
 */
function validateFullName(fullName) {
    if (!fullName) {
        return {
            valid: false,
            message: VALIDATION_MESSAGES.fullName.required,
        };
    }
    
    if (!REGEX_PATTERNS.fullName.test(fullName.trim())) {
        return {
            valid: false,
            message: VALIDATION_MESSAGES.fullName.invalid,
        };
    }
    
    return { valid: true, message: '' };
}

/**
 * Validate phone number using regex (optional field)
 */
function validatePhone(phone) {
    // If phone is empty, it's optional so it's valid
    if (!phone || phone.trim() === '') {
        return { valid: true, message: '' };
    }
    
    if (!REGEX_PATTERNS.phone.test(phone.trim())) {
        return {
            valid: false,
            message: VALIDATION_MESSAGES.phone.invalid,
        };
    }
    
    return { valid: true, message: '' };
}

/**
 * Validate confirm password
 */
function validateConfirmPassword(confirmPassword, password) {
    if (!confirmPassword) {
        return {
            valid: false,
            message: VALIDATION_MESSAGES.confirmPassword.required,
        };
    }
    
    if (confirmPassword !== password) {
        return {
            valid: false,
            message: VALIDATION_MESSAGES.confirmPassword.mismatch,
        };
    }
    
    return { valid: true, message: '' };
}

/**
 * Calculate password strength
 */
function calculatePasswordStrength(password) {
    let strength = 0;
    
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    if (password.length >= 12) strength++;
    
    if (strength < 2) return { level: 'weak', score: 1 };
    if (strength < 4) return { level: 'medium', score: 2 };
    return { level: 'strong', score: 3 };
}

/**
 * Update password strength indicator
 */
function updatePasswordStrength(password) {
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    if (!strengthFill || !strengthText) return;
    
    if (!password) {
        strengthFill.className = 'strength-fill';
        strengthText.textContent = '';
        return;
    }
    
    const strength = calculatePasswordStrength(password);
    strengthFill.className = `strength-fill ${strength.level}`;
    strengthText.textContent = `Strength: ${strength.level.charAt(0).toUpperCase() + strength.level.slice(1)}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    // ========================================
    // LOGIN FORM HANDLING
    // ========================================
    if (loginForm) {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const loginBtn = document.getElementById('loginBtn');
        
        // Real-time validation on email input
        emailInput?.addEventListener('blur', (e) => {
            const validation = validateEmail(e.target.value);
            updateFieldStatus('email', validation.valid, validation.message);
        });
        
        emailInput?.addEventListener('focus', () => {
            clearFieldStatus('email');
        });
        
        // Real-time validation on password input
        passwordInput?.addEventListener('blur', (e) => {
            const validation = validatePassword(e.target.value);
            updateFieldStatus('password', validation.valid, validation.message);
        });
        
        passwordInput?.addEventListener('focus', () => {
            clearFieldStatus('password');
        });
        
        // Form submission
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const rememberMe = document.getElementById('rememberMe')?.checked;
            
            // Validate all fields
            const emailValidation = validateEmail(email);
            const passwordValidation = validatePassword(password);
            
            updateFieldStatus('email', emailValidation.valid, emailValidation.message);
            updateFieldStatus('password', passwordValidation.valid, passwordValidation.message);
            
            // If validation fails, stop submission
            if (!emailValidation.valid || !passwordValidation.valid) {
                return;
            }
            
            // Disable button during submission
            loginBtn.disabled = true;
            loginBtn.textContent = 'SIGNING IN...';
            
            try {
                // Call login API
                const response = await fetch('/api/users/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email,
                        password,
                        rememberMe,
                    }),
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store token and redirect
                    localStorage.setItem('authToken', data.token);
                    if (rememberMe) {
                        localStorage.setItem('rememberEmail', email);
                    }
                    
                    // Redirect to previous page or home
                    const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
                    window.location.href = redirectUrl;
                } else {
                    // Show error message
                    updateFieldStatus('email', false, data.message || 'Login failed. Please try again.');
                }
            } catch (error) {
                console.error('Login error:', error);
                updateFieldStatus('email', false, 'Connection error. Please try again.');
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = 'SIGN IN';
            }
        });
        
        // Pre-fill email if "Remember me" was used
        const rememberedEmail = localStorage.getItem('rememberEmail');
        if (rememberedEmail) {
            emailInput.value = rememberedEmail;
            document.getElementById('rememberMe').checked = true;
        }
    }
    
    // ========================================
    // REGISTRATION FORM HANDLING
    // ========================================
    if (registerForm) {
        const fullNameInput = document.getElementById('fullName');
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const registerBtn = document.getElementById('registerBtn');
        const termsCheckbox = document.getElementById('termsAgree');
        
        // Full Name Validation
        fullNameInput?.addEventListener('blur', (e) => {
            const validation = validateFullName(e.target.value);
            updateFieldStatus('fullName', validation.valid, validation.message);
        });
        
        fullNameInput?.addEventListener('focus', () => {
            clearFieldStatus('fullName');
        });
        
        // Email Validation
        emailInput?.addEventListener('blur', (e) => {
            const validation = validateEmail(e.target.value);
            updateFieldStatus('email', validation.valid, validation.message);
        });
        
        emailInput?.addEventListener('focus', () => {
            clearFieldStatus('email');
        });
        
        // Phone Validation (Optional)
        phoneInput?.addEventListener('blur', (e) => {
            const validation = validatePhone(e.target.value);
            updateFieldStatus('phone', validation.valid, validation.message);
        });
        
        phoneInput?.addEventListener('focus', () => {
            clearFieldStatus('phone');
        });
        
        // Password Validation with Strength Indicator
        passwordInput?.addEventListener('input', (e) => {
            updatePasswordStrength(e.target.value);
        });
        
        passwordInput?.addEventListener('blur', (e) => {
            const validation = validatePassword(e.target.value);
            updateFieldStatus('password', validation.valid, validation.message);
        });
        
        passwordInput?.addEventListener('focus', () => {
            clearFieldStatus('password');
        });
        
        // Confirm Password Validation
        confirmPasswordInput?.addEventListener('blur', (e) => {
            const password = passwordInput.value;
            const validation = validateConfirmPassword(e.target.value, password);
            updateFieldStatus('confirmPassword', validation.valid, validation.message);
        });
        
        confirmPasswordInput?.addEventListener('focus', () => {
            clearFieldStatus('confirmPassword');
        });
        
        // Form Submission
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullName = fullNameInput.value.trim();
            const email = emailInput.value.trim();
            const phone = phoneInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            const agreeToTerms = termsCheckbox.checked;
            const subscribeEmail = document.getElementById('subscribeEmail')?.checked;
            
            // Validate all fields
            const fullNameValidation = validateFullName(fullName);
            const emailValidation = validateEmail(email);
            const phoneValidation = validatePhone(phone);
            const passwordValidation = validatePassword(password);
            const confirmPasswordValidation = validateConfirmPassword(confirmPassword, password);
            
            updateFieldStatus('fullName', fullNameValidation.valid, fullNameValidation.message);
            updateFieldStatus('email', emailValidation.valid, emailValidation.message);
            updateFieldStatus('phone', phoneValidation.valid, phoneValidation.message);
            updateFieldStatus('password', passwordValidation.valid, passwordValidation.message);
            updateFieldStatus('confirmPassword', confirmPasswordValidation.valid, confirmPasswordValidation.message);
            
            // Check if all validations passed
            if (!fullNameValidation.valid || !emailValidation.valid || !phoneValidation.valid || 
                !passwordValidation.valid || !confirmPasswordValidation.valid || !agreeToTerms) {
                
                if (!agreeToTerms) {
                    alert('Please agree to the Terms of Service and Privacy Policy');
                }
                return;
            }
            
            // Disable button during submission
            registerBtn.disabled = true;
            registerBtn.textContent = 'CREATING ACCOUNT...';
            
            try {
                // Call registration API
                const response = await fetch('/api/users/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fullName,
                        email,
                        phone: phone || null,
                        password,
                        subscribeEmail,
                    }),
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store token and redirect to login
                    localStorage.setItem('authToken', data.token);
                    
                    // Show success message or redirect
                    alert('Account created successfully! Redirecting to login...');
                    window.location.href = 'login.html';
                } else {
                    // Show error message
                    updateFieldStatus('email', false, data.message || 'Registration failed. Please try again.');
                }
            } catch (error) {
                console.error('Registration error:', error);
                updateFieldStatus('email', false, 'Connection error. Please try again.');
            } finally {
                registerBtn.disabled = false;
                registerBtn.textContent = 'CREATE ACCOUNT';
            }
        });
    }
});

// ============================================
// EXPORT FOR TESTING
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        REGEX_PATTERNS,
        validateEmail,
        validatePassword,
    };
}
