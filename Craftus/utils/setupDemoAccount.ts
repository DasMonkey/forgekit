/**
 * Demo Account Setup Utility
 * Creates a demo account in LocalStorage for testing
 * 
 * Email: demo@craftus.art
 * Password: demo1234
 */

import { hashPassword, createUser } from './auth';

export const setupDemoAccount = async () => {
  try {
    const email = 'demo@craftus.art';
    const password = 'demo1234';
    const displayName = 'Demo User';

    // Get existing credentials or create new object
    const storedCredentials = localStorage.getItem('craftus_user_credentials');
    const credentials = storedCredentials ? JSON.parse(storedCredentials) : {};

    // Check if demo account exists with correct password
    if (credentials[email.toLowerCase()]) {
      // Verify if it's the correct password
      const existingHash = credentials[email.toLowerCase()].passwordHash;
      const newHash = await hashPassword(password);
      
      if (existingHash === newHash) {
        console.log('ℹ️ Demo account already exists with correct password');
        return true;
      } else {
        console.log('🔄 Updating demo account with new password...');
      }
    }

    // Create user object
    const user = createUser(email, displayName);

    // Hash password
    const passwordHash = await hashPassword(password);

    // Add/update demo account
    credentials[email.toLowerCase()] = {
      passwordHash,
      user,
    };

    // Save to LocalStorage
    localStorage.setItem('craftus_user_credentials', JSON.stringify(credentials));

    console.log('✅ Demo account created/updated successfully!');
    console.log('Email: demo@craftus.art');
    console.log('Password: demo1234');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create demo account:', error);
    return false;
  }
};

// Auto-run if this file is imported
if (typeof window !== 'undefined') {
  // Always run setup to ensure correct password
  setupDemoAccount();
}
