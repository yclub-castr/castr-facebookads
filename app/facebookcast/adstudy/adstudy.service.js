// app/facebookcast/adstudy/adstudy.service.js

'use strict';

const logger = require('../../utils').logger();
const moment = require('../../utils').moment();
const fbRequest = require('../fbapi');
const AdStudyModel = require('../adstudy/adstudy.model').Model;
const AdSet = require('../adset/adset.model');

const AdSetModel = AdSet.Model;
const AdSetStatus = AdSet.Status;

class AdStudyService {
    async createAdStudy(params) {
        const castrBizId = params.castrBizId;
        const castrLocId = params.castrLocId;
        const promotionId = params.promotionId;
        const week = params.week || 1;
        const locationAdsets = {};
        try {
            let adsets;
            if (castrLocId) {
                adsets = await AdSetModel.find({
                    castrLocId: castrLocId,
                    promotionId: promotionId,
                    status: { $ne: AdSetStatus.deleted },
                });
            } else {
                adsets = await AdSetModel.find({
                    castrBizId: castrBizId,
                    promotionId: promotionId,
                    status: { $ne: AdSetStatus.deleted },
                });
            }
            adsets.forEach((adset) => {
                const locId = adset.castrLocId;
                if (locationAdsets[locId]) locationAdsets[locId].adsets.push(adset.toObject());
                else {
                    let end = adset.endTime;
                    if (!end) end = moment(adset.startTime).add(1, 'week');
                    locationAdsets[locId] = {
                        adsets: [adset.toObject()],
                        start: adset.startTime,
                        end: end,
                    };
                }
            });
            const castrLocIds = Object.keys(locationAdsets);
            const fbResponses = await Promise.all(castrLocIds.map((locId) => {
                const name = `Promotion split test (#${promotionId}) - Week ${week}`;
                const desc = `Biz#${castrBizId} | Loc#${locId} | Promo#${promotionId} | Week ${week}`;
                const cells = locationAdsets[locId].adsets.map(adset => ({
                    name: `${adset.name} (#${adset.id})`,
                    treatment_percentage: Math.floor(100 / locationAdsets[locId].adsets.length),
                    adsets: [adset.id],
                }));
                const start = Math.max(moment().add(30, 'second').unix(), moment(locationAdsets[locId].start).unix());
                const end = moment(locationAdsets[locId].end).unix();
                const splitTestParams = {
                    name: name,
                    description: desc,
                    start_time: start,
                    end_time: end,
                    type: 'SPLIT_TEST',
                    cells: cells,
                    fields: 'id,name,description,start_time,end_time,cells',
                };
                return fbRequest.post(process.env.CASTR_BUSINESS_ID, 'ad_studies', splitTestParams);
            }));
            const dbUpdates = fbResponses.map((resp) => {
                const locId = resp.description.match(/Loc#(\S*)/)[1];
                return AdStudyModel.updateOne(
                    { id: resp.id },
                    {
                        $setOnInsert: {
                            castrBizId: castrBizId,
                            castrLocId: locId,
                            promotionId: promotionId,
                            week: week,
                            id: resp.id,
                            name: resp.name,
                            description: resp.description,
                            cells: resp.cells.data.map(cell => ({
                                id: cell.id,
                                adsetId: cell.name.match(/AdSet.*\(#(\d+)\)/)[1],
                            })),
                            status: 'ACTIVE',
                            startTime: moment(resp.start_time).toDate(),
                            endTime: moment(resp.end_time).toDate(),
                        },
                    },
                    { upsert: true }
                );
            });
            const writeResult = await Promise.all(dbUpdates);
            return {
                success: true,
                message: null,
                data: fbResponses,
            };
        } catch (err) {
            throw err;
        }
    }

    async deleteAdStudy(params) {
        const adstudyId = params.adstudyId;
        const castrLocId = params.castrLocId;
        const promotionId = params.promotionId;
        const castrBizId = params.castrBizId;
        try {
            let dbUpdate;
            if (adstudyId) {
                const fbResponse = await fbRequest.delete(adstudyId);
                dbUpdate = AdStudyModel.updateOne(
                    { id: adstudyId },
                    { $set: { status: 'DELETED' } }
                );
            } else if (castrLocId) {
                const studies = await AdStudyModel.find({
                    castrLocId: castrLocId,
                    promotionId: promotionId,
                    status: { $ne: 'DELETED' },
                });
                const fbResponses = await Promise.all(studies.map(study => fbRequest.delete(study.id)));
                dbUpdate = AdStudyModel.updateMany(
                    {
                        castrLocId: castrLocId,
                        promotionId: promotionId,
                    },
                    { $set: { status: 'DELETED' } }
                );
            } else {
                const studies = await AdStudyModel.find({
                    castrBizId: castrBizId,
                    promotionId: promotionId,
                    status: { $ne: 'DELETED' },
                });
                const fbResponses = await Promise.all(studies.map(study => fbRequest.delete(study.id)));
                dbUpdate = AdStudyModel.updateMany(
                    {
                        castrBizId: castrBizId,
                        promotionId: promotionId,
                    },
                    { $set: { status: 'DELETED' } }
                );
            }
            const writeResult = await dbUpdate;
            return {
                success: true,
                message: `${writeResult.nModified} split tests deleted`,
                data: null,
            };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new AdStudyService();
