import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../Services/apiService';
import { loginSuccess } from '../../Slices/authSlice';
import './Login.css';

const Login = () => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false); // Za efekat na dugmetu

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const user = await userService.login(credentials);
            dispatch(loginSuccess(user)); 
            // Alert je malo "staromodan", pa možemo direktno navigaciju, ali ostavljam ako želiš
            // alert('Uspešan login!');
            navigate('/'); 
        } catch (err) {
            setError('Pogrešno korisničko ime ili lozinka');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-page-container">
            <div className="login-minimal-box">
                <h2 className="login-heading">Da li ste korisnik?</h2>
                
                {error && <div className="minimal-error-msg">{error}</div>}
                
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

export default Login;