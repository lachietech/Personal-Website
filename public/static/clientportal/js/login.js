const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    Portal.setMessage(loginMessage, 'Signing in...');

    try {
        const data = await Portal.request('/clientportal/api/auth/login', {
            method: 'POST',
            body: {
                username: document.getElementById('username').value,
                password: document.getElementById('password').value
            }
        });
        window.location.assign(data.redirectTo || '/clientportal');
    } catch (error) {
        Portal.setMessage(loginMessage, error.message, 'error');
    }
});
