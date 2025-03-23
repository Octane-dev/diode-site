import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import './styles/Buttons.css'
import { API_BASE_URL } from '../config';

function Dashboard() {
    const [user, setUser] = useState(null);
    const [guilds, setGuilds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/check`, {
                    credentials: 'include',
                });
                const data = await response.json();
                console.log('Avatar:', data.user.avatar);

                if (response.ok) {
                    setUser(data.user);
                } else {
                    throw new Error(data.error || 'Error fetching user info');
                }
            } catch (err) {
                setError(err.message);
                console.error('Error fetching user info:', err);
            }
        };

        const fetchGuilds = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/guilds`, {
                    credentials: 'include',
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error fetching guilds info');
                }

                const data = await response.json();
                setGuilds(data); // Guilds now include botPresent
            } catch (err) {
                setError(err.message);
                console.error('Error fetching guilds info:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserInfo();
        fetchGuilds();
    }, []);

    const handleGuildClick = (guildId) => {
        const guild = guilds.find((g) => g.id === guildId);
        if (guild.botPresent) {
            window.location.href = `/guild/${guildId}`;
        } else {
            window.location.href = `${API_BASE_URL}/discord/invite/${guildId}`;
        }
    };

    if (loading) {
        return (
            <div className="text-center mt-5">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </div>
        );
    }

    if (error) {
        return (
            <Container className="text-center mt-5">
                <Alert variant="danger">{error}</Alert>
            </Container>
        );
    }

    return (
        <Container className="mt-5">
            <div className="text-center mb-4">
                <h1>Dashboard</h1>
                    {user && (
                        <div className="mt-3">
                            <h2>Welcome, {user.username}!</h2>
                            <img
                                className="rounded-circle mt-2"
                                src={
                                    user.avatar
                                        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}`
                                        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator, 10) % 5}.png`
                                }
                                alt="Avatar"
                                style={{ width: '100px', height: '100px' }}
                            />
                        </div>
                    )}
            </div>
            <h2 className="text-center mb-4">Your Guilds</h2>
            <Row xs={1} sm={2} md={3} lg={4} className="g-4">
                {guilds.map((guild) => (
                    <Col key={guild.id}>
                        <Card className="h-100 shadow-sm" style={{ backgroundColor: '#1b1b1b' }}>
                            <Card.Body className="d-flex flex-column align-items-center">
                                <div
                                    style={{
                                        width: '100px',
                                        height: '100px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '1rem',
                                    }}
                                >
                                    {guild.icon ? (
                                        <img
                                            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                                            alt={guild.name}
                                            className="rounded-circle"
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                            }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                backgroundColor: '#5865F2',
                                                color: '#FFFFFF',
                                                borderRadius: '50%',
                                                width: '100%',
                                                height: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '36px',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            {guild.name[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <Card.Title style={{ textAlign: 'center', marginBottom: '1rem' }}>{guild.name}</Card.Title>
                                <Button
                                    variant={guild.botPresent ? 'secondary' : 'success'}
                                    className={guild.botPresent ? 'mt-auto secondary-button-outline' : 'mt-auto primary-button'}
                                    onClick={() => handleGuildClick(guild.id)}
                                >
                                    {guild.botPresent ? 'Manage' : 'Invite'}
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </Container>
    );
}

export default Dashboard;
