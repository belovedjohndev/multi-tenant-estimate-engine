import express from 'express';
import { authModule } from './modules/auth';
import { clientConfigModule } from './modules/clientConfig';
import { leadsModule } from './modules/leads';
import { portalModule } from './modules/portal';
import { estimateModule } from './modules/estimate';
import { errorHandler, notFoundHandler } from './http/api';
import { verifyDatabaseConnection } from './infrastructure/database';

const app = express();
const allowedOrigin = process.env.WIDGET_ORIGIN || 'http://localhost:4173';

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    return next();
});
app.use(express.json());

app.use('/client-config', clientConfigModule);
app.use('/leads', leadsModule);
app.use('/estimate', estimateModule);
app.use('/auth', authModule);
app.use('/me', portalModule);
app.use('/portal', portalModule);
app.use(notFoundHandler);
app.use(errorHandler);

const port = process.env.PORT || 3000;

async function start() {
    await verifyDatabaseConnection();

    app.listen(port, () => {
        console.log(`Estimator Engine Backend running on port ${port}`);
    });
}

start().catch((error) => {
    console.error('Failed to start backend', error);
    process.exit(1);
});
