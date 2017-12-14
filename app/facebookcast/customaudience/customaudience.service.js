// app/facebookcast/customaudience/customaudience.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const CustomAudience = require('./customaudience.model');
const ProjectModel = require('../project/project.model').Model;

const CustomAudienceModel = CustomAudience.Model;
const CustomAudienceField = CustomAudience.Field;

const readFields = [
    CustomAudienceField.id,
    CustomAudienceField.name,
    CustomAudienceField.approximate_count,
    CustomAudienceField.rule,
    CustomAudienceField.subtype,
    CustomAudienceField.retention_days,
    CustomAudienceField.operation_status,
    CustomAudienceField.pixel_id,
    CustomAudienceField.prefill,
    CustomAudienceField.is_value_based,
    CustomAudienceField.description,
    CustomAudienceField.delivery_status,
    CustomAudienceField.data_source,
    CustomAudienceField.external_event_source,
    CustomAudienceField.time_content_updated
].toString();

class CustomAudienceService {
    async getCustomAudiences(params) {
        const castrBizId = params.castrBizId;
        let accountId = params.accountId;
        try {
            if (!accountId) {
                const project = await ProjectModel.findOne({ castrBizId: castrBizId });
                if (!project) throw new Error(`No such Business (#${castrBizId})`);
                accountId = project.accountId;
            }
            logger.debug(`Getting custom audiences for Business (#${castrBizId}) ...`);
            const fbResponse = await fbRequest.get(accountId, 'customaudiences', { fields: readFields });
            const audiences = { LOOKALIKE: [], CUSTOM: [] };
            fbResponse.data
                .sort((a, b) => b.approximate_count - a.approximate_count)
                .forEach((audience) => {
                    const type = (audience.subtype === 'LOOKALIKE') ? 'LOOKALIKE' : 'CUSTOM';
                    if (params.detail) {
                        audiences[type].push(audience);
                    } else {
                        audiences[type].push({
                            id: audience.id,
                            name: audience.name,
                            type: type,
                            subtype: audience.subtype,
                            approxSize: audience.approximate_count,
                            isDeliverable: audience.delivery_status.code === 200,
                        });
                    }
                });
            return {
                success: true,
                message: `${audiences.LOOKALIKE.length + audiences.CUSTOM.length} custom audiences fetched`,
                data: audiences,
            };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new CustomAudienceService();
