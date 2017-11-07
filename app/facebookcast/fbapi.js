// app/facebookcast/fbapi.js

const rp = require('request-promise');
const logger = require('../utils').logger();

const appName = 'Castr';
const appVersion = 'v0.1.0';
const userAgent = `${appName}/${appVersion}`;

const host = 'https://graph.facebook.com/';
const apiVersion = 'v2.10';

const DELAY_PER_USAGE = 7000; // milliseconds
const MAX_USAGE = Math.floor(DELAY_PER_USAGE / 1000);

const accountUsage = {};
const usageQueue = {};

const fbErrCodes = {
    RATE_LIMITED: 613,
    INVALID_PARAM: 100,
    PERMISSIONS_ERROR: 200,
    NONEXISTENT_ENDPOINT: 803,
};

const fatalErrors = [
    fbErrCodes.INVALID_PARAM,
    fbErrCodes.PERMISSIONS_ERROR,
    fbErrCodes.NONEXISTENT_ENDPOINT
];

const fbErrSubcodes = {
    ACCOUNT_RATE_LIMITED: 1487742,
};

const getUri = (node, edge) => {
    let uri = `${host}${apiVersion}`;
    if (node) uri += `/${node}`;
    if (edge) uri += `/${edge}`;
    return uri;
};

function objToStr(obj) {
    if (Array.isArray(obj)) {
        let str = '[';
        for (let i = 0; i < obj.length; i++) {
            if (i !== 0) str += ',';
            str += `${objToStr(obj[i])}`;
        }
        str += ']';
        return str;
    } else if (typeof obj === 'object') {
        let str = '{';
        const keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++) {
            if (i !== 0) str += ',';
            str += `"${keys[i]}":${objToStr(obj[keys[i]])}`;
        }
        str += '}';
        return str;
    }
    return `"${obj}"`;
}

function addUsage(accountId) {
    if (!accountUsage[accountId]) accountUsage[accountId] = 1;
    else accountUsage[accountId] += 1;
    logger.info(`Usage (#${accountId}): ${accountUsage[accountId]} (${accountUsage[accountId] * (DELAY_PER_USAGE / 1000)} seconds delay)`);
    return accountUsage[accountId];
}

function decayUsage() {
    const accounts = Object.keys(accountUsage);
    for (let i = accounts.length - 1; i >= 0; i--) {
        const accountId = accounts[i];
        if (accountUsage[accountId] <= 0) delete accountUsage[accountId];
        else accountUsage[accountId] -= 1;
    }
}

function addQueue(accountId) {
    if (!usageQueue[accountId]) usageQueue[accountId] = 1;
    else usageQueue[accountId] += 1;
    return usageQueue[accountId];
}

function removeQueue(accountId) {
    if (usageQueue[accountId] <= 1) delete usageQueue[accountId];
    else usageQueue[accountId] -= 1;
}

const get = async (node, edge, params) => {
    const options = {
        uri: getUri(node, edge),
        qs: params,
        headers: {
            'User-Agent': userAgent,
            Authorization: `OAuth ${process.env.ADMIN_SYS_USER_TOKEN}`,
        },
        json: true,
    };
    try {
        const response = await rp(options);
        return response;
    } catch (err) {
        const error = (err.error) ? err.error.error || err.error : err;
        throw err;
    }
};

const post = async (node, edge, params, method, attempts) => {
    let usage;
    let throttle;
    do {
        if (node.includes('act_')) usage = addUsage(node);
        if (usage) {
            if (usage > MAX_USAGE) {
                decayUsage(node);
                const queue = addQueue(node);
                logger.info(`Max usage reached. Retrying in ${((DELAY_PER_USAGE * queue) / 1000).toFixed(2)} seconds (${queue} queued)`);
                await new Promise((resolve) => { setTimeout(resolve, DELAY_PER_USAGE * queue); });
                removeQueue(node);
            } else {
                throttle = usage * DELAY_PER_USAGE;
                break;
            }
        } else {
            throttle = 0;
        }
    } while (usage);
    const options = {
        method: method,
        uri: getUri(node, edge),
        body: params,
        headers: {
            'User-Agent': userAgent,
            Authorization: `OAuth ${process.env.ADMIN_SYS_USER_TOKEN}`,
        },
        json: true,
    };
    try {
        const resp = await new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    const response = await rp(options);
                    resolve(response);
                } catch (errr) {
                    reject(errr);
                }
            }, throttle);
        });
        return resp;
    } catch (err) {
        const attempt = attempts || 1;
        if (attempt <= 3) {
            const error = (err.error) ? err.error.error || err.error : err;
            let delay = 5;
            if (fatalErrors.includes(error.code)) {
                throw err;
            } else if (error.code === fbErrCodes.RATE_LIMITED && error.error_subcode === fbErrSubcodes.ACCOUNT_RATE_LIMITED) {
                logger.error(error);
                delay = 300;
            } else {
                logger.error(error);
            }
            delay *= attempt;
            logger.warn(`Request failed, retrying in ${delay} seconds...\n${options.method} ${options.uri}\n${JSON.stringify(options.body, null, 2)}`);
            return new Promise((resolve, reject) => {
                setTimeout(async () => {
                    logger.debug(`Retrying attempt (${attempt}/3) ...`);
                    try {
                        const response = await post(node, edge, params, method, attempt + 1);
                        resolve(response);
                    } catch (errr) {
                        reject(errr);
                    }
                }, delay * 1000);
            });
        }
        throw err;
    }
};

const batch = async (batchParams, hasBody) => {
    batchParams = batchParams.filter(batchParam => batchParam !== null);
    if (hasBody) {
        logger.debug('Url encoding body param object...');
        batchParams = batchParams.map((batchParam) => {
            const body = batchParam.body;
            const keys = Object.keys(body);
            let bodyString = '';
            for (let i = 0; i < keys.length; i++) {
                if (bodyString !== '') bodyString += '&';
                let value = body[keys[i]];
                const valType = typeof body[keys[i]];
                if (valType === 'object' || Array.isArray(value)) value = objToStr(body[keys[i]]);
                bodyString += `${keys[i]}=${value}`;
            }
            batchParam.body = bodyString;
            return batchParam;
        });
    }
    const options = {
        method: 'POST',
        uri: host,
        body: {
            batch: batchParams,
        },
        headers: {
            'User-Agent': userAgent,
            Authorization: `OAuth ${process.env.ADMIN_SYS_USER_TOKEN}`,
        },
        json: true,
    };
    try {
        return rp(options);
    } catch (err) {
        throw err;
    }
};

setInterval(decayUsage, DELAY_PER_USAGE);

module.exports = {
    get: get,
    post: (node, edge, params) => post(node, edge, params, 'POST'),
    delete: (node, edge, params) => post(node, edge, params, 'DELETE'),
    batch: batch,
    apiVersion: apiVersion,
};
