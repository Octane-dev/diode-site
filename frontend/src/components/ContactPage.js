import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/Buttons.css'
import { API_BASE_URL } from '../config';
// import { FaTwitter, FaLinkedin, FaGithub } from 'react-icons/fa';

function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Sending...');

    try {
        const response = await fetch(`${API_BASE_URL}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        if (response.ok) {
            setStatus('Message sent successfully!');
            setFormData({ name: '', email: '', subject: '', message: '' });
        } else {
            setStatus('Failed to send message. Please try again.');
        }
    } catch (error) {
      setStatus('An error occurred. Please try again later or contact the admin direct.');
    }
  };

  return (
    <div className="container min-vh-100 d-flex flex-column justify-content-center align-items-center">
      <h1 className="text-center mb-5">Contact Us</h1>
      <form onSubmit={handleSubmit} className="w-100 p-4 shadow rounded bg-dark" style={{ maxWidth: '500px' }}>
        <div className="mb-3">
          <label htmlFor="name" className="form-label">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="form-control"
            placeholder="Your Name"
          />
        </div>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="form-control"
            placeholder="Your Email"
          />
        </div>
        <div className="mb-3">
          <label htmlFor="subject" className="form-label">
            Subject
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            className="form-control"
            placeholder="Subject"
          />
        </div>
        <div className="mb-3">
          <label htmlFor="message" className="form-label">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            className="form-control"
            rows="5"
            placeholder="Your Message"
          ></textarea>
        </div>
        <button type="submit" className="btn w-100 mt-auto primary-button" style={{ color: '#FFF'}}>
          Send Message
        </button>
      </form>
      {status && <p className="mt-3 text-center">{status}</p>}
      <div className="mt-5">
        <h2 className="text-center mb-3">Useful Links</h2>
        <div className="d-flex justify-content-around">
          <a
            href="https://twitter.com"
            className="text-decoration-none d-flex align-items-center"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* <FaTwitter className="me-2" style={{ color: '#1DA1F2', fontSize: '1.5rem' }} /> */}
            Twitter
          </a>
          <a
            href="https://linkedin.com"
            className="text-decoration-none d-flex align-items-center"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* <FaLinkedin className="me-2" style={{ color: '#0077B5', fontSize: '1.5rem' }} /> */}
            LinkedIn
          </a>
          <a
            href="https://github.com"
            className="text-decoration-none d-flex align-items-center"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* <FaGithub className="me-2" style={{ color: '#333', fontSize: '1.5rem' }} /> */}
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
