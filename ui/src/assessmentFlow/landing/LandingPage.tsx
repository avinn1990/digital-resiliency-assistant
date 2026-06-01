import { useState } from "react";
import type { AuthUser } from "../../auth/types";
import { LANDING } from "./content";
import { LandingAuthCard } from "./LandingAuthCard";
import {
  IconBotanical,
  IconChevronLeft,
  IconChevronRight,
  LandingIcon,
} from "./LandingIcons";
import { LandingWave, LandingWaveToTeal } from "./LandingWave";

type Props = {
  onSignedIn: (token: string, user: AuthUser) => void;
};

const INTRO_IMAGE =
  "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=80";
const ARCH_IMAGE =
  "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80";

export function LandingPage({ onSignedIn }: Props) {
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const testimonials = LANDING.testimonials.items;
  const visibleCount = 3;

  function prevTestimonial() {
    setTestimonialIndex((i) => (i - 1 + testimonials.length) % testimonials.length);
  }

  function nextTestimonial() {
    setTestimonialIndex((i) => (i + 1) % testimonials.length);
  }

  function visibleTestimonials() {
    const items = [];
    for (let offset = 0; offset < visibleCount; offset += 1) {
      items.push(testimonials[(testimonialIndex + offset) % testimonials.length]);
    }
    return items;
  }

  const year = new Date().getFullYear();

  return (
    <div className="landing">
      <header className="landing-hero landing-section--teal">
        <div className="landing-hero__header">
          <div className="landing-brand">
            <div className="landing-brand__mark" aria-hidden="true" />
            <div className="landing-brand__name">
              Digital Resiliency
              <span>Assessment</span>
            </div>
          </div>
          <p className="landing-hero__tagline">{LANDING.tagline}</p>
        </div>

        <div className="landing-hero__grid">
          <div className="landing-hero__copy">
            <h1>{LANDING.hero.headline}</h1>
            <p>{LANDING.hero.subhead}</p>
            <ul className="landing-values">
              {LANDING.hero.values.map((item) => (
                <li key={item.title}>
                  <LandingIcon name={item.icon} className="landing-values__icon" />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <LandingAuthCard onSignedIn={onSignedIn} />
        </div>

        <div className="landing-hero__footer">
          <LandingWave fill="var(--landing-cream)" />
          <div className="landing-seal">Assess with intention</div>
        </div>
      </header>

      <section className="landing-intro landing-section--cream" aria-labelledby="landing-intro-heading">
        <div className="landing-intro__grid">
          <div>
            <h2 id="landing-intro-heading">{LANDING.intro.headline}</h2>
            <p className="landing-intro__body">{LANDING.intro.body}</p>
            <blockquote className="landing-quote">
              <IconBotanical className="landing-quote__icon" />
              <p>{LANDING.intro.quote}</p>
              <cite>{LANDING.intro.quoteAttribution}</cite>
            </blockquote>
          </div>
          <div className="landing-intro__media">
            <img src={INTRO_IMAGE} alt="Calm workspace with natural light and soft furnishings" loading="lazy" />
          </div>
        </div>
      </section>

      <section className="landing-credentials landing-section--cream" aria-labelledby="landing-credentials-heading">
        <h2 id="landing-credentials-heading">{LANDING.credentials.headline}</h2>
        <div className="landing-credentials__grid">
          {LANDING.credentials.items.map((item) => (
            <article key={item.title} className="landing-credentials__item">
              <LandingIcon name={item.icon} className="landing-values__icon" />
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <LandingWaveToTeal />

      <section className="landing-testimonials landing-section--teal" aria-labelledby="landing-testimonials-heading">
        <div className="landing-testimonials__head">
          <h2 id="landing-testimonials-heading">{LANDING.testimonials.headline}</h2>
          <button type="button" className="landing-btn landing-btn--outline-cream">
            {LANDING.testimonials.cta}
          </button>
        </div>

        <div className="landing-carousel">
          <button
            type="button"
            className="landing-carousel__nav"
            onClick={prevTestimonial}
            aria-label="Previous testimonial"
          >
            <IconChevronLeft />
          </button>
          <div className="landing-carousel__track">
            {visibleTestimonials().map((item) => (
              <article key={item.name + item.quote.slice(0, 24)} className="landing-testimonial-card">
                <div className="landing-testimonial-card__photo">
                  <img src={item.image} alt="" loading="lazy" />
                </div>
                <div className="landing-testimonial-card__body">
                  <p>{item.quote}</p>
                  <span>{item.name}</span>
                </div>
              </article>
            ))}
          </div>
          <button
            type="button"
            className="landing-carousel__nav"
            onClick={nextTestimonial}
            aria-label="Next testimonial"
          >
            <IconChevronRight />
          </button>
        </div>
      </section>

      <section className="landing-process landing-section--cream" aria-labelledby="landing-process-heading">
        <h2 id="landing-process-heading">{LANDING.process.headline}</h2>
        <div className="landing-process__grid">
          <ol className="landing-steps">
            {LANDING.process.steps.map((step, index) => (
              <li key={step.title}>
                <span className="landing-steps__num" aria-hidden>
                  {index + 1}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="landing-arch">
            <img src={ARCH_IMAGE} alt="Sunlit forest path suggesting a steady journey forward" loading="lazy" />
          </div>

          <div className="landing-chat-mock" aria-hidden>
            <h3>{LANDING.process.chat.title}</h3>
            <div className="landing-chat-mock__messages">
              {LANDING.process.chat.messages.map((msg) => (
                <div
                  key={msg.text}
                  className={
                    msg.from === "bot"
                      ? "landing-chat-bubble landing-chat-bubble--bot"
                      : "landing-chat-bubble landing-chat-bubble--user"
                  }
                >
                  {msg.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer landing-section--teal">
        <div className="landing-footer__grid">
          <div className="landing-footer__brand">
            <div className="landing-brand">
              <div className="landing-brand__mark" aria-hidden="true">
                <img src="/site-icon.svg" alt="" />
              </div>
              <div className="landing-brand__name">{LANDING.brand}</div>
            </div>
            <p>{LANDING.footer.mission}</p>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              {LANDING.footer.company.map((link) => (
                <li key={link}>
                  <a href="#">{link}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Support</h4>
            <ul>
              {LANDING.footer.support.map((link) => (
                <li key={link}>
                  <a href="#">{link}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="landing-footer__quote">{LANDING.footer.quote}</p>
          </div>
        </div>
        <p className="landing-footer__copy">&copy; {year} Digital Resiliency Assessment. All rights reserved.</p>
      </footer>
    </div>
  );
}
