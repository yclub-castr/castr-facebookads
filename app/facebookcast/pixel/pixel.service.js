// app/facebookcast/pixel/pixel.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const ProjectModel = require('../project/project.model').Model;
const Pixel = require('facebook-ads-sdk').AdsPixel;

const readFields = ['id', 'name', 'code'].toString();

class PixelService {
    async getPixel(params) {
        const castrBizId = params.castrBizId;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            let pixel = project.pixel;
            if (!pixel) {
                logger.debug(`No pixel saved for Business (#${castrBizId}), fetching from Facebook...`);
                const accountId = project.accountId;
                const fbResponse = await fbRequest.get(accountId, 'adspixels', { fields: readFields });
                if (fbResponse.data.length !== 0) {
                    pixel = fbResponse.data[0];
                    project.pixel = pixel;
                } else {
                    logger.debug(`No pixel found for Business (#${castrBizId}), creating new pixel...`);
                    pixel = await this.createPixel({
                        castrBizId: castrBizId,
                        accountId: accountId,
                    });
                    project.pixel = pixel;
                }
                project.save();
            }
            const msg = `Pixel (${pixel.id}) fetched`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: pixel,
            };
        } catch (err) {
            throw err;
        }
    }

    async createPixel(project) {
        try {
            const accountId = project.accountId;
            const name = `Castr pixel [biz#${project.castrBizId}]`;
            const pixelParams = {
                [Pixel.Field.name]: name,
                fields: readFields,
            };
            const pixel = await fbRequest.post(accountId, 'adspixels', pixelParams);
            logger.debug(`Pixel (#${pixel.id}) created for Business (${project.castrBizId})`);
            return pixel;
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new PixelService();
