// Amplify v6 — used by `Amplify.configure()` in `index.js`
export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId:
        import.meta.env.VITE_COGNITO_USER_POOL_ID ||
        'us-east-1_u56lBJUdL',
      userPoolClientId:
        import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID ||
        'sb893tp11fni580ojjfpp9u52',
      // App signs in with Cognito `username` (email local-part), not as email alias
      loginWith: {
        username: true,
      },
    },
  },
};