import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../Services/apiService';
import './Register.css'; 

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'customer' 
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await userService.register(formData);
            alert("Uspešna registracija! Sada se možete ulogovati.");
            navigate('/login');
        } catch (err) {
            console.error(err);
            alert("Greška pri registraciji: " + (err.response?.data?.error || "Pokušajte ponovo."));
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
                    </div>

                    <div className="role-selection-minimal">
                        <label>Registrujem se kao:</label>
                        <select name="role" value={formData.role} onChange={handleChange}>
                            <option value="customer">Kupac (želim da kupujem)</option>
                            <option value="vendor">Prodavac (imam svoju prodavnicu)</option>
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

export default Register;