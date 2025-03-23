import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Accordion, ListGroup } from 'react-bootstrap';
import './styles/AccordionS.css'
import { API_BASE_URL } from '../config';

function GuildDetails() {
    const { guildId } = useParams();
    const [guildData, setGuildData] = useState(null); 
    const [roles, setRoles] = useState([]);
    const [channels, setChannels] = useState([]);
    const [botCommands, setBotCommands] = useState([
        { command: '/help', description: 'Shows help information' },
        { command: '/kick [user]', description: 'Kicks a user from the server' },
        { command: '/ban [user]', description: 'Bans a user from the server' },
    ]);
    const [error, setError] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        const fetchGuildDetails = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/guilds/${guildId}`, {
                    credentials: 'include',
                });
    
                if (response.redirected) {
                    window.location.href = response.url;
                    return;
                }
    
                if (!response.ok) {
                    const errorData = await response.json();
    
                    if (errorData.message === 'You are being rate limited.') {
                        const retryAfter = errorData.retry_after * 1000; // Convert seconds to milliseconds
                        console.warn(`Rate limited. Retrying after ${retryAfter} ms...`);
                        await new Promise((resolve) => setTimeout(resolve, retryAfter)); // Wait for the retry_after duration
                        return fetchGuildDetails(); // Retry the request
                    }
    
                    throw new Error(errorData.message || 'Network response was not ok');
                }
    
                const data = await response.json();
                setGuildData(data.guild);
                console.log(data.guild);
    
                if (data.botPresent) {
                    await Promise.all([fetchRoles(), fetchChannels()]);
                }
            } catch (error) {
                console.error('Fetch error:', error);
                setError('Unable to fetch guild details. Please try again later.');
            }
        };
    
        const fetchCurrentUser = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/users/@me`, {
                    method: 'GET',
                    credentials: 'include',
                });
    
                if (!response.ok) {
                    throw new Error('Failed to fetch current user');
                }
    
                const userData = await response.json();
                setCurrentUserId(userData.id);
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };
    
        const fetchRoles = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/guilds/${guildId}/roles`, {
                    credentials: 'include',
                });
                if (!response.ok) throw new Error('Error fetching roles');
                const data = await response.json();
    
                const sortedRoles = data.roles.sort((a, b) => b.permissions - a.permissions);
    
                setRoles(sortedRoles);
            } catch (error) {
                console.error('Error fetching roles:', error);
                setError('Unable to fetch roles.');
            }
        };
    
        const fetchChannels = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/guilds/${guildId}/channels`, {
                    credentials: 'include',
                });
                if (!response.ok) throw new Error('Error fetching channels');
                const data = await response.json();
                setChannels(data.channels);
            } catch (error) {
                console.error('Error fetching channels:', error);
                setError('Unable to fetch channels.');
            }
        };
    
        fetchGuildDetails();
        fetchCurrentUser();
    }, [guildId]);    
    

    if (error) {
        return (
            <div className="text-center mt-5">
                <h1 className="text-danger">Guild Details</h1>
                <p>{error}</p>
            </div>
        );
    }

    if (!guildData) {
        return (
            <div className="text-center mt-5">
                <h1>Guild Details</h1>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="container py-5">
            {/* Header */}
            <div className="text-center mb-5">
                <h1 className="display-4">Guild Details</h1>
            </div>

            {/* Guild Information */}
            <div className="card mb-5 shadow">
                <div className="card-body text-center"
                    style={{ backgroundColor: '#212529'}}>
                    {/* Guild Icon */}
                    <div className="mb-4 d-flex justify-content-center">
                        {guildData.icon ? (
                            <img
                                className="rounded-circle"
                                src={`https://cdn.discordapp.com/icons/${guildData.id}/${guildData.icon}.png`}
                                alt={`${guildData.name} Icon`}
                                style={{ width: '120px', height: '120px', objectFit: 'cover'}}
                            />
                        ) : (
                            <div
                                className="rounded-circle d-flex justify-content-center align-items-center"
                                style={{
                                    width: '120px',
                                    height: '120px',
                                    backgroundColor: '#5a66ef',
                                    color: '#FFF',
                                    fontSize: '48px',
                                    fontWeight: 'bold',
                                }}
                            >
                                {guildData.name[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>

                    <h2 className="card-title">{guildData.name}</h2>
                    <p style={{ color: '#8b9dad' }}>ID: {guildData.id}</p>
                    {/* <p>Member Count: {guildData.approximate_member_count || 'N/A'}</p> */}
                    <p>Owner: {guildData.owner_id === currentUserId ? 'Yes' : 'No'}</p>
                </div>
            </div>

            {/* Roles Section */}
            <div className="mb-5">
                <h3 className="mb-3">Roles</h3>
                <div className="row g-3">
                    {roles.length > 0 ? (
                        roles.map((role) => (
                            <div key={role.id} className="col-md-4">
                                <div
                                    className="card shadow-sm"
                                    style={{
                                        borderLeft: `5px solid #${role.color.toString(16).padStart(6, '0')}`,
                                        backgroundColor: '#212529'
                                    }}
                                >
                                    <div className="card-body">
                                        <p className="card-text">{role.name}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ color: '#6c757d' }}>No roles available or bot lacks permissions.</p>

                    )}
                </div>
            </div>

            {/* Channels Section */}
            <div className="mb-5">
                <h3 className="mb-3">Channels</h3>
                {channels.length > 0 ? (
                    <Accordion defaultActiveKey="0" className="accordion-flush status-accordion">
                        {Object.entries(
                            channels.reduce((grouped, channel) => {
                                const categoryId = channel.parent_id || 'no-category';
                                if (!grouped[categoryId]) {
                                    grouped[categoryId] = [];
                                }
                                grouped[categoryId].push(channel);
                                return grouped;
                            }, {})
                        )
                            .filter(([categoryId]) => categoryId !== 'no-category')
                            .map(([categoryId, groupedChannels], index) => {
                                const categoryName =
                                    channels.find((ch) => ch.id === categoryId)?.name || 'No Category';

                                return (
                                    <Accordion.Item eventKey={index.toString()} key={categoryId}>
                                        <Accordion.Header className="accordion-header accordion-border">{categoryName}</Accordion.Header>
                                        <Accordion.Body>
                                            <ListGroup>
                                                {groupedChannels.map((channel) => (
                                                    <ListGroup.Item
                                                        key={channel.id}
                                                        style={{
                                                            borderLeft: `5px solid ${
                                                                channel.type === 0
                                                                ? '#5865F2'
                                                                : channel.type === 2
                                                                ? '#43B581'
                                                                : channel.type === 15
                                                                ? '#FAA61A'
                                                                : channel.type === 13
                                                                ? '#E91E63'
                                                                : channel.type === 5
                                                                ? '#FFD700'
                                                                : '#99AAB5'
                                                            }`,
                                                            backgroundColor: '#16181a',
                                                            color: '#f8f9fa',
                                                        }}
                                                    >
                                                        {channel.name} ({channel.type === 0
                                                            ? 'Text' 
                                                            : channel.type === 2
                                                            ? 'Voice'
                                                            : channel.type === 15
                                                            ? 'Forum'
                                                            : channel.type === 13
                                                            ? 'Stage'
                                                            : channel.type === 5
                                                            ? 'Announcement'
                                                            : 'Other'
                                                        })
                                                    </ListGroup.Item>
                                                ))}
                                            </ListGroup>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                );
                            })}
                    </Accordion>
                ) : (
                    <p className="custom-muted">No channels available or bot lacks permissions.</p>
                )}
            </div>

            {/* Custom Commands Section */}
            <div className="mb-5">
                <h3 className="mb-3">Custom Commands</h3>
                <div className="row g-3">
                    {botCommands.length > 0 ? (
                        botCommands.map((command, index) => (
                            <div key={index} className="col-md-4">
                                <div className="card shadow-sm"
                                    style={{ backgroundColor: '#212529'}}>
                                    <div className="card-body">
                                        <h5 className="card-title">{command.command}</h5>
                                        <p className="card-text" style={{ color: '#8b9dad' }}>{command.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ color: '#8b9dad' }}>No commands available.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default GuildDetails;
