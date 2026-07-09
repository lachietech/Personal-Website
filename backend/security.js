const TEXT_LIMIT = 500;
const NAME_LIMIT = 80;
const MESSAGE_LIMIT = 4000;

export class InputError extends Error {}

export function getRequiredString(value, fieldName, maxLength = TEXT_LIMIT) {
    if (typeof value !== 'string') {
        throw new InputError(`${fieldName} is required`);
    }

    const trimmed = value.trim();
    if (!trimmed) {
        throw new InputError(`${fieldName} is required`);
    }

    if (trimmed.length > maxLength) {
        throw new InputError(`${fieldName} is too long`);
    }

    return trimmed;
}

export function getOptionalString(value, maxLength = TEXT_LIMIT) {
    if (value === undefined || value === null) {
        return '';
    }

    if (typeof value !== 'string') {
        throw new InputError('Invalid text value');
    }

    return value.trim().slice(0, maxLength);
}

export function getUsername(value) {
    const username = getRequiredString(value, 'Username', NAME_LIMIT);
    if (!/^[A-Za-z0-9._@ -]+$/.test(username)) {
        throw new InputError('Username contains unsupported characters');
    }

    return username;
}

export function getPassword(value) {
    if (typeof value !== 'string' || value.length < 6 || value.length > 256) {
        throw new InputError('Password must be between 6 and 256 characters');
    }

    return value;
}

export function getEmail(value) {
    const email = getRequiredString(value, 'Email', 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new InputError('Invalid email address');
    }

    return email;
}

export function getMessage(value) {
    return getRequiredString(value, 'Message', MESSAGE_LIMIT);
}

export function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

export function regenerateSession(req, values) {
    return new Promise((resolve, reject) => {
        req.session.regenerate((regenerateError) => {
            if (regenerateError) {
                reject(regenerateError);
                return;
            }

            Object.assign(req.session, values);
            req.session.save((saveError) => {
                if (saveError) {
                    reject(saveError);
                    return;
                }

                resolve();
            });
        });
    });
}
