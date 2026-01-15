/**
 * Proposal Crypto - HMAC-based authentication and AES encryption
 *
 * Authentication flow:
 * 1. User enters symmetric key
 * 2. localStoredKey = HMAC(symmetricKey, SALT)
 * 3. Verify: HMAC(localStoredKey, SALT) === ACCESS_HMAC
 * 4. encryptionKey = derived from localStoredKey for AES encryption
 */

const ProposalCrypto = {
  SALT: 'mirigi is the best smartbuilding solution',
  STORAGE_KEY: 'mirigi_auth_key',

  // Pre-calculated ACCESS_HMAC = HMAC(HMAC(symmetricKey, SALT), SALT)
  // The symmetric key is NEVER stored - only the user knows it
  ACCESS_HMAC: 'c5a1de2293c3aed54d86479d5e8df92a685a97aadcde11563491a7fc8d17af5c',

  // UI elements (created dynamically)
  loginOverlay: null,
  logoutBtn: null,

  // Translations (set by page)
  translations: {
    login_title: 'Access Required',
    login_subtitle: 'Enter your access key to continue',
    login_placeholder: 'Access key',
    login_button: 'Login',
    login_error: 'Invalid access key',
    logout: 'Logout'
  },

  /**
   * Convert string to ArrayBuffer
   */
  stringToBuffer(str) {
    return new TextEncoder().encode(str);
  },

  /**
   * Convert ArrayBuffer to hex string
   */
  bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  /**
   * Convert hex string to ArrayBuffer
   */
  hexToBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes.buffer;
  },

  /**
   * Calculate HMAC-SHA256
   */
  async hmac(message, salt = this.SALT) {
    const keyData = this.stringToBuffer(salt);
    const messageData = this.stringToBuffer(message);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    return this.bufferToHex(signature);
  },

  /**
   * Generate localStoredKey from user's symmetric key
   */
  async generateLocalStoredKey(symmetricKey) {
    return await this.hmac(symmetricKey, this.SALT);
  },

  /**
   * Generate access hash from localStoredKey (for verification)
   */
  async generateAccessHash(localStoredKey) {
    return await this.hmac(localStoredKey, this.SALT);
  },

  /**
   * Verify if the stored key is valid
   */
  async verifyAccess(localStoredKey) {
    const accessHash = await this.generateAccessHash(localStoredKey);
    return accessHash === this.ACCESS_HMAC;
  },

  /**
   * Login with symmetric key
   * Returns true if key is valid
   */
  async login(symmetricKey) {
    const localStoredKey = await this.generateLocalStoredKey(symmetricKey);
    const isValid = await this.verifyAccess(localStoredKey);

    if (isValid) {
      localStorage.setItem(this.STORAGE_KEY, localStoredKey);
      return true;
    }
    return false;
  },

  /**
   * Logout - remove stored key
   */
  logout() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.showLoginUI();
  },

  /**
   * Check if user is logged in with valid key
   */
  async isLoggedIn() {
    const localStoredKey = localStorage.getItem(this.STORAGE_KEY);
    if (!localStoredKey) {
      return false;
    }
    return await this.verifyAccess(localStoredKey);
  },

  /**
   * Get encryption key derived from localStoredKey
   */
  async getEncryptionKey() {
    const localStoredKey = localStorage.getItem(this.STORAGE_KEY);
    if (!localStoredKey) {
      throw new Error('Not logged in');
    }

    // Derive encryption key from localStoredKey
    const encKeyHex = await this.hmac(localStoredKey, 'encrypt');

    // Import as AES-GCM key (use first 256 bits / 32 bytes)
    const keyData = this.hexToBuffer(encKeyHex);
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  },

  /**
   * Encrypt data using AES-GCM
   */
  async encrypt(plaintext) {
    const key = await this.getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    const data = this.stringToBuffer(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );

    // Combine IV + ciphertext and encode as base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
  },

  /**
   * Decrypt data using AES-GCM
   */
  async decrypt(encryptedBase64) {
    const key = await this.getEncryptionKey();

    // Decode base64 to bytes
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

    // Extract IV (first 12 bytes) and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  },

  /**
   * Encrypt proposal data for URL
   */
  async encryptProposalData(proposalData) {
    const json = JSON.stringify(proposalData);
    return await this.encrypt(json);
  },

  /**
   * Decrypt proposal data from URL
   */
  async decryptProposalData(encryptedData) {
    const json = await this.decrypt(encryptedData);
    return JSON.parse(json);
  },

  /**
   * Set translations for UI
   */
  setTranslations(translations) {
    this.translations = { ...this.translations, ...translations };
  },

  /**
   * Inject CSS styles for login UI
   */
  injectStyles() {
    if (document.getElementById('proposal-crypto-styles')) return;

    const style = document.createElement('style');
    style.id = 'proposal-crypto-styles';
    style.textContent = `
      .crypto-login-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
      }
      .crypto-login-overlay.hidden {
        display: none;
      }
      .crypto-login-modal {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        max-width: 400px;
        width: 90%;
        text-align: center;
      }
      .crypto-login-modal img {
        max-width: 150px;
        margin-bottom: 1.5rem;
      }
      .crypto-login-modal h2 {
        font-family: 'Montserrat', sans-serif;
        color: #2C2C2C;
        margin-bottom: 0.5rem;
        font-size: 1.5rem;
      }
      .crypto-login-modal p {
        color: #4A5568;
        margin-bottom: 1.5rem;
      }
      .crypto-login-modal input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
        margin-bottom: 1rem;
        box-sizing: border-box;
      }
      .crypto-login-modal input:focus {
        outline: none;
        border-color: #C9A86A;
      }
      .crypto-login-error {
        color: #dc3545;
        font-size: 0.9rem;
        margin-bottom: 1rem;
        display: none;
      }
      .crypto-login-error.show {
        display: block;
      }
      .crypto-btn-login {
        width: 100%;
        padding: 0.75rem;
        background: #C9A86A;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      .crypto-btn-login:hover {
        background: #b8975c;
      }
      .crypto-btn-login:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      .crypto-logout-btn {
        position: fixed;
        top: 1rem;
        right: 1rem;
        padding: 0.5rem 1rem;
        background: transparent;
        border: 1px solid #4A5568;
        color: #4A5568;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.2s;
        z-index: 100;
      }
      .crypto-logout-btn:hover {
        background: #4A5568;
        color: white;
      }
      .crypto-logout-btn i {
        margin-right: 0.5rem;
      }
      .crypto-locked {
        filter: blur(5px);
        pointer-events: none;
        user-select: none;
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * Create login overlay UI
   */
  createLoginUI(logoUrl) {
    this.injectStyles();

    // Create overlay
    this.loginOverlay = document.createElement('div');
    this.loginOverlay.className = 'crypto-login-overlay hidden';
    this.loginOverlay.innerHTML = `
      <div class="crypto-login-modal">
        <img src="${logoUrl}" alt="Mirigi">
        <h2>${this.translations.login_title}</h2>
        <p>${this.translations.login_subtitle}</p>
        <form id="cryptoLoginForm">
          <input type="password" id="cryptoKeyInput" placeholder="${this.translations.login_placeholder}" required autocomplete="off">
          <div class="crypto-login-error" id="cryptoLoginError">${this.translations.login_error}</div>
          <button type="submit" class="crypto-btn-login" id="cryptoLoginBtn">${this.translations.login_button}</button>
        </form>
      </div>
    `;
    document.body.appendChild(this.loginOverlay);

    // Create logout button
    this.logoutBtn = document.createElement('button');
    this.logoutBtn.className = 'crypto-logout-btn';
    this.logoutBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i>${this.translations.logout}`;
    this.logoutBtn.style.display = 'none';
    document.body.appendChild(this.logoutBtn);

    // Bind events
    this.bindLoginEvents();
  },

  /**
   * Bind login form events
   */
  bindLoginEvents() {
    const form = document.getElementById('cryptoLoginForm');
    const input = document.getElementById('cryptoKeyInput');
    const error = document.getElementById('cryptoLoginError');
    const btn = document.getElementById('cryptoLoginBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const key = input.value.trim();
      if (!key) return;

      btn.disabled = true;
      error.classList.remove('show');

      const success = await this.login(key);

      if (success) {
        this.hideLoginUI();
        input.value = '';
        if (this.onLoginSuccess) this.onLoginSuccess();
      } else {
        error.classList.add('show');
        input.value = '';
        input.focus();
      }

      btn.disabled = false;
    });

    this.logoutBtn.addEventListener('click', () => {
      this.logout();
    });
  },

  /**
   * Show login UI
   */
  showLoginUI() {
    if (this.loginOverlay) {
      this.loginOverlay.classList.remove('hidden');
      this.logoutBtn.style.display = 'none';

      // Lock content
      const container = document.querySelector('.builder-container, .brochure');
      if (container) container.classList.add('crypto-locked');

      // Focus input
      setTimeout(() => {
        const input = document.getElementById('cryptoKeyInput');
        if (input) input.focus();
      }, 100);
    }
  },

  /**
   * Hide login UI
   */
  hideLoginUI() {
    if (this.loginOverlay) {
      this.loginOverlay.classList.add('hidden');
      this.logoutBtn.style.display = 'block';

      // Unlock content
      const container = document.querySelector('.builder-container, .brochure');
      if (container) container.classList.remove('crypto-locked');
    }
  },

  /**
   * Initialize authentication check
   * @param {string} logoUrl - URL to logo image
   * @param {Function} onSuccess - Callback when login succeeds
   */
  async initAuth(logoUrl, onSuccess) {
    this.onLoginSuccess = onSuccess;
    this.createLoginUI(logoUrl);

    const loggedIn = await this.isLoggedIn();
    if (loggedIn) {
      this.hideLoginUI();
      if (onSuccess) onSuccess();
    } else {
      this.showLoginUI();
    }
  }
};

// Export for use
window.ProposalCrypto = ProposalCrypto;
