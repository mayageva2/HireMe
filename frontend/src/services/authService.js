import { signUp, signIn, confirmSignUp, fetchUserAttributes } from 'aws-amplify/auth';

export const authService = {
  async handleSignUp(email, password, fullName, profession) {
    const username = email.split('@')[0];
    return await signUp({
      username,
      password,
      options: {
        userAttributes: {
          email,
          'custom:profession': profession,
          name: fullName
        }
      }
    });
  },

  async handleConfirm(email, authCode) {
    const username = email.split('@')[0];
    return await confirmSignUp({ username, confirmationCode: authCode });
  },

  async handleSignIn(email, password) {
    const username = email.split('@')[0];
    await signIn({ username, password });
    const attributes = await fetchUserAttributes();
    
    return {
      fullName: attributes.name || "User",
      profession: attributes['custom:profession'] || "Professional",
      email: attributes.email,
      stats: { interviews: 12, offers: 4, score: 8.5 } // Mock data needs to be changed!!
    };
  }
};