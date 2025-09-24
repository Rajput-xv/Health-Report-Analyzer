import React, { useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { useTranslation } from 'react-i18next';
import "../styles/FAQ.css";

const FAQ = () => {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqEntries = [
    {
      question: t('faq.q1'),
      answer: t('faq.a1')
    },
    {
      question: t('faq.q2'),
      answer: t('faq.a2')
    },
    {
      question: t('faq.q3'),
      answer: t('faq.a3')
    },
    {
      question: t('faq.q4'),
      answer: t('faq.a4')
    },
    {
      question: t('faq.q5'),
      answer: t('faq.a5')
    }
  ];

  return (
    <section className="faq-container">
      <h2>{t('faq.title')}</h2>
      {faqEntries.map((item, idx) => (
        <div
          key={idx}
          className={`faq-item ${openIndex === idx ? "open" : ""}`}
        >
          <div
            className="faq-question"
            onClick={() => toggle(idx)}
          >
            <h4>{item.question}</h4>
            <FaChevronDown
              className={`arrow ${openIndex === idx ? "rotate" : ""}`}
            />
          </div>
          <div className={`faq-answer ${openIndex === idx ? "show" : ""}`}>
            <p>{item.answer}</p>
          </div>
        </div>
      ))}
    </section>
  );
};

export default FAQ;