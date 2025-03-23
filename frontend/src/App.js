import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { Navbar, Nav, NavDropdown, Container } from 'react-bootstrap';
import { API_BASE_URL } from './config';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import Home from './components/Home';
import Status from './components/Status';
import Footer from './components/Footer';
import Settings from './components/Settings';
import Dashboard from './components/Dashboard';
import ContactPage from './components/ContactPage';
import EmbedBuilder from './components/EmbedBuilder';
import GuildDetails from './components/GuildDetails';
import ServerRedirect from './components/ServerRedirect';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    const [user, setUser] = useState(null);

    // Check user authentication when the app loads
    useEffect(() => {
        fetch(`${API_BASE_URL}/auth/check`, { credentials: 'include' }) // Includes cookies for authentication
            .then(response => response.json())
            .then(data => {
                console.log(`${API_BASE_URL}/auth/check`)
                console.log('Auth check response:', data); // Debug the response here
                if (data.authenticated) {
                    setUser(data.user); // Set the user if authenticated
                }
            })
            .catch(err => console.error('Error in auth check:', err)); // Log any errors during the auth check
    }, []);    

    return (
        <Router>
            <div className="text-light min-vh-100">
                {/* Navbar */}
                <Navbar bg="dark" variant="dark" expand="lg">
                    <Container>
                        <Navbar.Brand as={Link} to="/">Home</Navbar.Brand>
                        <Navbar.Toggle aria-controls="basic-navbar-nav" />
                        <Navbar.Collapse id="basic-navbar-nav">
                            <Nav className="me-auto">
                                <Nav.Link href="https://api.octaneinteractive.co.uk/discord/invite">Invite</Nav.Link>
                                <Nav.Link as={Link} to="/documentation">Docs</Nav.Link>
                                <Nav.Link href="https://discord.com/invite/WpH4dNhPPn">Discord</Nav.Link>
                                <Nav.Link as={Link} to="/status">Status</Nav.Link>
                                <Nav.Link as={Link} to="/embed-builder">Embed Builder</Nav.Link>
                            </Nav>
                            <Nav>
                                {/* Conditional rendering for login/logout */}
                                {user ? (
                                    <NavDropdown title={`Welcome, ${user.username}`} id="basic-nav-dropdown" className="bg-dark text-light">
                                        <NavDropdown.Item as={Link} to="/dashboard">Dashboard</NavDropdown.Item>
                                        <NavDropdown.Item as={Link} to="/settings">Settings</NavDropdown.Item>
                                        <NavDropdown.Divider />
                                        <NavDropdown.Item href="https://api.octaneinteractive.co.uk/auth/logout">Logout</NavDropdown.Item>
                                    </NavDropdown>
                                ) : (
                                    <Nav.Link href="https://api.octaneinteractive.co.uk/auth/discord" className="btn btn-success" style={{ backgroundColor: '#1b983c', color: '#ffffff' }}>
                                        Login with Discord
                                    </Nav.Link>
                                )}
                            </Nav>
                        </Navbar.Collapse>
                    </Container>
                </Navbar>

                {/* Main content area */}
                <Container fluid className="mt-3">
                    <Routes>
                        <Route path="/" element={<Home user={user} />} />
                        <Route path="/embed-builder" element={<EmbedBuilder />} />
                        <Route path="/dashboard" element={<ProtectedRoute component={Dashboard} />} />
                        <Route path="/settings" element={<ProtectedRoute component={Settings} />} />
                        <Route path="/status" element={<Status />} />
                        <Route path="/guild/:guildId" element={<ProtectedRoute component={GuildDetails} />} />
                        <Route path="/auth/discord/server" element={<ServerRedirect />} />
                        <Route path="/contact" element={<ContactPage />} />
                    </Routes>
                </Container>
            </div>

            {/* Footer */}
            <Footer />
        </Router>
    );
}

export default App;
