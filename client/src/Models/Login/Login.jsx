import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../Services/apiService';
import { loginSuccess } from '../../Slices/authSlice';
import { toast } from 'react-toastify';
import './Login.css';

const Login = () => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false); 

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const validateForm = () => {
        const errors = {};
        if (!credentials.username.trim()) errors.username = 'Korisničko ime je obavezno';
        if (!credentials.password) errors.password = 'Lozinka je obavezna';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
        if (fieldErrors[e.target.name]) {
            setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            const response = await userService.login(credentials);
            dispatch(loginSuccess(response)); 
            navigate('/'); 
        } catch (err) {
            toast.error('Pogrešno korisničko ime ili lozinka');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-page-container">
            <div className="login-minimal-box">
                <h2 className="login-heading">Da li ste korisnik?</h2>
                
                <form className="login-form-minimal" onSubmit={handleSubmit}>
                    <div className="input-field-minimal">
                        <input 
                            type="text" 
                            name="username" 
                            placeholder="Korisničko ime" 
                            value={credentials.username}
                            onChange={handleChange} 
                            required 
                        />
                        <span className="input-underline"></span>
                        {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
                    </div>
                    
                    <div className="input-field-minimal">
                        <input 
                            type="password" 
                            name="password" 
                            placeholder="Lozinka" 
                            value={credentials.password}
                            onChange={handleChange} 
                            required 
                        />
                        <span className="input-underline"></span>
                        {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
                    </div>
                    
                    <button 
                        type="submit" 
                        className={`login-black-btn ${isSubmitting ? 'loading' : ''}`}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Prijavljivanje...' : 'Uloguj se'}
                    </button>

                    <div className="login-redirect-area">
                        <p>Nemate nalog?</p>
                        <button 
                            type="button" 
                            className="register-text-link" 
                            onClick={() => navigate('/register')}
                        >
                            Registrujte se
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default React.memo(Login);