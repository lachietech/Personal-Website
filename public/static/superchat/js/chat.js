// --------------------------- chat.js Functions -------------------------------
// Handles chat API calls, user list rendering, and browser-side encryption.

let sessionData = null;
let currentConversation = null;
let lastMessageTimestamp = 0;
let conversation = [];
let csrfTokenPromise;

const chatList = document.getElementById('chatList');
const search = document.querySelector('input[name="userSearch"]');
const messagesEl = document.getElementById('messages');
const composer = document.getElementById('composer');
const messageInp = document.getElementById('messageInput');
const activeName = document.getElementById('activeName');

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

async function apiFetch(url, options = {}) {
    const method = options.method || 'GET';
    const headers = new Headers(options.headers || {});

    if (method.toUpperCase() !== 'GET') {
        headers.set('x-csrf-token', await getCsrfToken());
    }

    const response = await fetch(url, {
        ...options,
        method,
        headers,
        credentials: 'same-origin'
    });

    if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
    }

    return response;
}

async function initialise() {
    try {
        sessionData = await apiFetch('api/session-data').then((response) => response.json());
        await loadUsers();
    } catch (error) {
        console.error('Error initialising chat:', error);
        messagesEl.textContent = 'Failed to initialise chat.';
    }
}

async function loadUsers() {
    const users = await apiFetch('api/users').then((response) => response.json());
    chatList.textContent = '';
    users.forEach((username) => {
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.id = username;
        div.textContent = username;
        chatList.appendChild(div);
    });
}

search.addEventListener('input', function () {
    const query = this.value.toLowerCase().trim();
    Array.from(chatList.children).forEach((chatItem) => {
        const name = (chatItem.id || '').toLowerCase();
        chatItem.style.display = name.includes(query) ? '' : 'none';
    });
});

chatList.addEventListener('click', (event) => {
    const row = event.target.closest('.chat-item');
    if (!row) return;
    setActive(row.id);
});

function setActive(name) {
    currentConversation = name;
    activeName.textContent = name;
    Array.from(chatList.children).forEach((chatItem) => {
        chatItem.classList.toggle('active', chatItem.id === name);
    });

    loadMessages(name, true);
}

messageInp.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});

messageInp.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        composer.requestSubmit();
    }
});

function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const output = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        output[i] = binary.charCodeAt(i);
    }
    return output;
}

function uint8ArrayToBase64(bytes) {
    let value = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        value += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(value);
}

async function importRsaPrivateKey(base64Pkcs8) {
    const der = base64ToUint8Array(base64Pkcs8).buffer;
    return window.crypto.subtle.importKey(
        'pkcs8',
        der,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['decrypt']
    );
}

async function importRsaPublicKey(base64Spki) {
    const clean = (base64Spki || '').replace(/[\r\n\s]/g, '');
    if (!clean) throw new Error('Public key is empty');
    const der = base64ToUint8Array(clean).buffer;
    return window.crypto.subtle.importKey(
        'spki',
        der,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
    );
}

let cachedPrivateKey = null;
let cachedPrivateKeyValue = null;
let cachedPublicKey = null;
let cachedPublicKeyValue = null;
const recipientPublicKeyCache = new Map();

async function getPrivateKeyCryptoKey() {
    const value = sessionData.privateKey;
    if (cachedPrivateKey && cachedPrivateKeyValue === value) return cachedPrivateKey;
    cachedPrivateKey = await importRsaPrivateKey(value);
    cachedPrivateKeyValue = value;
    return cachedPrivateKey;
}

async function getMyPublicKeyCryptoKey() {
    const value = sessionData.publicKey;
    if (cachedPublicKey && cachedPublicKeyValue === value) return cachedPublicKey;
    cachedPublicKey = await importRsaPublicKey(value);
    cachedPublicKeyValue = value;
    return cachedPublicKey;
}

async function getRecipientPublicKeyCryptoKey(username) {
    if (recipientPublicKeyCache.has(username)) {
        return recipientPublicKeyCache.get(username);
    }

    const base64Key = await apiFetch(`api/userkey?name=${encodeURIComponent(username)}`)
        .then((response) => response.text());
    const key = await importRsaPublicKey(base64Key);
    recipientPublicKeyCache.set(username, key);
    return key;
}

async function loadMessages(name, forceScroll = false) {
    try {
        const messages = await apiFetch(`api/messages?chat=${encodeURIComponent(name)}`)
            .then((response) => response.json());

        const myPrivateKey = await getPrivateKeyCryptoKey();
        const decryptedMessages = [];

        for (const msg of messages) {
            const { user, recipient, message, timestamp, iv, key1, key2 } = msg;
            const fromMe = user === sessionData.username;
            const toMe = recipient === sessionData.username;

            let encryptedAesKey;
            if (fromMe) encryptedAesKey = key1;
            else if (toMe) encryptedAesKey = key2;
            else continue;

            const rawAesKey = await window.crypto.subtle.decrypt(
                { name: 'RSA-OAEP' },
                myPrivateKey,
                base64ToUint8Array(encryptedAesKey).buffer
            );
            const aesKey = await window.crypto.subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, ['decrypt']);
            const decrypted = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: base64ToUint8Array(iv) },
                aesKey,
                base64ToUint8Array(message).buffer
            );

            decryptedMessages.push({
                from: user,
                text: new TextDecoder().decode(decrypted),
                timestamp
            });
        }

        const latestTimestamp = decryptedMessages.length
            ? new Date(decryptedMessages[decryptedMessages.length - 1].timestamp).getTime()
            : 0;
        const hasNew = latestTimestamp > lastMessageTimestamp;
        conversation = decryptedMessages;
        lastMessageTimestamp = latestTimestamp;

        messagesEl.textContent = '';
        for (const msg of conversation) {
            const div = document.createElement('div');
            div.className = msg.from === sessionData.username ? 'message-sent' : 'message-received';
            div.textContent = msg.text;
            messagesEl.appendChild(div);
        }

        if (forceScroll || hasNew) {
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }
    } catch (error) {
        console.error('Error fetching/decrypting messages:', error);
        messagesEl.textContent = 'Failed to load messages.';
    }
}

composer.addEventListener('submit', async (event) => {
    event.preventDefault();

    const text = messageInp.value.trim();
    if (!text || !currentConversation || !sessionData) return;

    const aesKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        new TextEncoder().encode(text)
    );

    const myPublicKey = await getMyPublicKeyCryptoKey();
    const recipientPublicKey = await getRecipientPublicKeyCryptoKey(currentConversation);
    const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
    const aesKeyForMe = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, myPublicKey, rawAesKey);
    const aesKeyForRecipient = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, recipientPublicKey, rawAesKey);

    await apiFetch('api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recipient: currentConversation,
            message: uint8ArrayToBase64(new Uint8Array(ciphertext)),
            timestamp: Date.now(),
            iv: uint8ArrayToBase64(iv),
            key1: uint8ArrayToBase64(new Uint8Array(aesKeyForMe)),
            key2: uint8ArrayToBase64(new Uint8Array(aesKeyForRecipient))
        })
    });

    messageInp.value = '';
    messageInp.style.height = 'auto';
    loadMessages(currentConversation, true);
});

setInterval(() => {
    if (currentConversation) loadMessages(currentConversation);
}, 1000);

initialise();
