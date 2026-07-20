import React, { useState, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import { useTranslation } from 'react-i18next';
import "../styles/FAQ.css";
import AOS from 'aos';

const FAQ = () => {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    AOS.refresh();
  }, []);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
    // Refresh AOS animations when accordion toggles
    setTimeout(() => {
      AOS.refresh();
    }, 100);
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
    <section className="faq-container" data-aos="fade-up" data-aos-duration="800">
      <h2 data-aos="fade-down" data-aos-delay="200">{t('faq.title')}</h2>
      {faqEntries.map((item, idx) => (
        <div
          key={idx}
          className={`faq-item ${openIndex === idx ? "open" : ""}`}
          data-aos="fade-up"
          data-aos-delay={300 + (idx * 100)}
        >
          <button
            type="button"
            className="faq-question"
            onClick={() => toggle(idx)}
            aria-expanded={openIndex === idx}
            aria-controls={`faq-answer-${idx}`}
          >
            <h4>{item.question}</h4>
            <FaChevronDown
              className={`arrow ${openIndex === idx ? "rotate" : ""}`}
            />
          </button>
          <div id={`faq-answer-${idx}`} className={`faq-answer ${openIndex === idx ? "show" : ""}`}>
            <p>{item.answer}</p>
          </div>
        </div>
      ))}
    </section>
  );
};

export default FAQ;