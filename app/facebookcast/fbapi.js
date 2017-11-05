// app/facebookcast/fbapi.js

const rp = require('request-promise');
const logger = require('../utils').logger();

const appName = 'Castr';
const appVersion = 'v0.1.0';
const userAgent = `${appName}/${appVersion}`;

const host = 'https://graph.facebook.com/';
const apiVersion = 'v2.10';

const fbErrCodes = {
    RATE_LIMITED: 613,
    INVALID_PARAM: 100,
    PERMISSIONS_ERROR: 200,
};

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

const get = async (node, edge, params) => {
    // if (params) params.access_token = params.access_token || process.env.ADMIN_SYS_USER_TOKEN;
    // else params = { access_token: process.env.ADMIN_SYS_USER_TOKEN }; // eslint-disable-line no-param-reassign
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
    // if (params) params.access_token = params.access_token || process.env.ADMIN_SYS_USER_TOKEN;
    // else params = { access_token: process.env.ADMIN_SYS_USER_TOKEN }; // eslint-disable-line no-param-reassign
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
        const response = await rp(options);
        return response;
    } catch (err) {
        const attempt = attempts || 1;
        if (attempt <= 3) {
            const error = (err.error) ? err.error.error || err.error : err;
            let throttle = 5;
            if (error.code === fbErrCodes.RATE_LIMITED && error.error_subcode === fbErrSubcodes.ACCOUNT_RATE_LIMITED) {
                logger.error(error);
                throttle = 300;
            } else if (error.code === fbErrCodes.PERMISSIONS_ERROR || error.code === fbErrCodes.INVALID_PARAM) {
                logger.error(error);
                throw err;
            } else {
                logger.error(error);
            }
            throttle *= attempt;
            logger.debug(`Unfortunate API failure, retrying in ${throttle} seconds...\n${options.method} ${options.uri}\n${JSON.stringify(options.body, null, 2)}`);
            return new Promise((resolve, reject) => {
                setTimeout(async () => {
                    logger.debug(`Retrying attempt (${attempt}/3) ...`);
                    try {
                        const response = await post(node, edge, params, method, attempt + 1);
                        resolve(response);
                    } catch (errr) {
                        reject(errr);
                    }
                }, throttle * 1000);
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
            // access_token: process.env.ADMIN_SYS_USER_TOKEN,
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

module.exports = {
    get: get,
    post: (node, edge, params) => post(node, edge, params, 'POST'),
    delete: (node, edge, params) => post(node, edge, params, 'DELETE'),
    batch: batch,
    apiVersion: apiVersion,
};
