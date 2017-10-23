// app/facebookcast/project/project.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const Model = require('./project.model');

const ProjectModel = Model.Model;
const accessType = process.env.ACCESS_TYPE;
const accountRoles = process.env.ACCOUNT_ROLES.split(',');
const pageRoles = process.env.PAGE_ROLES.split(',');
const ProjectStatus = Model.Status;

class ProjectService {
    async getProject(params) {
        const castrLocId = params.castrLocId;
        try {
            const project = await ProjectModel.findOne({ castrLocId: castrLocId });
            const msg = `Business (#${castrLocId}) project fetched`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: project,
            };
        } catch (err) {
            throw err;
        }
    }

    async getAccounts(params) {
        const userId = params.userId;
        const accessToken = params.accessToken;
        const fields = ['id', 'name'];
        const data = {
            access_token: accessToken,
            fields: fields.toString(),
        };
        try {
            logger.debug(`Fetching adaccounts belonging to User (#${userId}) ...`);
            const fbResponse = await fbRequest.get(userId, 'adaccounts', data);
            const msg = `${fbResponse.data.length} accounts fetched`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: fbResponse.data,
            };
        } catch (err) {
            throw err;
        }
    }

    async integrateAccount(params) {
        const castrLocId = params.castrLocId;
        const accountId = params.accountId;
        const accountName = params.accountName;
        const data = {
            adaccount_id: accountId,
            access_type: accessType,
            permitted_roles: accountRoles,
        };
        try {
            logger.debug(`Requesting access to adaccount (#${accountId}) owned by Business (#${castrLocId}) ...`);
            const fbResponse = await fbRequest.post(process.env.CASTR_BUSINESS_ID, 'adaccounts', data);
            logger.debug(`Adaccount request sent to Business (#${castrLocId})`);
            await ProjectModel.update(
                { castrLocId: castrLocId },
                {
                    $setOnInsert: { castrLocId: castrLocId },
                    $set: {
                        accountId: accountId,
                        accountName: accountName,
                        accountStatus: ProjectStatus.Pending,
                        accountVerified: false,
                        paymentMethodVerified: false,
                    },
                },
                { upsert: true }
            );
            logger.debug(`Pending status for business (#${castrLocId}) stored to DB`);
            return {
                success: true,
                message: 'Account integration pending, request sent',
                data: fbResponse,
            };
        } catch (err) {
            throw err;
        }
    }

    async disintegrateAccount(params) {
        const castrLocId = params.castrLocId;
        let accountId;
        try {
            if (!params.accountId) {
                logger.debug('AccountId not provided, fetching it from DB...');
                const project = await ProjectModel.findOne({ castrLocId: castrLocId });
                accountId = project.accountId;
            } else {
                accountId = params.accountId;
            }
            const data = { adaccount_id: accountId };
            logger.debug(`Disintegrating adaccount owned by Business (#${castrLocId}) ...`);
            const fbResponse = await fbRequest.delete(process.env.CASTR_BUSINESS_ID, 'adaccounts', data);
            logger.debug(`Disintegrated Business (#${castrLocId}) adaccount`);
            await ProjectModel.update(
                {
                    castrLocId: castrLocId,
                    accountId: accountId,
                },
                {
                    $set: {
                        accountStatus: ProjectStatus.Disintegrated,
                        accountVerified: false,
                        paymentMethodVerified: false,
                    },
                }
            );
            logger.debug(`Disintegrated status for business (#${castrLocId}) stored to DB`);
            return {
                success: true,
                message: 'Account disintegration successful',
                data: fbResponse,
            };
        } catch (err) {
            throw err;
        }
    }

    async verifyAccount(params) {
        const castrLocId = params.castrLocId;
        let accountId;
        try {
            if (!params.accountId) {
                logger.debug('AccountId not provided, fetching it from DB...');
                const project = await ProjectModel.findOne({ castrLocId: castrLocId });
                accountId = project.accountId;
            } else {
                accountId = params.accountId;
            }
            const data = {
                business: process.env.CASTR_BUSINESS_ID,
                user: process.env.ADMIN_SYS_USER_ID,
                role: 'ADMIN',
            };
            logger.debug(`Assigning system user to adaccount owned by Business (#${castrLocId}) ...`);
            logger.debug(`Creating adlabel for adaccount owned by Business (#${castrLocId}) ...`);
            const promises = [
                fbRequest.post(accountId, 'userpermissions', data),
                fbRequest.post(accountId, 'adlabels', { name: castrLocId })
            ];
            const fbResponses = await Promise.all(promises);
            const adlabel = fbResponses[1];
            logger.debug(`System user assigned to Business (#${castrLocId}) adaccount`);
            logger.debug(`Adlabel created for Business (#${castrLocId})`);
            await ProjectModel.update(
                {
                    castrLocId: castrLocId,
                    accountId: accountId,
                },
                {
                    $set: {
                        accountStatus: ProjectStatus.Approved,
                        accountVerified: true,
                        'adLabels.businessLabel': adlabel.id,
                    },
                }
            );
            logger.debug(`Account approved status for business (#${castrLocId}) stored to DB`);
            return {
                success: true,
                message: 'Account verification successful',
                data: fbResponses[0],
            };
        } catch (err) {
            throw err;
        }
    }

    async getPages(params) {
        const userId = params.userId;
        const accessToken = params.accessToken;
        const fields = ['id', 'name'];
        const data = {
            access_token: accessToken,
            fields: fields.toString(),
        };
        try {
            logger.debug(`Fetching pages belonging to User (#${userId}) ...`);
            const fbResponse = await fbRequest.get(userId, 'accounts', data);
            const msg = `${fbResponse.data.length} pages fetched`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: fbResponse.data,
            };
        } catch (err) {
            throw err;
        }
    }

    async integratePage(params) {
        const castrLocId = params.castrLocId;
        const pageId = params.pageId;
        const pageName = params.pageName;
        const data = {
            page_id: pageId,
            access_type: accessType,
            permitted_roles: pageRoles,
        };
        try {
            logger.debug(`Requesting access to page (#${pageId}) owned by Business (#${castrLocId}) ...`);
            const fbResponse = await fbRequest.post(process.env.CASTR_BUSINESS_ID, 'pages', data);
            logger.debug(`Page request sent to Business (#${castrLocId})`);
            await ProjectModel.update(
                { castrLocId: castrLocId },
                {
                    $setOnInsert: { castrLocId: castrLocId },
                    $set: {
                        pageId: pageId,
                        pageName: pageName,
                        pageStatus: ProjectStatus.Pending,
                        pageVerified: false,
                    },
                },
                { upsert: true }
            );
            logger.debug(`Pending status for business (#${castrLocId}) stored to DB`);
            return {
                success: true,
                message: 'Page integration pending, request sent',
                data: fbResponse,
            };
        } catch (err) {
            throw err;
        }
    }

    async disintegratePage(params) {
        const castrLocId = params.castrLocId;
        let pageId;
        try {
            if (!params.pageId) {
                logger.debug('PageId not provided, fetching it from DB...');
                const project = await ProjectModel.findOne({ castrLocId: castrLocId });
                pageId = project.pageId;
            } else {
                pageId = params.pageId;
            }
            if (pageId === process.env.CASTR_PRIMARY_PAGE_ID) throw new Error('Cannot disintegrate Castr primary page');
            const data = { page_id: pageId };
            logger.debug(`Disintegrating page owned by Business (#${castrLocId}) ...`);
            const fbResponse = await fbRequest.delete(process.env.CASTR_BUSINESS_ID, 'pages', data);
            logger.debug(`Disintegrated Business (#${castrLocId}) page`);
            await ProjectModel.update(
                {
                    castrLocId: castrLocId,
                    pageId: pageId,
                },
                {
                    $set: {
                        pageStatus: ProjectStatus.Disintegrated,
                        pageVerified: false,
                    },
                }
            );
            logger.debug(`Disintegrated status for business (#${castrLocId}) stored to DB`);
            return {
                success: true,
                message: 'Page disintegration successful',
                data: fbResponse,
            };
        } catch (err) {
            throw err;
        }
    }

    async verifyPage(params) {
        const castrLocId = params.castrLocId;
        let pageId;
        try {
            if (!params.pageId) {
                logger.debug('PageId not provided, fetching it from DB...');
                const project = await ProjectModel.findOne({ castrLocId: castrLocId });
                pageId = project.pageId;
            } else {
                pageId = params.pageId;
            }
            const pageRequestData = {
                business: process.env.CASTR_BUSINESS_ID,
                user: process.env.ADMIN_SYS_USER_ID,
                role: 'MANAGER',
            };
            logger.debug(`Assigning system user to page owned by Business (#${castrLocId}) ...`);
            const fbResponse = await fbRequest.post(pageId, 'userpermissions', pageRequestData);
            logger.debug(`System user assigned to Business (#${castrLocId}) page`);
            const dbUpdate = {
                pageStatus: ProjectStatus.Approved,
                pageVerified: true,
            };
            logger.debug(`Fetching Instagram account(s) belonging to Business (#${castrLocId}) page...`);
            const instagramRequestData = { fields: ['id', 'username'].toString() };
            const promises = [
                fbRequest.get(pageId, 'instagram_accounts', instagramRequestData),
                fbRequest.get(pageId, 'page_backed_instagram_accounts', instagramRequestData)
            ];
            const fbResponses = await Promise.all(promises);
            let foundInstagramAccount = false;
            for (let i = 0; i < 2; i++) {
                const isPBIA = (i === 1);
                const instagram = fbResponses[i].data[0];
                if (instagram) {
                    logger.debug('Instagram account fetched');
                    dbUpdate.instagramId = instagram.id;
                    dbUpdate.instagramName = instagram.username;
                    dbUpdate.isPBIA = isPBIA;
                    foundInstagramAccount = true;
                    break;
                }
            }
            if (!foundInstagramAccount) {
                logger.debug('No Instagram account fetched, creating new PBIA...');
                const instagram = await fbRequest.post(pageId, 'page_backed_instagram_accounts', instagramRequestData);
                logger.debug(`New PBIA created for Business (#${castrLocId}) page`);
                dbUpdate.instagramId = instagram.id;
                dbUpdate.instagramName = instagram.username;
                dbUpdate.isPBIA = true;
            }
            await ProjectModel.update(
                {
                    castrLocId: castrLocId,
                    pageId: pageId,
                },
                { $set: dbUpdate }
            );
            logger.debug(`Page approved status for business (#${castrLocId}) stored to DB`);
            return {
                success: true,
                message: 'Page verification & Instagram setup successful',
                data: fbResponse,
            };
        } catch (err) {
            throw err;
        }
    }


    async getInstagrams(params) {
        const pageId = params.pageId;
        const accessToken = params.accessToken;
        const fields = ['id', 'username', 'followed_by_count'];
        const data = {
            access_token: accessToken,
            fields: fields.toString(),
        };
        try {
            logger.debug(`Fetching Instagram account(s) belonging to Page (#${pageId}) ...`);
            const promises = [
                fbRequest.get(pageId, 'instagram_accounts', data),
                fbRequest.get(pageId, 'page_backed_instagram_accounts', data)
            ];
            const fbResponses = await Promise.all(promises);
            const msg = 'Instagram account(s) fetched';
            logger.debug(msg);
            for (let i = 0; i < 2; i++) {
                const isPBIA = (i === 1);
                const instagram = fbResponses[i].data[0];
                if (instagram) {
                    instagram.isPBIA = isPBIA;
                    return {
                        success: true,
                        message: msg,
                        data: instagram,
                    };
                }
            }
            return {
                success: true,
                message: 'No Instagram account found, create new PBIA',
                data: {
                    id: null,
                    username: 'New Page-backed Instagram account',
                },
            };
        } catch (err) {
            throw err;
        }
    }

    async verifyPaymentMethod(params) {
        const castrLocId = params.castrLocId;
        let accountId;
        try {
            if (!params.accountId) {
                logger.debug('AccountId not provided, fetching it from DB...');
                const project = await ProjectModel.findOne({ castrLocId: castrLocId });
                accountId = project.accountId;
            } else {
                accountId = params.accountId;
            }
            const data = { fields: ['account_status', 'funding_source_details'].toString() };
            logger.debug(`Fetching FB funding source for Business (#${castrLocId}) ...`);
            const fbResponse = await fbRequest.get(accountId, null, data);
            if (!('account_status' in fbResponse)) { throw new Error('Something wrong with this response, implement handler'); }
            const response = {};
            if (!('funding_source_details' in fbResponse)) {
                response.success = false;
                response.message = `No funding source found for the adaccount owned by Business (#${castrLocId})`;
            } else if (fbResponse.account_status === 3) {
                response.success = false;
                response.message = `Unsettled adaccount owned by Business (#${castrLocId}), try another payment method`;
            } else if (fbResponse.account_status !== 1) {
                throw new Error(`Unexpected status_code (${fbResponse.account_status}), implement handler`);
            } else {
                response.success = true;
                response.message = `Funding source found for the adaccount owned by Business (#${castrLocId})`;
            }
            await ProjectModel.update(
                {
                    castrLocId: castrLocId,
                    accountId: accountId,
                },
                {
                    $set: {
                        accountStatus: (response.success) ? ProjectStatus.Active : ProjectStatus.Approved,
                        paymentMethod: fbResponse.funding_source_details.display_string,
                        paymentMethodVerified: response.success,
                    },
                }
            );
            logger.debug(response.message);
            response.data = fbResponse;
            return response;
        } catch (err) {
            throw err;
        }
    }

    async disintegrate(params) {
        const castrLocId = params.castrLocId;
        try {
            const project = await ProjectModel.findOne({ castrLocId: castrLocId });
            const disintegrate_params = {
                castrLocId: castrLocId,
                accountId: project.accountId,
                pageId: project.pageId,
            };
            const promises = [];
            logger.debug(`Disintegrating Business (#${castrLocId}) project`);
            if (project.accountStatus !== ProjectStatus.Disintegrated) { promises.push(this.disintegrateAccount(disintegrate_params)); }
            if (project.pageStatus !== ProjectStatus.Disintegrated) { promises.push(this.disintegratePage(disintegrate_params)); }
            await Promise.all(promises);
            const msg = `Business (#${castrLocId}) project disintegrated`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: {},
            };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new ProjectService();
