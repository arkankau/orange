"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSegment = extractSegment;
exports.cleanupSegment = cleanupSegment;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const uuid_1 = require("uuid");
const TEMP_DIR = path.join(process.cwd(), 'temp');
// Ensure temp directory exists
async function ensureTempDir() {
    try {
        await fs.mkdir(TEMP_DIR, { recursive: true });
    }
    catch (error) {
        // Directory might already exist, that's fine
    }
}
/**
 * Extract audio and video segments from a media file for a given time range.
 * @param mediaPath Path to the source media file
 * @param startTs Start time in seconds
 * @param endTs End time in seconds
 * @returns Paths to the extracted audio and video segment files
 */
async function extractSegment(mediaPath, startTs, endTs) {
    await ensureTempDir();
    const duration = endTs - startTs;
    const segmentId = (0, uuid_1.v4)();
    const audioPath = path.join(TEMP_DIR, `${segmentId}.wav`);
    const videoPath = path.join(TEMP_DIR, `${segmentId}.mp4`);
    // Extract audio segment
    await new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(mediaPath)
            .setStartTime(startTs)
            .setDuration(duration)
            .output(audioPath)
            .audioCodec('pcm_s16le')
            .audioChannels(1)
            .audioFrequency(16000)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });
    // Extract video segment
    await new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(mediaPath)
            .setStartTime(startTs)
            .setDuration(duration)
            .output(videoPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });
    return { audioPath, videoPath };
}
/**
 * Clean up temporary segment files
 */
async function cleanupSegment(audioPath, videoPath) {
    try {
        await fs.unlink(audioPath);
        await fs.unlink(videoPath);
    }
    catch (error) {
        console.warn(`Failed to cleanup segment files: ${error}`);
    }
}
//# sourceMappingURL=media.js.map