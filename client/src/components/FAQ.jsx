import React, { useState } from "react";
import "../styles/FAQ.css";

const faqEntries = [
  {
    question: "How does the AI analyze my medical report?",
    answer:
      "The AI processes your uploaded medical report to extract key data and summarize findings in easy-to-understand language."
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes, all uploads are encrypted during transfer and not stored on our server. Your privacy is our top priority."
  },
  {
    question: "What file formats are supported?",
    answer:
      "You can upload PDF, JPEG, or PNG files up to 10 MB in size."
  },
  {
    question: "How long does analysis take?",
    answer:
      "Typically under 15 seconds, depending on report size."
  },
  {
    question: "Is a doctor’s consultation included?",
    answer:
      "No. The tool provides AI-powered summaries only; for any medical advice, consult a professional."
  }
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) =>
    setOpenIndex(openIndex === index ? null : index);

  return (
    <section className="faq-container">
      <h2><center>Frequently Asked Questions</center></h2>
      {faqEntries.map((item, idx) => (
        <div
          key={idx}
          className={`faq-item ${openIndex === idx ? "open" : ""}`}
          onClick={() => toggle(idx)}
        >
          <h4>{item.question}</h4>
          {openIndex === idx && <p>{item.answer}</p>}
        </div>
      ))}
    </section>
  );
};

export default FAQ;
