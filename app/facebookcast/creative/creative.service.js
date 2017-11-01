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
            const creativeParams = { fields: readFields };
            let creatives = [];
            let fbResponse;
            if (promotionId) {
                // TODO: implement paging-based GET
                logger.debug(`Fetching creatives by promotion id (#${promotionId}) ...`);
                const promotionLabel = project.adLabels.promotionLabels.filter(label => label.name === promotionId)[0];
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
        try {
            const project = await ProjectModel.findOne({ castrBizId: castrBizId });
            const accountId = project.accountId;
            const businessLabel = project.adLabels.businessLabel;
            const locationLabel = project.adLabels.locationLabels.filter(label => label.name === castrLocId)[0];
            const promotionLabel = project.adLabels.promotionLabels.filter(label => label.name === promotionId)[0];
            const projectParams = {
                accountId: accountId,
                pageId: project.pageId,
                instagramId: project.instagramId,
                adLabels: [businessLabel, locationLabel, promotionLabel]
            };
            const adSpecPromises = [
                this.getLinkAdCreative(projectParams),
                this.getCarouselAdCreative(projectParams),
                this.getVideoAdCreative(projectParams),
                this.getSlideshowAdCreative(projectParams)
            ];
            const adSpecs = await Promise.all(adSpecPromises);
            logger.debug('Creating adlabels for creatives...');
            const labelPromises = [
                fbRequest.post(accountId, 'adlabels', { name: adSpecs[0].name }),
                fbRequest.post(accountId, 'adlabels', { name: adSpecs[1].name }),
                fbRequest.post(accountId, 'adlabels', { name: adSpecs[2].name }),
                fbRequest.post(accountId, 'adlabels', { name: adSpecs[3].name })
            ];
            logger.debug(`Creating creative for promotion (#${promotionId}) ...`);
            // const batches = [];
            // const requests = adSpecs.map((spec) => {
            //     if (!spec) return null;
            //     return {
            //         method: 'POST',
            //         relative_url: `${fbRequest.apiVersion}/${accountId}/adcreatives`,
            //         body: spec,
            //     };
            // });
            // const batchResponse = await fbRequest.batch(requests, true);
            const createPromises = [
                fbRequest.post(accountId, 'adcreatives', adSpecs[0]),
                fbRequest.post(accountId, 'adcreatives', adSpecs[1]),
                fbRequest.post(accountId, 'adcreatives', adSpecs[2]),
                fbRequest.post(accountId, 'adcreatives', adSpecs[3])
            ];
            const creatives = await Promise.all(createPromises);
            const creativeLabels = await Promise.all(labelPromises);
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
                    name: creative.name,
                    status: creative.status,
                    body: creative.body,
                    title: creative.title,
                    callToActionType: creative.call_to_action_type,
                    effectiveObjectStoryId: creative.effective_object_story_id,
                    objectStorySpec: creative.object_story_spec,
                    objectType: creative.object_type,
                    creativeLabel: creativeLabels[i],
                });
                updatePromises.push(model.save());
                responseData.push({
                    id: creative.id,
                    name: creative.name,
                });
            }
            await Promise.all(updatePromises);
            logger.debug(`(#${creatives.length}) creative stored to DB`);
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
        try {
            logger.debug('Fetching creatives for deletion...');
            let creatives;
            if (promotionId) {
                creatives = await CreativeModel.find({
                    promotionId: promotionId,
                    [CreativeField.status]: { $ne: [CreativeStatus.deleted] },
                }, 'id creativeLabel');
            } else if (castrBizId) {
                creatives = await CreativeModel.find({
                    castrBizId: castrBizId,
                    [CreativeField.status]: { $ne: [CreativeStatus.deleted] },
                }, 'id creativeLabel');
            }
            const creativeIds = creatives.map(creative => creative.id);
            const batches = [];
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
                            logger.debug('One of batch requests failed, trying again...');
                            batchCompleted = false;
                            break;
                        }
                        if (!batchCompleted) break;
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

    async getLinkAdCreative(projectParams) {
        logger.debug('Creating Single-Image ad creative...');
        const name = 'Creative [SINGLE_IMAGE]';
        const destinationUrl = 'https://www.mixcloud.com/dondiablo/';
        const callToAction = {
            type: CallToActionType.learn_more,
            value: {
                link: destinationUrl,
                link_caption: destinationUrl,
            },
        };
        const objectStorySpec = {
            link_data: {
                message: 'try it out', // post text
                name: 'Some Name', // attachment name
                description: 'SOME DESCRIPTION', // attachment description
                caption: destinationUrl, // displayed url
                call_to_action: callToAction, // CTA button
                // image_crops: {},
                picture: 'https://thumbnailer.mixcloud.com/unsafe/128x128/profile/4/b/c/a/c04a-e2d9-4404-9004-4e62e5dc048b',
                link: destinationUrl,
                page_welcome_message: 'WELCOME', // for messenger
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
    }

    async getCarouselAdCreative(projectParams) {
        logger.debug('Creating Carousel ad creative...');
        const name = 'Creative [CAROUSEL]';
        const destinationUrl = 'https://www.mixcloud.com/dondiablo/';
        const destinationUrl2 = 'https://plnkr.co';
        const callToAction = {
            type: CallToActionType.learn_more,
            value: {
                link: destinationUrl,
                link_caption: destinationUrl,
            },
        };
        const objectStorySpec = {
            link_data: {
                message: 'try it out', // post text
                child_attachments: [
                    {
                        name: 'Some Child Name',
                        description: 'SOME DESCRIPTION',
                        call_to_action: callToAction,
                        caption: destinationUrl,
                        // image_crops: {},
                        picture: 'https://thumbnailer.mixcloud.com/unsafe/128x128/profile/4/b/c/a/c04a-e2d9-4404-9004-4e62e5dc048b',
                        link: destinationUrl,
                    },
                    {
                        name: 'Some Child Name2',
                        description: 'SOME DESCRIPTION2',
                        call_to_action: callToAction,
                        caption: destinationUrl,
                        // image_crops: {},
                        picture: 'https://thumbnailer.mixcloud.com/unsafe/128x128/profile/4/b/c/a/c04a-e2d9-4404-9004-4e62e5dc048b',
                        link: destinationUrl,
                    }
                ],
                caption: destinationUrl2, // end card display url
                link: destinationUrl2, // end card destination url
                page_welcome_message: 'WELCOME', // for messenger
                multi_share_end_card: true,
                multi_share_optimized: true,

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
    }

    async getVideoAdCreative(projectParams) {
        logger.debug('Creating Single-Video ad creative...');
        try {
            const videoUrl = 'https://s3-us-west-1.amazonaws.com/castr-images/videos/1505555120860.mp4';
            const video = await this.uploadVideo(projectParams.accountId, videoUrl);
            const name = 'Creative [SINGLE_VIDEO]';
            const destinationUrl = 'https://www.mixcloud.com/dondiablo/';
            const callToAction = {
                type: CallToActionType.learn_more,
                value: {
                    link: destinationUrl, // destination URL
                    link_caption: destinationUrl, // display URL
                },
            };
            const objectStorySpec = {
                video_data: {
                    message: 'try it out', // post text
                    title: 'VIDEO TITLE', // attachment name
                    video_id: video.id,
                    call_to_action: callToAction, // CTA button
                    image_url: 'https://thumbnailer.mixcloud.com/unsafe/128x128/profile/4/b/c/a/c04a-e2d9-4404-9004-4e62e5dc048b', // thumbnail
                    link_description: 'LINK DESCRIPTION', // attachment description
                    page_welcome_message: 'WELCOME', // for messenger
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

    async getSlideshowAdCreative(projectParams) {
        logger.debug('Creating Slideshow ad creative...');
        try {
            const imageUrls = [
                'https://i.ytimg.com/vi/y4-ZXUotFlA/maxresdefault.jpg',
                'http://channel.nationalgeographic.com/exposure/content/photo/photo/2095189_the-largest-carnivore-in-the-world_uensu6q222ogkowxa262qcibd3ggiqn63zkcn5eeuqux54zcfvtq_757x567.jpg',
                'http://cdn2.arkive.org/media/C4/C47A0B8A-6458-41B4-A657-3442AECBD887/Presentation.Large/Brown-bears-mating-Alaskan-population.jpg'
            ];
            const video = await this.uploadSlideshow(projectParams.accountId, imageUrls);
            const name = 'Creative [SLIDESHOW]';
            const destinationUrl = 'https://www.mixcloud.com/dondiablo/';
            const callToAction = {
                type: CallToActionType.learn_more,
                value: {
                    link: destinationUrl, // destination URL
                    link_caption: destinationUrl, // display URL
                },
            };
            const objectStorySpec = {
                video_data: {
                    message: 'try it out', // post text
                    title: 'SLIDESHOW TITLE', // attachment name
                    video_id: video.id,
                    call_to_action: callToAction, // CTA button
                    image_url: 'https://thumbnailer.mixcloud.com/unsafe/128x128/profile/4/b/c/a/c04a-e2d9-4404-9004-4e62e5dc048b', // thumbnail
                    link_description: 'LINK DESCRIPTION', // attachment description
                    page_welcome_message: 'WELCOME', // for messenger
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

    // slideshow_spec:{
    //     image_urls: [],
    //     duration_ms: int,
    //     transition_ms: int,
    // } // for slideshow

    async getPreview() {
        // curl -G \
        // --data-urlencode 'creative={ 
        //   'object_story_spec': { 
        //     'link_data': { 
        //       'call_to_action': {'type':'USE_APP','value':{'link':'<URL>'}}, 
        //       'description': 'Description', 
        //       'link': '<URL>', 
        //       'message': 'Message', 
        //       'name': 'Name', 
        //       'picture': '<IMAGE_URL>' 
        //     }, 
        //     'page_id': '<PAGE_ID>' 
        //   } 
        // }' \
        // -d 'ad_format=MOBILE_FEED_STANDARD' \
        // -d 'access_token=<ACCESS_TOKEN>' \
        // https://graph.facebook.com/v2.10/act_<AD_ACCOUNT_ID>/generatepreviews

        // https://graph.facebook.com/<API_VERSION>/<AD_CREATIVE_ID>/previews
    }
}

module.exports = new CreativeService();
