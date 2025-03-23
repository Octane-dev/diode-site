import React from 'react';
import { Container, Row, Col, OverlayTrigger, Tooltip, Accordion, Card } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/Status.css'; // Custom styles for status bars

function Status() {
    const uptime_span = 10; // 10 days check
    const botUptime = 4;
    const serverUptime = 4;
    const websiteUptime = 5;
    const uptime_bot = (botUptime / uptime_span) * 100;
    const uptime_server = (serverUptime / uptime_span) * 100;
    const uptime_website = (websiteUptime / uptime_span) * 100;

    // Example data for each day
    const botStatusData = [0, 0, 0, 1, 2, 1, 2, 2, 0, 0]; // 2 is full uptime, 1 is partial, 0 is downtime
    const serverStatusData = [0, 0, 0, 2, 2, 0, 1, 1, 0, 2];
    const websiteStatusData = [0, 0, 0, 0, 1, 2, 1, 2, 2, 2];

    // Sample logs
    // const logs = [
    //     { date: '2024-08-15', issue: 'Routine Check', details: 'All systems operational. Slight hiccup in the server earlier.' },
    //     { date: '2024-08-16', issue: 'Network Outage', details: 'All services are currently out of order. Check back later.' },
    // ];
    const logs = [
        { date: '2025-03-21', issue: 'Bot Maintenance', details: 'Bot is down due to maintenance and server issues.' },
        { date: '2025-03-16', issue: 'Service Return', details: 'Finally, services are returning to the bot! Expect hiccups and downtime.' },
        { date: '2024-08-16', issue: 'Network Outage', details: 'All services are currently out of order. This will take a while to sort. Keep patient.' },
    ];

    // Calculate dates for the last 10 days
    const getDates = () => {
        const dates = [];
        const today = new Date();

        for (let i = 0; i < uptime_span; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - (uptime_span - 1) + i);
            dates.push(date.toLocaleDateString());
        }

        return dates;
    };

    const dates = getDates();

    const renderStatusBar = (statusData) => {
        return statusData.map((status, index) => {
            let color = 'bg-success'; // Green for full uptime

            if (status === 0) {
                color = 'bg-danger'; // Red for downtime
            } else if (status < 2) {
                color = 'bg-warning'; // Yellow for partial uptime
            }

            return (
                <OverlayTrigger
                    key={index}
                    placement="top"
                    overlay={
                        <Tooltip>
                            Date: {dates[index]}<br />
                            Status: {status === 2 ? 'Operational' : status === 0 ? 'Significant Outage' : 'Partial Outage'}
                        </Tooltip>
                    }
                >
                    <div className={`status-chunk ${color}`}></div>
                </OverlayTrigger>
            );
        });
    };

    return (
        <Container className='mt-5'>
            <h1 className='display-4 fw-light'>Status</h1>
            <h3 className='fs-4 fw-light'>Data from the last 10 days.</h3>
            <Row className='mt-4'>
                <Col className='mt-4'>
                    <h3 className='fw-normal'>Bot Status</h3>
                    <h5 className='fw-light'>Uptime: <span className='fw-normal'>{uptime_bot}%</span></h5>
                    <div className="status-bar">
                        {renderStatusBar(botStatusData)}
                    </div>
                </Col>
                <Col className='mt-4'>
                    <h3 className='fw-normal'>Server/API Status</h3>
                    <h5 className='fw-light'>Uptime: <span className='fw-normal'>{uptime_server}%</span></h5>
                    <div className="status-bar">
                        {renderStatusBar(serverStatusData)}
                    </div>
                </Col>
                <Col className='mt-4'>
                    <h3 className='fw-normal'>Website Status</h3>
                    <h5 className='fw-light'>Uptime: <span className='fw-normal'>{uptime_website}%</span></h5>
                    <div className="status-bar">
                        {renderStatusBar(websiteStatusData)}
                    </div>
                </Col>
            </Row>
            <h2 className='mt-5'>Logs</h2>
            <Accordion defaultActiveKey="0" className="accordion-flush status-accordion">
                {logs.sort((a, b) => new Date(b.date) - new Date(a.date)).map((log, index) => (
                    <Card key={index} className='mt-2'>
                        <Accordion.Item eventKey={index.toString()}>
                            <Accordion.Header>{log.date}: {log.issue}</Accordion.Header>
                            <Accordion.Body>
                                <p><strong>Date:</strong> {log.date}</p>
                                <p><strong>Issue:</strong> {log.issue}</p>
                                <p><strong>Details:</strong> {log.details}</p>
                            </Accordion.Body>
                        </Accordion.Item>
                    </Card>
                ))}
            </Accordion>
        </Container>
    );
}

export default Status;
