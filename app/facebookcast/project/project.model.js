// app/facebookcast/project/project.model.js

const fbCastDB = require('../../db').fbCastDB;
const mongoose = require('../../db').mongoose;

const Status = {
    Pending: 'PENDING',
    Approved: 'APPROVED',
    Active: 'ACTIVE',
    Disintegrated: 'DISINTEGRATED',
};

exports.Status = Status;
exports.Model = fbCastDB.model(
    'Project',
    new mongoose.Schema(
        {
            castrLocId: String,
            accountId: String,
            accountName: String,
            accountStatus: { type: String, enum: Object.values(Status) },
            pageId: String,
            pageName: String,
            pageStatus: { type: String, enum: Object.values(Status) },
            instagramId: String,
            instagramName: String,
            isPBIA: Boolean,
            paymentMethod: String,
            accountVerified: Boolean,
            pageVerified: Boolean,
            paymentMethodVerified: Boolean,
            adLabels: {
                businessLabel: { id: String },
                promotionLabels: [{
                    _id: false,
                    id: String,
                    name: String,
                }],
            },
        },
        {
            timestamps: {
                updatedAt: 'timeUpdated',
                createdAt: 'timeCreated',
            },
        }
    )
);
