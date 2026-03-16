import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../Services/apiService';
import { toast } from 'react-toastify';
import './Register.css'; 

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'customer' 
    });
    const [fieldErrors, setFieldErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = () => {
        const errors = {};
        if (!formData.username.trim()) errors.username = 'Korisničko ime je obavezno';
        if (formData.username.length < 3) errors.username = 'Korisničko ime mora imati najmanje 3 karaktera';
        if (!formData.email) errors.email = 'Email je obavezan';
        if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Nevažeći email format';
        if (!formData.password) errors.password = 'Lozinka je obavezna';
        if (formData.password.length < 6) errors.password = 'Lozinka mora imati najmanje 6 karaktera';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (fieldErrors[e.target.name]) {
            setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            await userService.register(formData);
            toast.success("Uspešna registracija! Sada se možete ulogovati.");
            navigate('/login');
        } catch (err) {
            console.error(err);
            toast.error("Greška pri registraciji: " + (err.response?.data?.error || "Pokušajte ponovo."));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="register-page-container">
            <div className="register-minimal-box">
                <h2 className="register-heading">Kreiraj nalog</h2>
                
                <form className="register-form-minimal" onSubmit={handleSubmit}>
                    <div className="input-field-minimal">
                        <input 
                            type="text" 
                            name="username" 
                            placeholder="Korisničko ime" 
                            value={formData.username}
                            onChange={handleChange} 
                            required 
                        />
                        <span className="input-underline"></span>
                        {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
                    </div>
                    
                    <div className="input-field-minimal">
                        <input 
                            type="email" 
                            name="email" 
                            placeholder="Email adresa" 
                            value={formData.email}
                            onChange={handleChange} 
                            required 
                        />
                        <span className="input-underline"></span>
                        {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
                    </div>
                    
                    <div className="input-field-minimal">
                        <input 
                            type="password" 
                            name="password" 
                            placeholder="Lozinka" 
                            value={formData.password}
                            onChange={handleChange} 
                            required 
                        />
                        <span className="input-underline"></span>
                        {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
                    </div>

                    <div className="role-selection-minimal">
                        <label>Registrujem se kao:</label>
                        <select name="role" value={formData.role} onChange={handleChange}>
                            <option value="customer">Kupac (želim da kupujem)</option>
                            <option value="seller">Prodavac (imam svoju prodavnicu)</option>
                        </select>
                    </div>

                    <button 
                        type="submit" 
                        className={`register-black-btn ${isSubmitting ? 'loading' : ''}`}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Kreiranje...' : 'Registruj se'}
                    </button>
                    
                    <div className="register-redirect-area">
                        <p>Već imate nalog?</p>
                        <button 
                            type="button" 
                            className="login-text-link" 
                            onClick={() => navigate('/login')}
                        >
                            Prijavite se
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default React.memo(Register);