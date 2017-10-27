// app/facebookcast/pixel/pixel.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const ProjectModel = require('../project/project.model').Model;
const Pixel = require('facebook-ads-sdk').AdsPixel;

const readFields = ['id', 'name', 'code'].toString();

class PixelService {
    async getPixel(params) {
        let accountId = params.accountId;
        try {
            if (!params.castrLocId) throw new Error('Missing param: must provide `castrLocId`');
            const castrLocId = params.castrLocId;
            if (!accountId) {
                const project = await ProjectModel.findOne({ castrLocId: castrLocId });
                accountId = project.accountId;
            }
            const fbResponse = await fbRequest.get(accountId, 'adspixels', { fields: readFields });
            let pixel;
            if (fbResponse.data) {
                pixel = fbResponse.data[0];
            } else {
                logger.debug(`No pixel found for Business (#${castrLocId}), creating new pixel...`);
                pixel = await this.createPixel(accountId);
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
            const name = `Castr pixel [biz#${project.castrLocId}]`;
            const pixelParams = {
                [Pixel.Field.name]: name,
                fields: readFields,
            };
            const pixel = await fbRequest.post(accountId, 'adspixels', pixelParams);
            logger.debug(`Pixel (#${pixel.id}) created for Business (${project.castrLocId})`);
            return pixel;
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new PixelService();
