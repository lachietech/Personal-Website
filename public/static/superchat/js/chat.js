// --------------------------- chat.js Functions -------------------------------
// -- This file contains the JavaScript logic for the chat application page.  --
// -- It handles fetching data from api's, loading and sending messages, and  --
// -- performing client-side encryption/decryption using the Web Crypto API.  --

// ----------------------------- initialisation --------------------------------
fetch('api/session-data')
    .then(r => r.json())
    .then(data => {
    sessionStorage.setItem('username', data.username);
    sessionStorage.setItem('privateKey', data.privateKey); // ⚠ sensitive
    sessionStorage.setItem('publicKey', data.publicKey);
    })
    .catch(err => console.error('Error fetching session data:', err));

let user = sessionStorage.getItem('username') || 'user';
let currentConversation = null;
let lastMessageTimestamp = 0;
let conversation = [];

const chatList   = document.getElementById('chatList');
const search     = document.querySelector('input[name="userSearch"]');
const messagesEl = document.getElementById('messages');
const composer   = document.getElementById('composer');
const messageInp = document.getElementById('messageInput');
const activeName = document.getElementById('activeName');

// ------------------------------ UI/UX helpers --------------------------------

fetch('api/users')
    .then(r => r.json())
    .then(users => {
    users.forEach(u => {
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.id = u;
        div.textContent = u;
        chatList.appendChild(div);
    });
    })
    .catch(err => console.error('Error fetching users:', err));

search.addEventListener('input', function () {
    const q = this.value.toLowerCase().trim();
    Array.from(chatList.children).forEach(ci => {
    const name = (ci.id || '').toLowerCase();
    ci.style.display = name.includes(q) ? '' : 'none';
    });
});

chatList.addEventListener('click', (e) => {
    const row = e.target.closest('.chat-item');
    if (!row) return;
    setActive(row.id);
});

function setActive(name) {
    currentConversation = name;
    activeName.textContent = name;
    Array.from(chatList.children).forEach(ci =>
    ci.classList.toggle('active', ci.id === name)
    );

    loadMessages(name, true);
}

messageInp.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});

messageInp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    composer.requestSubmit();
    }
});



// ---------------------------- Helper functions -------------------------------
// --- These functions are for the frontend cryptography and are used in the ---
// -- chat application. They handle key import, caching, and Base64 encoding. --

// -------- Base64 <-> Uint8Array helpers (safe for large buffers) -------------
function base64ToUint8Array(b64) {
    const bin = atob(b64);
    const len = bin.length;
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
    return out;
}
function uint8ArrayToBase64(u8) {
    // Chunked to avoid call stack issues with very large arrays
    let s = '';
    const CHUNK = 0x8000; // 32KB
    for (let i = 0; i < u8.length; i += CHUNK) {
    s += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
    }
    return btoa(s);
}

// ----------------------- CryptoKey import utilities --------------------------
async function importRsaPrivateKey(base64Pkcs8) {
    const der = base64ToUint8Array(base64Pkcs8).buffer;
    return await window.crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
    );
}
async function importRsaPublicKey(base64Spki) {
    const clean = (base64Spki || '').replace(/[\r\n\s]/g, '');
    if (!clean) throw new Error('Public key is empty!');
    const der = base64ToUint8Array(clean).buffer;
    return await window.crypto.subtle.importKey(
    'spki',
    der,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
    );
}

// ------------------------------ CryptoKey cache ------------------------------
let _cachedPrivateKey = null;
let _cachedPrivateKeyB64 = null;

let _cachedMyPublicKey = null;
let _cachedMyPublicKeyB64 = null;

// Cache of recipient username -> CryptoKey
const _recipientPubKeyCache = new Map();

async function getPrivateKeyCryptoKey() {
    const b64 = sessionStorage.getItem('privateKey');
    if (_cachedPrivateKey && _cachedPrivateKeyB64 === b64) return _cachedPrivateKey;
    const key = await importRsaPrivateKey(b64);
    _cachedPrivateKey = key;
    _cachedPrivateKeyB64 = b64;
    return key;
}

async function getMyPublicKeyCryptoKey() {
    const b64 = sessionStorage.getItem('publicKey');
    if (_cachedMyPublicKey && _cachedMyPublicKeyB64 === b64) return _cachedMyPublicKey;
    const key = await importRsaPublicKey(b64);
    _cachedMyPublicKey = key;
    _cachedMyPublicKeyB64 = b64;
    return key;
}

