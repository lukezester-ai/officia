const { createClerkClient } = require('@clerk/backend');

try {
  const client = createClerkClient({ 
    publishableKey: 'pk_test_ZnVsbC1zdGFybGluZy0xNC5jbGVyay5hY2NvdW50cy5kZXYk', 
    secretKey: 'sk_test_FQZjw8ie8a6DAn66LB5bkJFnbRc2zuK3elLqvcYTi4' 
  });
  console.log("Valid keys!");
} catch (e) {
  console.error("Invalid:", e.message);
}
