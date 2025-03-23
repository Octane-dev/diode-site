import React from 'react';
import { Container, Image, Button, Col } from 'react-bootstrap';
import logo from '../common/images/logo.png'
import './styles/Buttons.css'
import './styles/Extras.css'

function Home({ user }) {
    return (
        <Container className="text-center mt-5">
            <Image src={logo} alt="Bot Logo" rounded fluid style={{ maxWidth: '450px' }} />
            <h1 className="mt-4 display-2">Diode</h1>
            <h2 className='mt-2 fs-3 fw-light'>A Multipurpose Discord Bot</h2>
            <Col className='d-flex justify-content-center gap-3 mt-3'>
                <Button 
                    href="https://api.octaneinteractive.co.uk/discord/invite" 
                    variant="success" 
                    size="lg" 
                    className="primary-button"
                >
                    Invite Now
                </Button>
                <Button 
                    href={user ? "/dashboard" : undefined}
                    variant="secondary" 
                    size="lg"
                    className={user ? 'pointer-cursor secondary-button-outline' : 'not-allowed-cursor secondary-button-outline'}
                    disabled={!user}
                >
                    Manage
                </Button>
            </Col>
        </Container>
    );
}

export default Home;
