import React, { useState, useEffect } from "react";
import "../styles/ContactUs.css";

const ContactUs = ({ user }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: user ? `${user.firstName} ${user.lastName}` : "",
    email: user ? user.email : "",
    subject: "",
    message: "",
  });
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY,
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          from_name: formData.name,
          replyto: formData.email,
        }),
      });

      if (response.ok) {
        setShowSuccess(true);
        setFormData((prev) => ({
          ...prev,
          subject: "",
          message: "",
        }));
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setShowSuccess(false);
    setFormData((prev) => ({
      ...prev,
      subject: "",
      message: "",
    }));
  };

  return (
    <div className={`contact-page ${darkMode ? "dark" : ""}`}>
      <div className="contact-container">
        <div className="contact-form-wrapper">
          {showSuccess ? (
            <div className="success-container">
              <div className="success-icon">✅</div>
              <h2>Message Sent Successfully!</h2>
              <p>
                Thank you for contacting us. We've received your message and
                will get back to you via email soon.
              </p>
              <div className="success-actions">
                <button onClick={handleReset} className="btn-send-another">
                  Send Another Message
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="contact-header">
                <h2>Contact Us</h2>
                <p>
                  Have questions or feedback? We'd love to hear from you!
                </p>
              </div>

              <div className="form-notice">
                <p>
                  <strong>✅ Working Email Service:</strong> Your message will
                  be sent directly to our team via email.
                </p>
              </div>

              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    readOnly={!!user}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    readOnly={!!user}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows="5"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactUs;