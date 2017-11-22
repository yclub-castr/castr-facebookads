// app/facebookcast/preview/preview.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const Creative = require('../creative/creative.model');

const CreativeModel = Creative.Model;
const CreativeStatus = Creative.Status;

const adFormats = {
    fbDesktop: 'DESKTOP_FEED_STANDARD',
    fbMobile: 'MOBILE_FEED_STANDARD',
    instagram: 'INSTAGRAM_STANDARD',
    nativeMobile: 'MOBILE_NATIVE',
};

const formatSizes = {
    DESKTOP_FEED_STANDARD: {
        SINGLE_IMAGE: [520, 520],
        CAROUSEL: [520, 560],
        SINGLE_VIDEO: [520, 600],
        SLIDESHOW: [520, 800],
    },
    MOBILE_FEED_STANDARD: {
        SINGLE_IMAGE: [340, 620],
        CAROUSEL: [340, 620],
        SINGLE_VIDEO: [340, 620],
        SLIDESHOW: [340, 620],
    },
    INSTAGRAM_STANDARD: {
        // SINGLE_IMAGE: [,],
        // CAROUSEL: [,],
        // SINGLE_VIDEO: [,],
        // SLIDESHOW: [,],
    },
    MOBILE_NATIVE: {
        // SINGLE_IMAGE: [,],
        // CAROUSEL: [,],
        // SINGLE_VIDEO: [,],
        // SLIDESHOW: [,],
    },
};

class PreviewService {
    resizePreview(iframe, format, type) {
        if (formatSizes[format][type]) {
            const size = formatSizes[format][type];
            let resized = iframe.replace(/width="[\d]+"/, `width=${size[0]}`);
            resized = resized.replace(/height="[\d]+"/, `height=${size[1]}`);
            return resized;
        }
        return iframe;
    }

    async getPreviews(params) {
        const castrBizId = params.castrBizId;
        let castrLocIds = [];
        let promotionIds = [];
        const platform = params.platform;
        const locale = params.locale;
        try {
            logger.debug(`Fetching creatives for Business (#${castrBizId}) ...`);
            const query = {
                castrBizId: castrBizId,
                status: { $ne: CreativeStatus.deleted },
            };
            if (params.castrLocIds) {
                castrLocIds = params.castrLocIds.split(',');
                query.castrLocId = { $in: castrLocIds };
            }
            if (params.promotionIds) {
                promotionIds = params.promotionIds.split(',');
                query.promotionId = { $in: promotionIds };
            }
            let formats;
            if (platform === 'facebook') {
                formats = [adFormats.fbDesktop, adFormats.fbMobile];
            } else if (platform === 'instagram') {
                formats = [adFormats.instagram];
            } else {
                formats = Object.values(adFormats);
            }
            const creatives = await CreativeModel.find(query);
            const previewPromises = creatives.map((creative) => { // eslint-disable-line arrow-body-style
                if (!castrLocIds.includes(creative.castrLocId)) castrLocIds.push(creative.castrLocId);
                if (!promotionIds.includes(creative.promotionId)) promotionIds.push(creative.promotionId);
                return new Promise(async (resolve, reject) => {
                    try {
                        logger.debug(`Fetching previews for creative (#${creative.id}) ...`);
                        const previews = {};
                        const requests = formats.map((format) => {
                            const previewParam = {
                                ad_format: format,
                                locale: locale,
                                width: 520,
                            };
                            return fbRequest.get(creative.id, 'previews', previewParam)
                                .then((fbResponse) => {
                                    previews[format] = fbResponse.data[0].body;
                                });
                        });
                        const fbResponses = await Promise.all(requests);
                        const type = creative.name.match(/\[(.*)\]/)[1]
                        resolve({
                            promotionId: creative.promotionId,
                            castrLocId: creative.castrLocId,
                            type: type,
                            previews: formats.map(format => ({
                                type: format,
                                iframe: this.resizePreview(previews[format], format, type),
                            })),
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
