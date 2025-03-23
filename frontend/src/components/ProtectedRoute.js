import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

function ProtectedRoute({ component: Component, ...rest }) {
    const [authenticated, setAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE_URL}/auth/check`, {
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            setAuthenticated(data.authenticated);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return authenticated ? <Component {...rest} /> : <Navigate to="/" />;
}

export default ProtectedRoute;
