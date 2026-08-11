import { useState } from "react";
import { sendContactMessage } from "../../api/siteApi.js";
import { Icon } from "../Icon.jsx";

function ContactDetails() {
  return (
    <div className="contact-copy">
      <p className="eyebrow">Let’s work together</p>
      <h2 className="section-heading">Have an idea worth building?</h2>
      <p>
        Tell me what you’re thinking. Whether it’s a clear brief or a rough
        concept, we can work out the next step together.
      </p>
      <div className="contact-meta">
        <div>
          <Icon name="bi-geo-alt" />
          <span>
            <small>Location</small>
            Brisbane, Australia
          </span>
        </div>
        <div>
          <Icon name="bi-clock" />
          <span>
            <small>Typical response</small>
            Within 24–48 hours
          </span>
        </div>
      </div>
    </div>
  );
}

export function Contact() {
  const [isSending, setIsSending] = useState(false);
  const [notice, setNotice] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSending(true);
    setNotice(null);

    const form = event.currentTarget;
    const message = Object.fromEntries(new FormData(form));

    try {
      const response = await sendContactMessage(message);
      setNotice({ type: "success", text: response.message });
      form.reset();
    } catch (error) {
      setNotice({
        type: "danger",
        text: error.message || "Unable to send your message.",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section id="contact" className="section contact-section">
      <div className="contact-orb" />
      <div className="container">
        <div className="row g-5">
          <div className="col-lg-5 fade-up">
            <ContactDetails />
          </div>
          <div className="col-lg-7 fade-up">
            <div className="contact-form">
              {notice && (
                <div
                  className={`alert alert-${notice.type}`}
                  role="status"
                  aria-live="polite"
                >
                  {notice.text}
                </div>
              )}
              <form onSubmit={handleSubmit} aria-busy={isSending}>
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="name">Your name</label>
                    <input
                      className="form-control"
                      id="name"
                      name="name"
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="email">Email address</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="subject">What can I help with?</label>
                  <input
                    className="form-control"
                    id="subject"
                    name="subject"
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="message">Tell me about the project</label>
                  <textarea
                    className="form-control"
                    id="message"
                    name="message"
                    rows="5"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSending}
                  className="btn btn-send"
                >
                  {isSending ? (
                    "Sending…"
                  ) : (
                    <>
                      Send enquiry <Icon name="bi-arrow-up-right" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
