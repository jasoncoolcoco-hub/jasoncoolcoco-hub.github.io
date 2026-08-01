import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

const contactOrder = ['EMAIL', 'PHONE', 'INSTAGRAM', 'LINKEDIN']

export default function HomeContactReveal({ contacts, reducedMotion }) {
  const [activeLabel, setActiveLabel] = useState(null)
  const visibleContacts = contactOrder
    .map((label) => contacts.find((contact) => contact.label === label))
    .filter(Boolean)

  return (
    <aside
      className="home-contact-reveal"
      aria-label="Contact information"
    >
      <ul className="home-contact-reveal__list">
        {visibleContacts.map((contact) => {
          const isActive = activeLabel === contact.label
          const valueId = `home-contact-${contact.label.toLowerCase()}`

          return (
            <li key={contact.label} className="home-contact-reveal__item">
              <button
                type="button"
                className="home-contact-reveal__trigger"
                aria-expanded={isActive}
                aria-controls={valueId}
                onClick={() =>
                  setActiveLabel((current) =>
                    current === contact.label ? null : contact.label,
                  )
                }
              >
                {contact.label}
              </button>

              <AnimatePresence initial={false}>
                {isActive && (
                  <motion.div
                    id={valueId}
                    className="home-contact-reveal__value"
                    initial={{ opacity: 0, height: 0, y: reducedMotion ? 0 : -3 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: reducedMotion ? 0 : -2 }}
                    transition={{
                      duration: reducedMotion ? 0.01 : 0.2,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    {contact.href ? (
                      <a
                        href={contact.href}
                        target={contact.external ? '_blank' : undefined}
                        rel={contact.external ? 'noreferrer' : undefined}
                      >
                        {contact.display}
                      </a>
                    ) : (
                      <span>{contact.display}</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
