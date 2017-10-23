// app/facebookcast/fbapi.js

const rp = require('request-promise');

const appName = 'Castr';
const appVersion = 'v0.1.0';
const userAgent = `${appName}/${appVersion}`;

const host = 'https://graph.facebook.com';
const apiVersion = 'v2.10';

const getUri = (node, edge) => {
    let uri = `${host}/${apiVersion}`;
    if (node) uri += `/${node}`;
    if (edge) uri += `/${edge}`;
    return uri;
};

const get = (node, edge, params) => {
    params.access_token = params.access_token || process.env.ADMIN_SYS_USER_TOKEN;
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
    params.access_token = params.access_token || process.env.ADMIN_SYS_USER_TOKEN;
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

module.exports = {
    get: get,
    post: (node, edge, params) => post(node, edge, params, 'POST'),
    delete: (node, edge, params) => post(node, edge, params, 'DELETE'),
    // post: (node, edge, params) => post(node, edge, params, 'POST')
};
