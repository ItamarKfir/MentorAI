// Secure API key handling with encryption
class SecureStorage {
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
    
    static validateApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('Invalid API key format');
        }
        
        if (!apiKey.startsWith('sk-')) {
            throw new Error('Invalid API key prefix');
        }
        
        if (apiKey.length < 32) {
            throw new Error('API key too short');
        }
        
        return true;
    }
    
    static async securelyStoreApiKey(apiKey) {
        try {
            this.validateApiKey(apiKey);
            const encryptedData = await this.encryptData(apiKey);
            await chrome.storage.local.set({
                secureApiKey: encryptedData,
                lastUpdated: Date.now()
            });
            return true;
        } catch (error) {
            console.error('Error storing API key:', error);
            throw error;
        }
    }
    
    static async getSecureApiKey() {
        try {
            const data = await chrome.storage.local.get('secureApiKey');
            if (!data.secureApiKey) {
                return null;
            }
            return await this.decryptData(data.secureApiKey);
        } catch (error) {
            console.error('Error retrieving API key:', error);
            throw error;
        }
    }
    
    static async clearApiKey() {
        try {
            await chrome.storage.local.remove(['secureApiKey', 'lastUpdated']);
            return true;
        } catch (error) {
            console.error('Error clearing API key:', error);
            throw error;
        }
    }
}

// Export the class
window.SecureStorage = SecureStorage; 