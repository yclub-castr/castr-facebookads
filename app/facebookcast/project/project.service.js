// app/facebookcast/project/project.service.js

'use strict';

const logger = require('../../utils').logger();
const timezone = require('../../constants').timezone;
const fbRequest = require('../fbapi');
const Model = require('./project.model');

const ProjectModel = Model.Model;
const ProjectStatus = Model.Status;

const accessType = process.env.ACCESS_TYPE;
const accountRoles = process.env.ACCOUNT_ROLES.split(',');
const pageRoles = process.env.PAGE_ROLES.split(',');

class ProjectService {
    async getProject(params) {
        const castrBizId = params.castrBizId;
        try {
            const project = await ProjectModel.findOne({
                castrBizId: castrBizId,
                accountStatus: { $ne: ProjectStatus.Disintegrated },
                // $and: [
                // { accountStatus: { $ne: ProjectStatus.Disintegrated } },
                // { pageStatus: { $ne: ProjectStatus.Disintegrated } }
                // ]
            });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            const msg = `Business (#${castrBizId}) project fetched`;
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
        const castrBizId = params.castrBizId;
        const accountId = params.accountId;
        const accountName = params.accountName;
        const data = {
            adaccount_id: accountId,
            access_type: accessType,
            permitted_roles: accountRoles,
        };
        try {
            logger.debug(`Requesting access to adaccount (#${accountId}) owned by Business (#${castrBizId}) ...`);
            const fbResponse = await fbRequest.post(process.env.CASTR_BUSINESS_ID, 'client_ad_accounts', data);
            logger.debug(`Adaccount request sent to Business (#${castrBizId})`);
            await ProjectModel.update(
                { castrBizId: castrBizId },
                {
                    $setOnInsert: { castrBizId: castrBizId },
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
            logger.debug(`Pending status for business (#${castrBizId}) stored to DB`);
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
        const castrBizId = params.castrBizId;
        let accountId;
        try {
            if (!params.accountId) {
                logger.debug('AccountId not provided, fetching it from DB...');
                const project = await ProjectModel.findOne({ castrBizId: castrBizId });
                if (!project) throw new Error(`No such Business (#${castrBizId})`);
                accountId = project.accountId;
            } else {
                accountId = params.accountId;
            }
            let fbResponse = null;
            if (accountId) {
                const data = { adaccount_id: accountId };
                logger.debug(`Disintegrating adaccount owned by Business (#${castrBizId}) ...`);
                fbResponse = await fbRequest.delete(process.env.CASTR_BUSINESS_ID, 'adaccounts', data);
                logger.debug(`Disintegrated Business (#${castrBizId}) adaccount`);
            }
            await ProjectModel.update(
                {
                    castrBizId: castrBizId,
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
            logger.debug(`Disintegrated status for business (#${castrBizId}) stored to DB`);
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
        const castrBizId = params.castrBizId;
        let accountId;
        try {
            if (!params.accountId) {
                logger.debug('AccountId not provided, fetching it from DB...');
                const project = await ProjectModel.findOne({ castrBizId: castrBizId });
                if (!project) throw new Error(`No such Business (#${castrBizId})`);
                accountId = project.accountId;
            } else {
                accountId = params.accountId;
            }
            const data = {
                business: process.env.CASTR_BUSINESS_ID,
                user: process.env.ADMIN_SYS_USER_ID,
                role: process.env.ACCOUNT_ROLES.split(',')[0],
            };
            logger.debug(`Assigning system user to adaccount owned by Business (#${castrBizId}) ...`);
            logger.debug(`Creating adlabel for adaccount owned by Business (#${castrBizId}) ...`);
            const promises = [
                fbRequest.post(accountId, 'assigned_users', data, true),
                fbRequest.post(accountId, 'adlabels', { name: castrBizId, fields: 'name' }, true),
                fbRequest.get(accountId, null, { fields: 'timezone_id, currency' })
            ];
            const fbResponses = await Promise.all(promises);
            const adlabel = fbResponses[1];
            const momentTzId = timezone(fbResponses[2].timezone_id);
            const currency = fbResponses[2].currency;
            logger.debug(`System user assigned to Business (#${castrBizId}) adaccount`);
            logger.debug(`Adlabel created for Business (#${castrBizId})`);
            await ProjectModel.update(
                {
                    castrBizId: castrBizId,
                    accountId: accountId,
                },
                {
                    $set: {
                        accountStatus: ProjectStatus.Approved,
                        accountVerified: true,
                        'adLabels.businessLabel': adlabel,
                        timezone: momentTzId,
                        currency: currency,
                    },
                }
            );
            logger.debug(`Account approved status for business (#${castrBizId}) stored to DB`);
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
        const fields = ['id', 'name', 'access_token'];
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
        const castrBizId = params.castrBizId;
        const pageId = params.pageId;
        const pageName = params.pageName;
        const data = {
            page_id: pageId,
            access_type: accessType,
            permitted_roles: pageRoles,
        };
        try {
            logger.debug(`Requesting access to page (#${pageId}) owned by Business (#${castrBizId}) ...`);
            const fbResponse = await fbRequest.post(process.env.CASTR_BUSINESS_ID, 'client_pages', data);
            logger.debug(`Page request sent to Business (#${castrBizId})`);
            await ProjectModel.update(
                { castrBizId: castrBizId },
                {
                    $setOnInsert: { castrBizId: castrBizId },
                    $set: {
                        pageId: pageId,
                        pageName: pageName,
                        pageStatus: ProjectStatus.Pending,
                        pageVerified: false,
                    },
                },
                { upsert: true }
            );
            logger.debug(`Pending status for business (#${castrBizId}) stored to DB`);
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
        const castrBizId = params.castrBizId;
        let pageId;
        try {
            if (!params.pageId) {
                logger.debug('PageId not provided, fetching it from DB...');
                const project = await ProjectModel.findOne({ castrBizId: castrBizId });
                if (!project) throw new Error(`No such Business (#${castrBizId})`);
                pageId = project.pageId;
            } else {
                pageId = params.pageId;
            }
            if (pageId === process.env.CASTR_PRIMARY_PAGE_ID) throw new Error('Cannot disintegrate Castr primary page');
            let fbResponse = null;
            if (pageId) {
                const data = { page_id: pageId };
                logger.debug(`Disintegrating page owned by Business (#${castrBizId}) ...`);
                fbResponse = await fbRequest.delete(process.env.CASTR_BUSINESS_ID, 'pages', data);
                logger.debug(`Disintegrated Business (#${castrBizId}) page`);
            }
            await ProjectModel.update(
                {
                    castrBizId: castrBizId,
                    pageId: pageId,
                },
                {
                    $set: {
                        pageStatus: ProjectStatus.Disintegrated,
                        pageVerified: false,
                    },
                }
            );
            logger.debug(`Disintegrated status for business (#${castrBizId}) stored to DB`);
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
        const castrBizId = params.castrBizId;
        const pageAccessToken = params.pageAccessToken;
        let pageId;
        try {
            if (!params.pageId) {
                logger.debug('PageId not provided, fetching it from DB...');
                const project = await ProjectModel.findOne({ castrBizId: castrBizId });
                if (!project) throw new Error(`No such Business (#${castrBizId})`);
                pageId = project.pageId;
            } else {
                pageId = params.pageId;
            }
            const pageRequestData = {
                user: process.env.ADMIN_SYS_USER_ID,
                role: process.env.PAGE_ROLES.split(',')[0],
                access_token: pageAccessToken,
            };
            logger.debug(`Assigning system user to page owned by Business (#${castrBizId}) ...`);
            const fbResponse = await fbRequest.post(pageId, 'assigned_users', pageRequestData);
            logger.debug(`System user assigned to Business (#${castrBizId}) page`);
            const dbUpdate = {
                pageStatus: ProjectStatus.Approved,
                pageVerified: true,
            };
            logger.debug(`Fetching Instagram account(s) belonging to Business (#${castrBizId}) page...`);
            const instagramRequestData = {
                fields: ['id', 'username'].toString(),
                access_token: pageAccessToken,
            };
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
                logger.debug(`New PBIA created for Business (#${castrBizId}) page`);
                dbUpdate.instagramId = instagram.id;
                dbUpdate.instagramName = instagram.username;
                dbUpdate.isPBIA = true;
            }
            await ProjectModel.update(
                {
                    castrBizId: castrBizId,
                    pageId: pageId,
                },
                { $set: dbUpdate }
            );
            logger.debug(`Page approved status for business (#${castrBizId}) stored to DB`);
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
        const pageAccessToken = params.pageAccessToken;
        const fields = ['id', 'username', 'followed_by_count'];
        const data = {
            access_token: pageAccessToken,
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
        const castrBizId = params.castrBizId;
        let accountId;
        try {
            if (!params.accountId) {
                logger.debug('AccountId not provided, fetching it from DB...');
                const project = await ProjectModel.findOne({ castrBizId: castrBizId });
                if (!project) throw new Error(`No such Business (#${castrBizId})`);
                accountId = project.accountId;
            } else {
                accountId = params.accountId;
            }
            const data = { fields: ['account_status', 'funding_source_details'].toString() };
            logger.debug(`Fetching FB funding source for Business (#${castrBizId}) ...`);
            const fbResponse = await fbRequest.get(accountId, null, data);
            if (!('account_status' in fbResponse)) { throw new Error('Something wrong with this response, implement handler'); }
            const response = {};
            if (!('funding_source_details' in fbResponse)) {
                response.success = false;
                response.message = `No funding source found for the adaccount owned by Business (#${castrBizId})`;
            } else if (fbResponse.account_status === 3) {
                response.success = false;
                response.message = `Unsettled adaccount owned by Business (#${castrBizId}), try another payment method`;
            } else if (fbResponse.account_status !== 1) {
                throw new Error(`Unexpected status_code (${fbResponse.account_status}), implement handler`);
            } else {
                response.success = true;
                response.message = `Funding source found for the adaccount owned by Business (#${castrBizId})`;
            }
            if (response.success) {
                await ProjectModel.update(
                    {
                        castrBizId: castrBizId,
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
            }
            response.data = fbResponse;
            return response;
        } catch (err) {
            throw err;
        }
    }

    async disintegrate(params) {
        const castrBizId = params.castrBizId;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            const disintegrate_params = {
                castrBizId: castrBizId,
                accountId: project.accountId,
                pageId: project.pageId,
            };
            const promises = [];
            logger.debug(`Disintegrating Business (#${castrBizId}) project`);
            if (project.accountStatus !== ProjectStatus.Disintegrated) { promises.push(this.disintegrateAccount(disintegrate_params)); }
            if (project.pageStatus !== ProjectStatus.Disintegrated) { promises.push(this.disintegratePage(disintegrate_params)); }
            await Promise.all(promises);
            const msg = `Business (#${castrBizId}) project disintegrated`;
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

    async newPromotion(params) {
        const castrBizId = params.castrBizId;
        const castrLocIds = params.castrLocIds;
        const promotionId = params.promotionId;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            if ([ProjectStatus.Disintegrated, ProjectStatus.Pending].includes(project.accountStatus)) {
                throw new Error(`Business (#${castrBizId}) does not have integration with Facebook`);
            }
            if (project.accountStatus !== ProjectStatus.Active) {
                throw new Error(`Business (#${castrBizId}) has not verified payment method on Facebook`);
            }
            if (project.adLabels.promotionLabels.map(label => label.name).includes(promotionId)) {
                throw new Error(`Duplicate promotionId [${promotionId}] requested for Business (#${castrBizId})`);
            }
            const accountId = project.accountId;
            logger.debug('Creating new promotion & location adlabels...');
            const locLabelPromises = castrLocIds.map(locId => fbRequest.post(accountId, 'adlabels', { name: locId, fields: 'name' }));
            const promotionLabel = await fbRequest.post(accountId, 'adlabels', { name: promotionId, fields: 'name' });
            project.adLabels.promotionLabels.push(promotionLabel);
            const locationLabels = await Promise.all(locLabelPromises);
            const existingLocs = project.adLabels.locationLabels.map(locLabel => locLabel.name);
            for (let i = 0; i < locationLabels.length; i++) {
                if (existingLocs.includes(locationLabels[i].name)) continue; // eslint-disable-line no-continue
                project.adLabels.locationLabels.push(locationLabels[i]);
            }
            await project.save();
            const msg = 'Promotion & locations adlabels created & stored in DB';
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: project.adLabels.toObject(),
            };
        } catch (err) {
            throw err;
        }
    }

    async removePromotion(params) {
        const castrBizId = params.castrBizId;
        const promotionId = params.promotionId;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            const promotionLabel = project.adLabels.promotionLabels.filter(label => label.name === promotionId)[0];
            logger.debug('Deleting promotion adlabel...');
            if (!promotionLabel) {
                throw new Error(`No such Promotion (#${promotionId}) exists`);
            }
            const fbResponse = await fbRequest.delete(promotionLabel.id);
            if (!fbResponse.success) {
                throw new Error('Failed to delete promotion adlabel from Facebook');
            }
            await ProjectModel.updateOne(
                { castrBizId: castrBizId },
                { $pull: { 'adLabels.promotionLabels': { name: promotionId } } },
                { multi: true }
            );
            const msg = `Promotion (#${promotionId}) adlabel deleted & removed from DB`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: null,
            };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new ProjectService();
