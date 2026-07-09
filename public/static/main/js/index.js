const navbar = document.querySelector('.navbar');

function getNavbarOffset() {
    return navbar ? navbar.offsetHeight + 16 : 96;
}

function syncNavbarOffsetVar() {
    document.documentElement.style.setProperty('--navbar-offset', `${getNavbarOffset()}px`);
}

// Smooth scrolling with fixed-navbar offset support.
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === '#') {
            return;
        }

        const target = document.querySelector(href);
        if (!target) {
            return;
        }

        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - getNavbarOffset();
        window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    });
});

syncNavbarOffsetVar();
window.addEventListener('resize', syncNavbarOffsetVar);
window.addEventListener('load', syncNavbarOffsetVar);

const navbarCollapse = document.getElementById('navbarNav');
if (navbarCollapse) {
    navbarCollapse.addEventListener('shown.bs.collapse', syncNavbarOffsetVar);
    navbarCollapse.addEventListener('hidden.bs.collapse', syncNavbarOffsetVar);
}

// Scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// Contact form handling
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
            .then((data) => data.csrfToken);
    }

    return csrfTokenPromise;
}

function showFormMessage(type, message) {
    formMessage.textContent = '';
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    formMessage.appendChild(alert);
}

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Disable button and show loader
    submitBtn.disabled = true;
    btnText.classList.add('d-none');
    btnLoader.classList.remove('d-none');
    formMessage.textContent = '';

    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        subject: document.getElementById('subject').value,
        message: document.getElementById('message').value
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

        if (data.success) {
            showFormMessage('success', data.message);
            contactForm.reset();
        } else {
            showFormMessage('danger', data.message);
        }
    } catch (error) {
        showFormMessage('danger', 'An error occurred. Please try again later.');
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        btnText.classList.remove('d-none');
        btnLoader.classList.add('d-none');
    }
});

// Navbar background on scroll
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(15, 23, 42, 1)';
    } else {
        navbar.style.background = 'rgba(15, 23, 42, 0.95)';
    }
});
