// app/facebookcast/preview/preview.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const Creative = require('../creative/creative.model');

const CreativeModel = Creative.Model;
const CreativeStatus = Creative.Status;

class PreviewService {
    async getPreviews(params) {
        const castrBizId = params.castrBizId;
        const castrLocIds = params.castrLocIds;
        const promotionIds = params.promotionIds;
        const locale = params.locale;
        try {
            logger.debug(`Fetching creatives for Business (#${castrBizId}) ...`);
            const creatives = await CreativeModel.find({
                castrBizId: castrBizId,
                castrLocId: { $in: castrLocIds },
                promotionId: { $in: promotionIds },
                status: { $ne: CreativeStatus.deleted },
            });
            const previewPromises = creatives.map((creative) => { // eslint-disable-line arrow-body-style
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
                            castrLocId: creative.castrLocId,
                            // id: creative.id,
                            type: creative.name.match(/\[(.*)\]/)[1],
                            previews: [
                                {
                                    type: 'DESKTOP_FEED_STANDARD',
                                    iframe: fbResponses[0].data[0].body,
                                },
                                {
                                    type: 'MOBILE_FEED_STANDARD',
                                    iframe: fbResponses[1].data[0].body,
                                },
                                {
                                    type: 'INSTAGRAM_STANDARD',
                                    iframe: fbResponses[2].data[0].body,
                                },
                                {
                                    type: 'MOBILE_NATIVE',
                                    iframe: fbResponses[3].data[0].body,
                                }
                            ],
                        });
                    } catch (err) {
                        reject(err);
                    }
                });
            });
            const previews = await Promise.all(previewPromises);
            logger.debug(`${previews.length} fetched, formatting response...`);
            const formattedResponse = {};
            previews.forEach((preview) => {
                const data = {
                    type: preview.type,
                    previews: preview.previews,
                };
                if (formattedResponse.hasOwnProperty(preview.castrLocId)) {
                    const locGroup = formattedResponse[preview.castrLocId];
                    if (locGroup.hasOwnProperty(preview.promotionId)) {
                        locGroup[preview.promotionId].push(data);
                    } else {
                        locGroup[preview.promotionId] = [data];
                    }
                } else {
                    formattedResponse[preview.castrLocId] = { [preview.promotionId]: [data] };
                }
            });
            const msg = `Preview sets fetched for Business (${castrBizId}), Locations [${castrLocIds}] & Promotions [${promotionIds}]`;
            logger.debug(msg);
            return {
                success: true,
                message: msg,
                data: formattedResponse,
            };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new PreviewService();
