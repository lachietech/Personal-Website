(async () => {
    const forms = document.querySelectorAll('form[method="POST"], form[method="post"]');
    if (!forms.length) {
        return;
    }

    try {
        const response = await fetch('/csrf-token', { credentials: 'same-origin' });
        if (!response.ok) {
            throw new Error('Unable to fetch CSRF token');
        }

        const { csrfToken } = await response.json();
        forms.forEach((form) => {
            let input = form.querySelector('input[name="_csrf"]');
            if (!input) {
                input = document.createElement('input');
                input.type = 'hidden';
                input.name = '_csrf';
                form.appendChild(input);
            }
            input.value = csrfToken;
        });
    } catch (error) {
        console.error('CSRF setup failed:', error);
    }
})();
