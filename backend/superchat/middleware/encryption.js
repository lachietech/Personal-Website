import crypto from "crypto";

/**
 * Generate an RSA key pair (public/private).
 * Keys are encoded in DER format, then converted to Base64 strings.
 * @returns {Object} { publicKey, privateKey } as Base64 strings
 */
export function generateKeyPairRSA() {
    // Generate RSA key pair with 2048-bit modulus length
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048, // key size in bits (2048 is secure & common)
        publicKeyEncoding: {
            type: 'spki',     // standard format for public keys
            format: 'der',    // binary DER encoding
        },
        privateKeyEncoding: {
            type: 'pkcs8',    // standard format for private keys
            format: 'der',    // binary DER encoding
        },
    });

    // Convert binary keys into Base64 strings for easier storage/transmission
    const cleankey1 = publicKey.toString('base64');
    const cleankey2 = privateKey.toString('base64');

    return { publicKey: cleankey1, privateKey: cleankey2 };
}

/**
 * Encrypt plaintext using the Vigenère cipher.
 * Operates on raw character codes with simple modular addition.
 * @param {string} key - The key string used for encryption
 * @param {string} plaintext - The input text to encrypt
 * @returns {string} The encrypted ciphertext
 */
export function vigenereEncrypt(key, plaintext) {
    let ciphertext = '';
    for (let i = 0; i < plaintext.length; i++) {
        const P = plaintext.charCodeAt(i);         // numeric value of plaintext char
        const k = key.charCodeAt(i % key.length); // repeat key cyclically
        const C = (P + k) % 256;                  // modular addition (byte range)
        ciphertext += String.fromCharCode(C);     // convert back to char
    }
    return ciphertext;
}

/**
 * Decrypt ciphertext encrypted with the Vigenère cipher.
 * Reverses the encryption step by modular subtraction.
 * @param {string} key - The key string used for decryption
 * @param {string} ciphertext - The encrypted input text
 * @returns {string} The decrypted plaintext
 */
export function vigenereDecrypt(key, ciphertext) {
    let plaintext = '';
    for (let i = 0; i < ciphertext.length; i++) {
        const C = ciphertext.charCodeAt(i);        // numeric value of ciphertext char
        const k = key.charCodeAt(i % key.length);  // repeat key cyclically
        const P = (C - k + 256) % 256;             // modular subtraction; +256 avoids negatives
        plaintext += String.fromCharCode(P);       // convert back to char
    }
    return plaintext;
}