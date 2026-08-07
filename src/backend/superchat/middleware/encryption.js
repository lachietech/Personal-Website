import crypto from 'crypto';

const PRIVATE_KEY_PREFIX = 'aes256gcm:v1';

/**
 * Generate an RSA key pair (public/private).
 * Keys are encoded in DER format, then converted to Base64 strings.
 * @returns {Object} { publicKey, privateKey } as Base64 strings
 */
export function generateKeyPairRSA() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'der',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'der',
        },
    });

    return {
        publicKey: publicKey.toString('base64'),
        privateKey: privateKey.toString('base64')
    };
}

export function encryptPrivateKeyWithPassword(password, plaintext) {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(password, salt, 32);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    return [
        PRIVATE_KEY_PREFIX,
        salt.toString('base64'),
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted.toString('base64')
    ].join(':');
}

export function decryptPrivateKeyWithPassword(password, ciphertext) {
    if (!ciphertext.startsWith(`${PRIVATE_KEY_PREFIX}:`)) {
        return decryptLegacyPrivateKey(password, ciphertext);
    }

    const [, , salt, iv, authTag, encrypted] = ciphertext.split(':');
    const key = crypto.scryptSync(password, Buffer.from(salt, 'base64'), 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    return Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64')),
        decipher.final()
    ]).toString('utf8');
}

function decryptLegacyPrivateKey(key, ciphertext) {
    let plaintext = '';
    for (let i = 0; i < ciphertext.length; i++) {
        const C = ciphertext.charCodeAt(i);
        const k = key.charCodeAt(i % key.length);
        const P = (C - k + 256) % 256;
        plaintext += String.fromCharCode(P);
    }
    return plaintext;
}