async function getRecipientPublicKeyCryptoKey(username) {
    if (_recipientPubKeyCache.has(username)) return _recipientPubKeyCache.get(username);
    const b64 = await fetch(`api/userkey?name=${encodeURIComponent(username)}`).then(r => r.text());
    const key = await importRsaPublicKey(b64);
    _recipientPubKeyCache.set(username, key);
    return key;
}





// ------------------------------- Load messages -------------------------------
// --- This is the function that decrypts and displays messages from the db. ---

async function loadMessages(name, forceScroll = false) {
    try {
    const messages = await fetch('api/messages?chat=' + encodeURIComponent(name)).then(r => r.json());

    // Import RSA private key once per load (then reused for every message).
    const myPrivateKey = await getPrivateKeyCryptoKey();

    const decryptedMessages = [];
    for (const msg of messages) {
        const { user, recipient, message, timestamp, iv, key1, key2 } = msg;

        const me = sessionStorage.getItem('username');
        const fromMe = user === me;
        const toMe   = recipient === me;

        let aesKeyEncryptedB64;
        if (fromMe) aesKeyEncryptedB64 = key1;
        else if (toMe) aesKeyEncryptedB64 = key2;
        else continue; // not part of our conversation (defensive)

        // Decode wire fields
        const encAesKey = base64ToUint8Array(aesKeyEncryptedB64).buffer;
        const ivBuf     = base64ToUint8Array(iv);                 // 12 bytes for GCM
        const ctBuf     = base64ToUint8Array(message).buffer;

        // Unwrap AES key with our RSA private key
        const rawAesKey = await window.crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        myPrivateKey,
        encAesKey
        );

        // Import AES key and decrypt payload
        const aesKey = await window.crypto.subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, ['decrypt']);
        const decryptedBuf = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuf }, aesKey, ctBuf);

        const text = new TextDecoder().decode(decryptedBuf);
        decryptedMessages.push({ from: user, text, timestamp });
    }

    // Normalize timestamp to number for comparison
    const latestTimestamp = decryptedMessages.length
        ? (typeof decryptedMessages[decryptedMessages.length - 1].timestamp === 'number'
            ? decryptedMessages[decryptedMessages.length - 1].timestamp
            : new Date(decryptedMessages[decryptedMessages.length - 1].timestamp).getTime())
        : 0;

    const hasNew = latestTimestamp > lastMessageTimestamp;
    conversation = decryptedMessages;
    lastMessageTimestamp = latestTimestamp;

    // Render
    messagesEl.innerHTML = '';
    const me = sessionStorage.getItem('username');
    for (const msg of decryptedMessages) {
        const div = document.createElement('div');
        div.className = msg.from === me ? 'message-sent' : 'message-received';
        div.textContent = msg.text;
        messagesEl.appendChild(div);
    }

    if (forceScroll || hasNew) messagesEl.scrollTop = messagesEl.scrollHeight;
    } catch (err) {
    console.error('Error fetching/decrypting messages:', err);
    messagesEl.innerHTML = 'Failed to load messages.';
    }
}





// ------------------------------- send messages -------------------------------
// ----- This is the function that encrypts and sends messages to the db.  -----

composer.addEventListener('submit', async (e) => {
    e.preventDefault();

    const text = messageInp.value.trim();
    if (!text || !currentConversation) return;

    // Generate per-message AES-GCM key
    const aesKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
    );

    // Encrypt plaintext
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(text)
    );

    // Import our public key and the recipient’s (from cache/remote)
    const myPubKey        = await getMyPublicKeyCryptoKey();
    const recipPubKey     = await getRecipientPublicKeyCryptoKey(currentConversation);

    // Export raw AES key to wrap
    const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);

    // Wrap AES key for both parties with RSA-OAEP
    const aesKeyForMe        = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, myPubKey,    rawAesKey);
    const aesKeyForRecipient = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, recipPubKey, rawAesKey);

    // Build payload using safe Base64 helpers
    const payload = {
    user: sessionStorage.getItem('username'),
    recipient: currentConversation,
    message:  uint8ArrayToBase64(new Uint8Array(ciphertext)),
    timestamp: Date.now(),
    iv:       uint8ArrayToBase64(iv),
    key1:     uint8ArrayToBase64(new Uint8Array(aesKeyForMe)),
    key2:     uint8ArrayToBase64(new Uint8Array(aesKeyForRecipient))
    };

    // Send to server
    await fetch('api/send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
    });

    // UI tidy + refresh
    messageInp.value = '';
    messageInp.style.height = 'auto';
    loadMessages(currentConversation, true);
});




// ------------------------------ Poll for updates -----------------------------
setInterval(() => {
    if (currentConversation) loadMessages(currentConversation);
}, 500);