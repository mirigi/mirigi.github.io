/**
 * Proposal Storage - IndexedDB-based persistence for Mirigi proposals
 * Allows salespeople to save, load, edit, and share proposals
 */

const ProposalStorage = {
  DB_NAME: 'MirigiProposals',
  DB_VERSION: 1,
  STORE_NAME: 'proposals',
  db: null,

  /**
   * Initialize the database
   */
  async init() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('buildingName', 'buildingName', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  },

  /**
   * Save a proposal (create or update)
   */
  async save(proposal) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      const now = new Date().toISOString();

      // Create a clean copy to avoid mutating the original
      const proposalToSave = { ...proposal };

      if (proposalToSave.id && typeof proposalToSave.id === 'number') {
        // Update existing
        proposalToSave.updatedAt = now;
      } else {
        // New proposal - remove id so IndexedDB auto-generates it
        delete proposalToSave.id;
        proposalToSave.createdAt = now;
        proposalToSave.updatedAt = now;
      }

      const request = store.put(proposalToSave);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Get all proposals
   */
  async getAll() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('updatedAt');
      const request = index.getAll();

      request.onsuccess = () => {
        // Sort by updatedAt descending (most recent first)
        const proposals = request.result.sort((a, b) =>
          new Date(b.updatedAt) - new Date(a.updatedAt)
        );
        resolve(proposals);
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Get a single proposal by ID
   */
  async get(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Delete a proposal
   */
  async delete(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Get form data as an object
   */
  getFormData() {
    // Get services data
    const services = {};
    const buildingSetupEl = document.getElementById('serviceBuildingSetup');
    const customAppEl = document.getElementById('serviceCustomApp');
    const tabletConfigEl = document.getElementById('serviceTabletConfig');

    if (buildingSetupEl?.checked) {
      services.buildingSetup = {
        enabled: true,
        price: parseFloat(document.getElementById('priceBuildingSetup')?.value) || 0
      };
    }
    if (customAppEl?.checked) {
      services.customApp = {
        enabled: true,
        price: parseFloat(document.getElementById('priceCustomApp')?.value) || 0
      };
    }
    if (tabletConfigEl?.checked) {
      services.tabletConfig = {
        enabled: true,
        price: parseFloat(document.getElementById('priceTabletConfig')?.value) || 0
      };
    }

    return {
      buildingName: document.getElementById('buildingName')?.value || '',
      tagline: document.getElementById('tagline')?.value || '',
      pricePerUnit: document.getElementById('pricePerUnit')?.value || '',
      units: document.getElementById('units')?.value || '',
      salesperson: document.getElementById('salesperson')?.value || '',
      email: document.getElementById('email')?.value || '',
      contractTerm: document.getElementById('contractTerm')?.value || '',
      validUntil: document.getElementById('validUntil')?.value || '',
      terms: document.getElementById('terms')?.value || '',
      highlightedFeatures: Array.from(document.querySelectorAll('input[name="features"]:checked'))
        .map(cb => cb.value),
      services: Object.keys(services).length > 0 ? services : null
    };
  },

  /**
   * Load form data from an object
   */
  loadFormData(data) {
    if (data.buildingName) document.getElementById('buildingName').value = data.buildingName;
    if (data.tagline) document.getElementById('tagline').value = data.tagline;
    if (data.pricePerUnit) document.getElementById('pricePerUnit').value = data.pricePerUnit;
    if (data.units) document.getElementById('units').value = data.units;
    if (data.salesperson) document.getElementById('salesperson').value = data.salesperson;
    if (data.email) document.getElementById('email').value = data.email;
    if (data.contractTerm) document.getElementById('contractTerm').value = data.contractTerm;
    if (data.validUntil) document.getElementById('validUntil').value = data.validUntil;
    if (data.terms) document.getElementById('terms').value = data.terms;

    // Update pricing display
    if (typeof updatePricing === 'function') {
      updatePricing();
    }

    // Check highlighted features
    if (data.highlightedFeatures && Array.isArray(data.highlightedFeatures)) {
      document.querySelectorAll('input[name="features"]').forEach(cb => {
        cb.checked = data.highlightedFeatures.includes(cb.value);
      });
    }

    // Load services
    if (data.services) {
      const buildingSetupEl = document.getElementById('serviceBuildingSetup');
      const customAppEl = document.getElementById('serviceCustomApp');
      const tabletConfigEl = document.getElementById('serviceTabletConfig');

      if (buildingSetupEl) {
        buildingSetupEl.checked = data.services.buildingSetup?.enabled || false;
        const priceEl = document.getElementById('priceBuildingSetup');
        if (priceEl && data.services.buildingSetup?.price !== undefined) {
          priceEl.value = data.services.buildingSetup.price;
        }
      }
      if (customAppEl) {
        customAppEl.checked = data.services.customApp?.enabled || false;
        const priceEl = document.getElementById('priceCustomApp');
        if (priceEl && data.services.customApp?.price !== undefined) {
          priceEl.value = data.services.customApp.price;
        }
      }
      if (tabletConfigEl) {
        tabletConfigEl.checked = data.services.tabletConfig?.enabled || false;
        const priceEl = document.getElementById('priceTabletConfig');
        if (priceEl && data.services.tabletConfig?.price !== undefined) {
          priceEl.value = data.services.tabletConfig.price;
        }
      }
    }
  },

  /**
   * Generate a shareable URL with all form data encoded as base64 JSON
   */
  generateShareUrl() {
    const formData = this.getFormData();

    // Build proposal data object (only non-empty values)
    const proposalData = {};
    if (formData.buildingName) proposalData.buildingName = formData.buildingName;
    if (formData.tagline) proposalData.tagline = formData.tagline;
    if (formData.pricePerUnit) proposalData.pricePerUnit = formData.pricePerUnit;
    if (formData.units) proposalData.units = formData.units;
    if (formData.salesperson) proposalData.salesperson = formData.salesperson;
    if (formData.email) proposalData.email = formData.email;
    if (formData.contractTerm) proposalData.contractTerm = formData.contractTerm;
    if (formData.validUntil) proposalData.validUntil = formData.validUntil;
    if (formData.terms) proposalData.notes = formData.terms;
    if (formData.highlightedFeatures?.length > 0) {
      proposalData.highlighted = formData.highlightedFeatures;
    }
    if (formData.services) proposalData.services = formData.services;

    // Encode as base64 JSON
    const encodedData = btoa(JSON.stringify(proposalData));

    // Return current URL with encoded data
    const url = new URL(window.location.href);
    url.search = `d=${encodedData}`;
    return url.toString();
  },

  /**
   * Load form data from URL parameters (for shared links)
   */
  loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const encodedData = params.get('d');

    if (!encodedData) {
      return false;
    }

    try {
      const jsonString = atob(encodedData);
      const proposalData = JSON.parse(jsonString);

      const data = {
        buildingName: proposalData.buildingName || '',
        tagline: proposalData.tagline || '',
        pricePerUnit: proposalData.pricePerUnit || proposalData.pricing || '',
        units: proposalData.units || '',
        salesperson: proposalData.salesperson || '',
        email: proposalData.email || '',
        contractTerm: proposalData.contractTerm || proposalData.terms || '',
        validUntil: proposalData.validUntil || '',
        terms: proposalData.notes || '',
        highlightedFeatures: proposalData.highlighted || [],
        services: proposalData.services || null
      };

      this.loadFormData(data);
      return true;
    } catch (e) {
      console.error('Failed to decode proposal data from URL:', e);
      return false;
    }
  },

  /**
   * Generate an encrypted shareable URL with all form data
   */
  async generateShareUrlEncrypted() {
    const formData = this.getFormData();

    // Build proposal data object (only non-empty values)
    const proposalData = {};
    if (formData.buildingName) proposalData.buildingName = formData.buildingName;
    if (formData.tagline) proposalData.tagline = formData.tagline;
    if (formData.pricePerUnit) proposalData.pricePerUnit = formData.pricePerUnit;
    if (formData.units) proposalData.units = formData.units;
    if (formData.salesperson) proposalData.salesperson = formData.salesperson;
    if (formData.email) proposalData.email = formData.email;
    if (formData.contractTerm) proposalData.contractTerm = formData.contractTerm;
    if (formData.validUntil) proposalData.validUntil = formData.validUntil;
    if (formData.terms) proposalData.notes = formData.terms;
    if (formData.highlightedFeatures?.length > 0) {
      proposalData.highlighted = formData.highlightedFeatures;
    }
    if (formData.services) proposalData.services = formData.services;

    // Encrypt the data
    const encryptedData = await ProposalCrypto.encryptProposalData(proposalData);

    // Return current URL with encrypted data
    const url = new URL(window.location.href);
    url.search = `d=${encodeURIComponent(encryptedData)}`;
    return url.toString();
  },

  /**
   * Load form data from encrypted URL parameter (for shared links)
   */
  async loadFromUrlEncrypted() {
    const params = new URLSearchParams(window.location.search);
    const encodedData = params.get('d');

    if (!encodedData) {
      return false;
    }

    try {
      const proposalData = await ProposalCrypto.decryptProposalData(decodeURIComponent(encodedData));

      const data = {
        buildingName: proposalData.buildingName || '',
        tagline: proposalData.tagline || '',
        pricePerUnit: proposalData.pricePerUnit || proposalData.pricing || '',
        units: proposalData.units || '',
        salesperson: proposalData.salesperson || '',
        email: proposalData.email || '',
        contractTerm: proposalData.contractTerm || proposalData.terms || '',
        validUntil: proposalData.validUntil || '',
        terms: proposalData.notes || '',
        highlightedFeatures: proposalData.highlighted || [],
        services: proposalData.services || null
      };

      this.loadFormData(data);
      return true;
    } catch (e) {
      console.error('Failed to decrypt proposal data from URL:', e);
      return false;
    }
  },

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  },

  /**
   * Format date for display
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Save salesperson details to localStorage
   */
  saveSalespersonDetails(name, email) {
    if (name) localStorage.setItem('mirigi_salesperson_name', name);
    if (email) localStorage.setItem('mirigi_salesperson_email', email);
  },

  /**
   * Load salesperson details from localStorage
   */
  loadSalespersonDetails() {
    const name = localStorage.getItem('mirigi_salesperson_name') || '';
    const email = localStorage.getItem('mirigi_salesperson_email') || '';

    if (name) {
      const nameInput = document.getElementById('salesperson');
      if (nameInput && !nameInput.value) nameInput.value = name;
    }
    if (email) {
      const emailInput = document.getElementById('email');
      if (emailInput && !emailInput.value) emailInput.value = email;
    }
  }
};

// Export for use
window.ProposalStorage = ProposalStorage;
