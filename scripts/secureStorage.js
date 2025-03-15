// Secure API key handling with encryption
class SecureStorage {
    static API_PROVIDERS = {
        OPENAI: 'openai',
        GOOGLE: 'google'
    };

    static API_KEY_PATTERNS = {
        [this.API_PROVIDERS.OPENAI]: {
            prefix: 'sk-',
            minLength: 32
        },
        [this.API_PROVIDERS.GOOGLE]: {
            prefix: 'AIza',
            minLength: 39
        }
    };

    static async encryptData(data) {
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(data);
        
        // Generate a random encryption key
        const key = await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
        
        // Generate a random IV
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        // Encrypt the data
        const encryptedData = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encodedData
        );
        
        // Export the key for storage
        const exportedKey = await window.crypto.subtle.exportKey('raw', key);
        
        return {
            encrypted: Array.from(new Uint8Array(encryptedData)),
            iv: Array.from(iv),
            key: Array.from(new Uint8Array(exportedKey))
        };
    }
    
    static async decryptData(encryptedObj) {
        try {
            // Convert arrays back to Uint8Arrays
            const encryptedData = new Uint8Array(encryptedObj.encrypted);
            const iv = new Uint8Array(encryptedObj.iv);
            const keyData = new Uint8Array(encryptedObj.key);
            
            // Import the key
            const key = await window.crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'AES-GCM', length: 256 },
                true,
                ['decrypt']
            );
            
            // Decrypt the data
            const decryptedData = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                encryptedData
            );
            
            // Decode the decrypted data
            const decoder = new TextDecoder();
            return decoder.decode(decryptedData);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }
    
    static validateApiKey(apiKey, provider) {
        if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('Invalid API key format');
        }
        
        const pattern = this.API_KEY_PATTERNS[provider];
        if (!pattern) {
            throw new Error('Invalid API provider');
        }
        
        if (pattern.prefix && !apiKey.startsWith(pattern.prefix)) {
            throw new Error(`Invalid API key prefix for ${provider}. Expected prefix: ${pattern.prefix}`);
        }
        
        if (apiKey.length < pattern.minLength) {
            throw new Error(`API key too short for ${provider}. Minimum length: ${pattern.minLength}`);
        }
        
        return true;
    }
    
    static async securelyStoreApiKey(apiKey, provider) {
        try {
            this.validateApiKey(apiKey, provider);
            const encryptedData = await this.encryptData(apiKey);
            
            // Get existing keys
            const data = await chrome.storage.local.get('apiKeys');
            const apiKeys = data.apiKeys || {};
            
            // Update the specific provider's key
            apiKeys[provider] = {
                data: encryptedData,
                lastUpdated: Date.now()
            };
            
            await chrome.storage.local.set({ apiKeys });
            return true;
        } catch (error) {
            console.error('Error storing API key:', error);
            throw error;
        }
    }
    
    static async getSecureApiKey(provider) {
        try {
            const data = await chrome.storage.local.get('apiKeys');
            const apiKeys = data.apiKeys || {};
            
            if (!apiKeys[provider]) {
                return null;
            }
            
            return await this.decryptData(apiKeys[provider].data);
        } catch (error) {
            console.error('Error retrieving API key:', error);
            throw error;
        }
    }
    
    static async clearApiKey(provider) {
        try {
            const data = await chrome.storage.local.get('apiKeys');
            const apiKeys = data.apiKeys || {};
            
            if (provider) {
                // Clear specific provider
                delete apiKeys[provider];
                await chrome.storage.local.set({ apiKeys });
            } else {
                // Clear all providers
                await chrome.storage.local.remove('apiKeys');
            }
            
            return true;
        } catch (error) {
            console.error('Error clearing API key(s):', error);
            throw error;
        }
    }

    static async getAllProviders() {
        try {
            const data = await chrome.storage.local.get('apiKeys');
            const apiKeys = data.apiKeys || {};
            return Object.keys(apiKeys);
        } catch (error) {
            console.error('Error getting providers:', error);
            return [];
        }
    }
}

// Export the class
window.SecureStorage = SecureStorage; 