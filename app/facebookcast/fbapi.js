// app/facebookcast/fbapi.js

const rp = require('request-promise');
const logger = require('../utils').logger();

const appName = 'Castr';
const appVersion = 'v0.1.0';
const userAgent = `${appName}/${appVersion}`;

const host = 'https://graph.facebook.com/';
const apiVersion = 'v2.10';

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

const get = (node, edge, params) => {
    if (params) params.access_token = params.access_token || process.env.ADMIN_SYS_USER_TOKEN;
    else params = { access_token: process.env.ADMIN_SYS_USER_TOKEN }; // eslint-disable-line no-param-reassign
    const options = {
        uri: getUri(node, edge),
        qs: params,
        headers: {
            'User-Agent': userAgent,
        },
        json: true,
    };
    try {
        return rp(options);
    } catch (err) {
        throw err;
    }
};

const post = async (node, edge, params, method) => {
    if (params) params.access_token = params.access_token || process.env.ADMIN_SYS_USER_TOKEN;
    else params = { access_token: process.env.ADMIN_SYS_USER_TOKEN }; // eslint-disable-line no-param-reassign
    const options = {
        method: method,
        uri: getUri(node, edge),
        body: params,
        json: true,
    };
    try {
        return rp(options);
    } catch (err) {
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
            access_token: process.env.ADMIN_SYS_USER_TOKEN,
            batch: batchParams,
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
