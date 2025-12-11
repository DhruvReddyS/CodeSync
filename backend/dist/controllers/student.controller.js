"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrUpdateStudent = createOrUpdateStudent;
async function createOrUpdateStudent(req, res, next) {
    try {
        const data = req.body;
        // later: validate + save to Firestore
        return res.status(201).json({
            message: "Onboarding data received",
            data
        });
    }
    catch (err) {
        next(err);
    }
}
