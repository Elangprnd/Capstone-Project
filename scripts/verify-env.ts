import 'dotenv/config';
import jwt from 'jsonwebtoken';

function verifyEnv() {
    console.log('=== VERIFYING ENV KEYS ===');
    const rawPriv = process.env.JWT_PRIVATE_KEY;
    const rawPub = process.env.JWT_PUBLIC_KEY;

   if (!rawPriv || !rawPub) {
        console.error('FAIL: Keys missing in process.env. Check .env file path or import order.');
        return;
   }

    const priv = rawPriv.replace(/\\n/g, '\n');
    const pub = rawPub.replace(/\\n/g, '\n');



    const payload = { 
        user_id: 'test_user_123', 
        role: 'volunteer', 
        auth_provider: 'email' 
    };

    try {
        const token = jwt.sign({ test: true }, priv, { algorithm: 'RS256' });
        jwt.verify(token, pub, { algorithms: ['RS256'] });
        console.log('PASS: Environment keys are valid and working!');
    } catch (err) {
    console.error('FAIL:', err.message);
    }

}
verifyEnv();
