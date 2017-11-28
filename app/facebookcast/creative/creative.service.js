// app/facebookcast/creative/creative.service.js

'use strict';

const logger = require('../../utils').logger();
const fbRequest = require('../fbapi');
const request = require('request-promise');
const fs = require('fs');
const Model = require('./creative.model');
const ProjectModel = require('../project/project.model').Model;

const CreativeModel = Model.Model;
const CreativeField = Model.Field;
const CallToActionType = Model.CallToActionType;
const CreativeStatus = Model.Status;

const readFields = [
    CreativeField.account_id,
    CreativeField.id,
    CreativeField.name,
    CreativeField.status,
    CreativeField.body,
    CreativeField.title,
    CreativeField.call_to_action_type,
    CreativeField.effective_object_story_id,
    CreativeField.object_story_spec,
    CreativeField.object_type
].toString();

const tempDir = '../../temp/';

class CreativeService {
    async getCreatives(params) {
        const castrBizId = params.castrBizId;
        const castrLocId = params.castrLocId;
        const promotionId = params.promotionId;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            const creativeParams = { fields: readFields };
            let creatives = [];
            let fbResponse;
            if (promotionId) {
                logger.debug(`Fetching creatives by promotion id (#${promotionId}) ...`);
                const promotionLabel = project.adLabels.promotionLabels.filter(label => label.name === promotionId)[0];
                if (!promotionLabel) throw new Error(`No such Promotion (#${promotionId})`);
                do {
                    if (fbResponse) {
                        fbResponse = await request.get(fbResponse.paging.next, { json: true });
                    } else {
                        fbResponse = await fbRequest.get(promotionLabel.id, 'adcreatives', creativeParams);
                    }
                    const notDeleted = fbResponse.data.filter(creative => creative.status !== CreativeStatus.deleted);
                    creatives = creatives.concat(notDeleted);
                } while (fbResponse.paging.next);
            } else if (castrBizId) {
                logger.debug(`Fetching creatives by business id (#${castrBizId}) ...`);
                const businessLabel = project.adLabels.businessLabel;
                do {
                    if (fbResponse) {
                        fbResponse = await request.get(fbResponse.paging.next, { json: true });
                    } else {
                        fbResponse = await fbRequest.get(businessLabel.id, 'adcreatives', creativeParams);
                    }
                    const notDeleted = fbResponse.data.filter(creative => creative.status !== CreativeStatus.deleted);
                    creatives = creatives.concat(notDeleted);
                } while (fbResponse.paging.next);
            }
            const msg = `${creatives.length} creatives fetched`;
            logger.debug(msg);
            this.syncCreatives(creatives, castrBizId, promotionId);
            return {
                success: true,
                message: msg,
                data: creatives,
            };
        } catch (err) {
            throw err;
        }
    }

    async createCreative(params) {
        const castrBizId = params.castrBizId;
        const castrLocId = params.castrLocId;
        const promotionId = params.promotionId;
        const creativeParams = params.params;
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            if (!project) throw new Error(`No such Business (#${castrBizId})`);
            const accountId = project.accountId;
            const businessLabel = project.adLabels.businessLabel;
            const locationLabel = project.adLabels.locationLabels.filter(label => label.name === castrLocId)[0];
            const promotionLabel = project.adLabels.promotionLabels.filter(label => label.name === promotionId)[0];
            const projectParams = {
                accountId: accountId,
                pageId: project.pageId,
                instagramId: project.instagramId,
                adLabels: [businessLabel, locationLabel, promotionLabel],
            };
            const adSpecPromises = [
                this.getCarouselAdCreative(projectParams, creativeParams),
                this.getVideoAdCreative(projectParams, creativeParams),
                this.getSlideshowAdCreative(projectParams, creativeParams)
            ];
            let adSpecs = await Promise.all(adSpecPromises);
            adSpecs = adSpecs.concat(await this.getLinkAdCreative(projectParams, creativeParams));
            logger.debug('Creating adlabels for creatives...');
            adSpecs = adSpecs.filter(spec => spec !== null);
            const labelPromises = adSpecs.map(spec => fbRequest.post(accountId, 'adlabels', {
                name: `${promotionId}-${castrLocId}-${spec.name}`,
            }));
            const creativeLabels = await Promise.all(labelPromises);
            logger.debug(`Creating creative for promotion (#${promotionId}) ...`);
            const createPromises = adSpecs.map(spec => fbRequest.post(accountId, 'adcreatives', spec));
            const creatives = await Promise.all(createPromises);
            // TODO: handle errors
            const msg = `${creatives.length} creatives created`;
            logger.debug(msg);
            const responseData = [];
            const updatePromises = [];
            for (let i = 0; i < creatives.length; i++) {
                const creative = creatives[i];
                const model = new CreativeModel({
                    castrBizId: castrBizId,
                    castrLocId: castrLocId,
                    promotionId: promotionId,
                    accountId: creative.account_id,
                    id: creative.id,
                    name: adSpecs[i].name,
                    status: creative.status,
                    body: creative.body,
                    title: creative.title,
                    callToActionType: creative.call_to_action_type,
                    effectiveObjectStoryId: creative.effective_object_story_id,
                    objectStorySpec: creative.object_story_spec,
                    objectType: creative.object_type,
                    creativeLabel: {
                        id: creativeLabels[i].id,
                        name: `${promotionId}-${castrLocId}-${adSpecs[i].name}`,
                    },
                });
                updatePromises.push(model.save());
                responseData.push({
                    id: creative.id,
                    name: adSpecs[i].name,
                    adLabelName: `${promotionId}-${castrLocId}-${adSpecs[i].name}`,
                });
            }
            await Promise.all(updatePromises);
            logger.debug(`${creatives.length} creatives stored to DB`);
            return {
                success: true,
                message: msg,
                data: {
                    castrBizId: castrBizId,
                    castrLocId: castrLocId,
                    promotionId: promotionId,
                    creatives: responseData,
                },
            };
        } catch (err) {
            throw err;
        }
    }

    async deleteCreatives(params) {
        const castrBizId = params.castrBizId;
        const promotionId = params.promotionId;
        let creativeIds = params.creativeIds;
        try {
            let creatives;
            if (!creativeIds) {
                logger.debug('Fetching creatives for deletion...');
                creatives = await CreativeModel.find({
                    castrBizId: castrBizId,
                    promotionId: promotionId,
                    [CreativeField.status]: { $ne: CreativeStatus.deleted },
                }, 'id creativeLabel');
                creativeIds = creatives.map(creative => creative.id);
            }
            let batchCompleted = false;
            const requests = [];
            for (let i = 0; i < creatives.length; i++) {
                const id = creatives[i].id;
                const creativeLabelId = creatives[i].creativeLabel.id;
                requests.push({
                    method: 'DELETE',
                    relative_url: `${fbRequest.apiVersion}/${id}`,
                });
                requests.push({
                    method: 'DELETE',
                    relative_url: `${fbRequest.apiVersion}/${creativeLabelId}`,
                });
            }
            let attempts = 3;
            let batchResponses;
            do {
                const batches = [];
                logger.debug(`Batching ${creatives.length} delete creative requests...`);
                for (let i = 0; i < Math.ceil(requests.length / 50); i++) {
                    batches.push(fbRequest.batch(requests.slice(i * 50, (i * 50) + 50)));
                }
                batchResponses = await Promise.all(batches);
                batchCompleted = true;
                for (let i = 0; i < batchResponses.length; i++) {
                    const fbResponses = batchResponses[i];
                    for (let j = 0; j < fbResponses.length; j++) {
                        if (fbResponses[i].code !== 200) {
                            logger.error(fbResponses[i].error);
                            logger.debug('One of batch requests failed, trying again...');
                            batchCompleted = false;
                            break;
                        }
                    }
                }
                attempts -= 1;
            } while (!batchCompleted && attempts !== 0);
            if (!batchCompleted) {
                return {
                    success: false,
                    message: 'Batch requests failed 3 times',
                    data: batchResponses,
                };
            }
            logger.debug('FB batch-delete successful');
            const writeResult = await CreativeModel.updateMany(
                { id: { $in: creativeIds } },
                { $set: { status: CreativeStatus.deleted } }
            );
            const msg = `${writeResult.nModified} creatives deleted`;
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

    async syncCreatives(creatives, castrBizId, promotionId) {
        const promises = [];
        creatives.forEach((creative) => {
            const update = {
                accountId: creative.account_id,
                id: creative.id,
                name: creative.name,
                status: creative.status,
                objectStorySpec: creative.object_story_spec,
            };
            if (castrBizId) update.castrBizId = castrBizId;
            if (promotionId) update.promotionId = promotionId;
            promises.push(CreativeModel.updateOne(
                { id: creative.id },
                { $set: update },
                { upsert: true }
            ));
        });
        await Promise.all(promises);
        logger.debug(`Synchronized ${creatives.length} creatives`);
    }

    async getLinkAdCreative(projectParams, creativeParams) {
        logger.debug('Creating Single-Image ad creative...');
        const name = '[SINGLE_IMAGE]';
        const postText = creativeParams.promoDesc;
        const attchTitle = creativeParams.locName;
        const attchDesc = creativeParams.locDescShort;
        const imageUrls = creativeParams.promoImages.map(img => img['1x191']);
        const destinationUrl = creativeParams.link;
        // const welcomeMsg = 'WELCOME';
        const callToAction = {
            type: CallToActionType.learn_more,
            value: {
                link: destinationUrl,
                link_caption: destinationUrl,
            },
        };
        const photoData = {
            caption: postText, // post text
            url: imageUrls[0],
            // page_welcome_message: welcomeMsg, // for messenger
        };
        const linkAdCreativeParams = imageUrls.map((imageUrl) => {
            const objectStorySpec = {
                link_data: {
                    message: postText, // post text
                    name: attchTitle, // attachment name
                    description: attchDesc, // attachment description
                    caption: destinationUrl, // displayed url
                    call_to_action: callToAction, // CTA button
                    // image_crops: {},
                    picture: imageUrl,
                    link: destinationUrl,
                    // page_welcome_message: welcomeMsg, // for messenger
                },
                page_id: projectParams.pageId,
                instagram_actor_id: projectParams.instagramId,
            };
            return {
                name: name,
                [CreativeField.adlabels]: projectParams.adLabels,
                object_story_spec: objectStorySpec,
                fields: readFields,
            };
        });
        return linkAdCreativeParams;
    }

    async getCarouselAdCreative(projectParams, creativeParams) {
        logger.debug('Creating Carousel ad creative...');
        const name = '[CAROUSEL]';
        const postText = creativeParams.promoDesc;
        const attchTitles = [];
        const attchDescs = [];
        const destinationUrls = [];
        const imageUrls = creativeParams.promoImages.map(img => img['1x1']);
        const callToActions = [];
        for (let i = 0; i < imageUrls.length; i++) {
            attchTitles.push(creativeParams.locName);
            attchDescs.push(creativeParams.promoTitle);
            destinationUrls.push(creativeParams.link);
            callToActions.push({
                type: CallToActionType.learn_more,
                value: {
                    link: creativeParams.link,
                    link_caption: creativeParams.link,
                },
            });
        }
        // const welcomeMsg = 'WELCOME';
        // const endCardUrl = 'https://plnkr.co';
        const objectStorySpec = {
            link_data: {
                message: postText, // post text
                child_attachments: [],
                // page_welcome_message: welcomeMsg, // for messenger
                // caption: endCardUrl, // end card display url
                link: creativeParams.link, // end card destination url
                multi_share_end_card: false,
                multi_share_optimized: true,
            },
            page_id: projectParams.pageId,
            instagram_actor_id: projectParams.instagramId,
        };
        for (let i = 0; i < imageUrls.length; i++) {
            objectStorySpec.link_data.child_attachments.push({
                name: attchTitles[i],
                description: attchDescs[i],
                call_to_action: callToActions[i],
                caption: destinationUrls[i],
                // image_crops: {},
                picture: imageUrls[i],
                link: destinationUrls[i],
            });
        }
        return {
            name: name,
            [CreativeField.adlabels]: projectParams.adLabels,
            object_story_spec: objectStorySpec,
            fields: readFields,
        };
    }

    async getVideoAdCreative(projectParams, creativeParams) {
        logger.debug('Creating Single-Video ad creative...');
        try {
            const name = '[SINGLE_VIDEO]';
            const postText = creativeParams.promoDesc;
            const attchTitle = creativeParams.promoTitle;
            const attchDesc = creativeParams.locDescShort;
            const videoUrl = creativeParams.promoVideo.url;
            const thumbnail = creativeParams.promoVideo.thumbnail;
            const destinationUrl = creativeParams.link;
            // const welcomeMsg = 'WELCOME';
            const callToAction = {
                type: CallToActionType.learn_more,
                value: {
                    link: destinationUrl, // destination URL
                    link_caption: destinationUrl, // display URL
                },
            };
            const video = await this.uploadVideo(projectParams.accountId, videoUrl);
            const objectStorySpec = {
                video_data: {
                    message: postText, // post text
                    title: attchTitle, // attachment name
                    link_description: attchDesc, // attachment description
                    video_id: video.id,
                    image_url: thumbnail, // thumbnail
                    call_to_action: callToAction, // CTA button
                    // page_welcome_message: welcomeMsg, // for messenger
                },
                page_id: projectParams.pageId,
                instagram_actor_id: projectParams.instagramId,
            };
            return {
                name: name,
                [CreativeField.adlabels]: projectParams.adLabels,
                object_story_spec: objectStorySpec,
                fields: readFields,
            };
        } catch (err) {
            logger.error(err.message);
            return null;
        }
    }

    async getSlideshowAdCreative(projectParams, creativeParams) {
        logger.debug('Creating Slideshow ad creative...');
        try {
            const name = '[SLIDESHOW]';
            const postText = creativeParams.promoDesc;
            const attchTitle = creativeParams.promoTitle;
            const attchDesc = creativeParams.locDescShort;
            const imageUrls = creativeParams.promoImages.map(img => img['1x1']);
            const thumbnail = imageUrls[0];
            const destinationUrl = creativeParams.link;
            // const welcomeMsg = 'WELCOME';
            const callToAction = {
                type: CallToActionType.learn_more,
                value: {
                    link: destinationUrl, // destination URL
                    link_caption: destinationUrl, // display URL
                },
            };
            const video = await this.uploadSlideshow(projectParams.accountId, imageUrls);
            const objectStorySpec = {
                video_data: {
                    message: postText, // post text
                    title: attchTitle, // attachment name
                    link_description: attchDesc, // attachment description
                    video_id: video.id,
                    image_url: thumbnail, // thumbnail
                    call_to_action: callToAction, // CTA button
                    // page_welcome_message: welcomeMsg, // for messenger
                },
                page_id: projectParams.pageId,
                instagram_actor_id: projectParams.instagramId,
            };
            return {
                name: name,
                [CreativeField.adlabels]: projectParams.adLabels,
                object_story_spec: objectStorySpec,
                fields: readFields,
            };
        } catch (err) {
            logger.error(err.message);
            return null;
        }
    }

    async uploadVideo(accountId, videoUrl) {
        logger.debug(`Uploading video from url (${videoUrl}) ...`);
        try {
            const video = await fbRequest.post(accountId, 'advideos', {
                file_url: videoUrl,
                title: 'VIDEO TITLE2', // not shown on ad
                description: 'VIDEO DESCRIPTION2', // not shown on ad
                name: 'VIDEO NAME2', // not shown on ad
            });
            logger.debug(`Video uploaded (fb_id: ${video.id})`);
            logger.debug(`Checking the status of uploaded video (#${video.id})`);
            await new Promise(async (resolve, reject) => {
                const intervalId = setInterval(async (res, rej, videoId) => {
                    const response = await fbRequest.get(videoId, null, { fields: 'status' });
                    if (response.status.video_status === 'ready') {
                        logger.debug(`Video (#${videoId}) - READY`);
                        clearInterval(intervalId);
                        res();
                        return;
                    } else if (response.status.video_status === 'error') {
                        clearInterval(intervalId);
                        rej(new Error(`Uploaded video (#${videoId}) got an error`));
                        return;
                    }
                    logger.debug(`Video (#${videoId}) - STATUS: ${response.status.video_status}`);
                }, 5000, resolve, reject, video.id);
            });
            return video;
        } catch (err) {
            throw err;
        }
    }

    async uploadSlideshow(accountId, imageUrls) {
        logger.debug(`Creating slideshow from ${imageUrls.length} images...`);
        try {
            const video = await fbRequest.post(accountId, 'advideos', {
                slideshow_spec: {
                    images_urls: imageUrls,
                    duration_ms: 1500,
                    transition_ms: 750,
                },
                title: 'SLIDESHOW TITLE2', // not shown on ad
                description: 'SLIDESHOW DESCRIPTION2', // not shown on ad
                name: 'SLIDESHOW NAME2', // not shown on ad
            });
            logger.debug(`Slideshow uploaded (fb_id: ${video.id})`);
            logger.debug(`Checking the status of uploaded slideshow (#${video.id})`);
            await new Promise(async (resolve, reject) => {
                const intervalId = setInterval(async (res, rej, videoId) => {
                    const response = await fbRequest.get(videoId, null, { fields: 'status' });
                    if (response.status.video_status === 'ready') {
                        logger.debug(`Slideshow (#${videoId}) - READY`);
                        clearInterval(intervalId);
                        res();
                        return;
                    } else if (response.status.video_status === 'error') {
                        clearInterval(intervalId);
                        rej(new Error(`Uploaded slideshow (#${videoId}) got an error`));
                        return;
                    }
                    logger.debug(`Slideshow (#${videoId}) - STATUS: ${response.status.video_status}`);
                }, 5000, resolve, reject, video.id);
            });
            return video;
        } catch (err) {
            throw err;
        }
    }

    // Unused
    async chunkUploadVideo(accountId, videoUrl) {
        const response = await request.head(videoUrl);
        const fileSize = parseInt(response['content-length']);
        // const file = await this.download(videoUrl);
        logger.debug('Chunk-uploading video file...');
        let chunkUploadSession = await fbRequest.post(accountId, 'advideos', { upload_phase: 'start', file_size: fileSize });
        const uploadSessionId = chunkUploadSession.upload_session_id;
        const videoId = chunkUploadSession.video_id;
        let startOffset = parseInt(chunkUploadSession.start_offset);
        let endOffset = parseInt(chunkUploadSession.end_offset);
        while (startOffset < endOffset) {
            const byteChunk = await fs.createReadStream(`file:${videoUrl}`, { start: startOffset, end: endOffset });
            const chunkParams = {
                upload_phase: 'transfer',
                upload_session_id: uploadSessionId,
                start_offset: startOffset,
                video_file_chunk: byteChunk,
            };
            chunkUploadSession = await fbRequest.post(accountId, 'advideos', chunkParams);
            startOffset = chunkUploadSession.start_offset;
            endOffset = chunkUploadSession.end_offset;
            logger.debug(`${(100 * (startOffset / fileSize)).toFixed(0)}% uploaded`);
        }
        const videoParams = {
            upload_phase: 'finish',
            upload_session_id: uploadSessionId,
            title: 'VIDEO TITLE',
            description: 'VIDEO DESCRIPTION',
            name: 'VIDEO NAME',
        };
        chunkUploadSession = await fbRequest.post(accountId, 'advideos', videoParams);
        if (chunkUploadSession.success) {
            logger.debug(`Checking the status of uploaded video (#${videoId})`);
            await new Promise(async (resolve) => {
                const intervalId = setInterval(async (res, bideoId) => {
                    const fbResponse = await fbRequest.get(bideoId, null, { fields: 'status' });
                    if (fbResponse.status.video_status === 'ready') {
                        logger.debug(`Video (#${bideoId}) - READY`);
                        clearInterval(intervalId);
                        res();
                        return;
                    }
                    logger.debug(`Video (#${bideoId}) - STATUS: ${fbResponse.status.video_status}`);
                }, 5000, resolve, videoId);
            });
            return { id: videoId };
        }
        throw new Error('Video upload failed');
    }

    // Unused
    async download(url) {
        const file = fs.createWriteStream(tempDir);
        try {
            const response = await request.get(url);
            await response.pipe(file);
            file.on('finish', () => {
                file.close(); // close() is async
                return file;
            });
        } catch (err) {
            fs.unlink(tempDir); // Delete the file async. (But we don't check the result)
            throw err;
        }
    }
}

module.exports = new CreativeService();
