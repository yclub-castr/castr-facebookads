// app/facebookcast/preview/preview.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const CreativeModel = require('../creative/creative.model').Model;

class PreviewService {
    async getPreviews(params) {
        const castrBizId = params.castrBizId;
        const castrLocIds = params.castrLocIds;
        const promotionId = params.promotionId;
        const locale = params.locale;
        try {
            let creatives;
            if (promotionId) {
                logger.debug(`Fetching creatives by promotion id (#${promotionId}) ...`);
                creatives = await CreativeModel.find({
                    promotionId: promotionId,
                    castrLocId: { $in: castrLocIds },
                });
            } else if (castrBizId) {
                logger.debug(`Fetching creatives by business id (#${castrBizId}) ...`);
                creatives = await CreativeModel.find({ 
                    castrBizId: castrBizId,
                    castrLocId: { $in: castrLocIds },
                });
            }
            const previewPromises = creatives.map((creative) => {
                return new Promise(async (resolve, reject) => {
                    try {
                        logger.debug(`Fetching previews for creative (#${creative.id}) ...`);
                        const fbResponses = await Promise.all([
                            fbRequest.get(creative.id, 'previews', { ad_format: 'DESKTOP_FEED_STANDARD', locale: locale }),
                            fbRequest.get(creative.id, 'previews', { ad_format: 'MOBILE_FEED_STANDARD', locale: locale }),
                            fbRequest.get(creative.id, 'previews', { ad_format: 'INSTAGRAM_STANDARD', locale: locale }),
                            fbRequest.get(creative.id, 'previews', { ad_format: 'MOBILE_NATIVE', locale: locale })
                        ]);
                        resolve({
                            promotionId: creative.promotionId,
                            id: creative.id,
                            type: creative.name.match(/\[(.*)\]/)[1],
                            previews: [
                                {
                                    type: 'DESKTOP_FEED_STANDARD',
                                    data: fbResponses[0].data[0],
                                },
                                {
                                    type: 'MOBILE_FEED_STANDARD',
                                    data: fbResponses[1].data[0],
                                },
                                {
                                    type: 'INSTAGRAM_STANDARD',
                                    data: fbResponses[2].data[0],
                                },
                                {
                                    type: 'MOBILE_NATIVE',
                                    data: fbResponses[3].data[0],
                                }
                            ],
                        });
                    } catch (err) {
                        reject(err);
                    }
                });
            });
            const previews = await Promise.all(previewPromises);
            const msg = `Preview sets fetched for ${previews.length} creatives`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: previews,
            };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new PreviewService();
