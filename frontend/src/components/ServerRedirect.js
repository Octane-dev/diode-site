import React from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ServerRedirect() {
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect the user to the dashboard or other relevant page
        navigate('/dashboard');
    }, [navigate]);

    return (
        <div>
            <h1>Redirecting...</h1>
            <p>Please wait while we redirect you to your dashboard.</p>
        </div>
    );
}

export default ServerRedirect;
