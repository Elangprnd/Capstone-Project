import crypto from 'crypto';
import jwt from 'jsonwebtoken';

function generateKeys() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    const escapedPrivate = privateKey.replace(/\n/g, '\\n');
    const escapedPublic = publicKey.replace(/\n/g, '\\n');

    console.log('\n=== COPY THESE TO YOUR .env ===\n');
    console.log(`JWT_PRIVATE_KEY="${escapedPrivate}"`);
    console.log(`JWT_PUBLIC_KEY="${escapedPublic}"`);
    console.log('\n================================\n');

    // Verification Test
    const payload = { user_id: 'test_123', role: 'volunteer', auth_provider: 'email' };
    try {
        const token = jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
        console.log('Test Sign: SUCCESS');
        
        const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
        console.log('Test Verify: SUCCESS');
        console.log('Decoded Payload:', decoded);
    } catch (err) {
        console.error('Test Failed:', err.message);
    }
}

generateKeys();
