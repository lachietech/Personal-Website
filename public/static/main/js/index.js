const navbar = document.querySelector('.navbar');
const navbarCollapse = document.getElementById('navbarNav');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function getNavbarOffset() {
    return navbar ? navbar.offsetHeight + 12 : 86;
}

function syncNavbarOffsetVar() {
    document.documentElement.style.setProperty('--navbar-offset', `${getNavbarOffset()}px`);
}

function updateNavbar() {
    if (!navbar) {
        return;
    }

    navbar.classList.toggle('scrolled', window.scrollY > 24);
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (event) {
        const href = this.getAttribute('href');
        if (!href || href === '#') {
            return;
        }

        const target = document.querySelector(href);
        if (!target) {
            return;
        }

        event.preventDefault();
        const targetTop = target.getBoundingClientRect().top + window.scrollY - getNavbarOffset();
        window.scrollTo({
            top: Math.max(targetTop, 0),
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });

        if (navbarCollapse?.classList.contains('show') && window.bootstrap?.Collapse) {
            window.bootstrap.Collapse.getOrCreateInstance(navbarCollapse).hide();
        }
    });
});

syncNavbarOffsetVar();
updateNavbar();

window.addEventListener('resize', syncNavbarOffsetVar, { passive: true });
window.addEventListener('load', syncNavbarOffsetVar);
window.addEventListener('scroll', updateNavbar, { passive: true });

if (navbarCollapse) {
    navbarCollapse.addEventListener('shown.bs.collapse', syncNavbarOffsetVar);
    navbarCollapse.addEventListener('hidden.bs.collapse', syncNavbarOffsetVar);
}

// Reveal content progressively as it enters the viewport.
const revealElements = document.querySelectorAll('.fade-up');
revealElements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
});

if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealElements.forEach((element) => element.classList.add('visible'));
} else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -45px 0px'
    });

    revealElements.forEach((element) => revealObserver.observe(element));
}

// Keep the active navigation link aligned with the section in view.
const sectionLinks = new Map(
    Array.from(document.querySelectorAll('.navbar .nav-link[href^="#"]'))
        .map((link) => [link.getAttribute('href').slice(1), link])
);
const observedSections = Array.from(document.querySelectorAll('main section[id]'))
    .filter((section) => sectionLinks.has(section.id));

if ('IntersectionObserver' in window && observedSections.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
        const visibleSection = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visibleSection) {
            return;
        }

        sectionLinks.forEach((link, id) => {
            link.classList.toggle('active', id === visibleSection.target.id);
        });
    }, {
        rootMargin: '-24% 0px -58% 0px',
        threshold: [0, 0.1, 0.25]
    });

    observedSections.forEach((section) => sectionObserver.observe(section));
}

const currentYear = document.getElementById('currentYear');
if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}

// Contact form handling.
const contactForm = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
let csrfTokenPromise;

function getCsrfToken() {
    if (!csrfTokenPromise) {
        csrfTokenPromise = fetch('/csrf-token', { credentials: 'same-origin' })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Unable to fetch CSRF token');
                }
                return response.json();
            })
            .then((data) => data.csrfToken)
            .catch((error) => {
                csrfTokenPromise = undefined;
                throw error;
            });
    }

    return csrfTokenPromise;
}

function showFormMessage(type, message) {
    if (!formMessage) {
        return;
    }

    formMessage.textContent = '';
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    formMessage.appendChild(alert);
}

if (contactForm && submitBtn && btnText && btnLoader) {
    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        submitBtn.disabled = true;
        btnText.classList.add('d-none');
        btnLoader.classList.remove('d-none');
        if (formMessage) {
            formMessage.textContent = '';
        }

        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            subject: document.getElementById('subject').value.trim(),
            message: document.getElementById('message').value.trim()
        };

        try {
            const csrfToken = await getCsrfToken();
            const response = await fetch('/contact', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to send your message.');
            }

            showFormMessage('success', data.message || 'Thanks — your message has been sent.');
            contactForm.reset();
        } catch (error) {
            showFormMessage('danger', error.message || 'Something went wrong. Please try again later.');
        } finally {
            submitBtn.disabled = false;
            btnText.classList.remove('d-none');
            btnLoader.classList.add('d-none');
        }
    });
}
