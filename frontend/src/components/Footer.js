import React from 'react';
import { Container, Row, Col, Nav } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/Footer.css';

function Footer() {
    return (
        <footer className="footer bg-dark text-light mt-5">
            <Container>
                <Row>
                    <Col md={6}>
                        <p className="mb-0 mt-2">© {new Date().getFullYear()} Diode Dashboard. All Rights Reserved.</p>
                    </Col>
                    <Col md={6} className="text-md-end">
                        <Nav className="justify-content-center justify-content-md-end">
                            <Nav.Link href="/about" className="text-light">About Us</Nav.Link>
                            <Nav.Link href="/privacy" className="text-light">Privacy Policy</Nav.Link>
                            <Nav.Link href="/terms" className="text-light">Terms of Service</Nav.Link>
                            <Nav.Link href="/contact" className="text-light">Contact Us</Nav.Link>
                        </Nav>
                    </Col>
                </Row>
            </Container>
        </footer>
    );
}

export default Footer;
