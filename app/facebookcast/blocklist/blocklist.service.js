// app/facebookcast/blocklist/blocklist.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const ProjectModel = require('../project/project.model').Model;

class BlocklistService {
    async getBlocklist(params) {
        const castrBizId = params.castrBizId;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            const accountId = project.accountId;
            logger.debug(`Getting blocklists for Business (#${castrBizId})...`);
            const fbResponse = await fbRequest.get(accountId, 'publisher_block_lists');
            const allBlocklists = fbResponse.data;
            return {
                success: true,
                message: `${allBlocklists.length} blocklists fetched`,
                data: allBlocklists.map(bl => ({
                    id: bl.id,
                    name: bl.name,
                })),
            };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new BlocklistService();
