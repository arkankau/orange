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
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeAudio = transcribeAudio;
/**
 * Speech-to-Text Service
 * Wraps the existing ASR logic for the orchestration API
 */
const asr_1 = require("./asr");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const TEMP_DIR = path.join(process.cwd(), 'temp');
/**
 * Transcribe audio from buffer or URL
 * @param audioBufferOrUrl - Audio buffer or URL to audio file
 * @returns Transcribed text
 */
async function transcribeAudio(audioBufferOrUrl) {
    try {
        let audioPath;
        if (typeof audioBufferOrUrl === 'string') {
            // If it's a URL, download it first (or use directly if it's a file path)
            if (audioBufferOrUrl.startsWith('http')) {
                // TODO: Download from URL if needed
                throw new Error('URL audio download not yet implemented');
            }
            else {
                audioPath = audioBufferOrUrl;
            }
        }
        else {
            // Save buffer to temp file
            await fs.mkdir(TEMP_DIR, { recursive: true });
            const tempId = (0, uuid_1.v4)();
            audioPath = path.join(TEMP_DIR, `${tempId}.wav`);
            await fs.writeFile(audioPath, audioBufferOrUrl);
        }
        // Use existing transcribeAudioChunk function
        const transcript = await (0, asr_1.transcribeAudioChunk)(audioPath);
        // Cleanup temp file if we created it
        if (typeof audioBufferOrUrl === 'object') {
            try {
                await fs.unlink(audioPath);
            }
            catch (e) {
                // Ignore cleanup errors
            }
        }
        return transcript;
    }
    catch (error) {
        console.error('STT error:', error);
        throw new Error(`Speech-to-text failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
//# sourceMappingURL=stt.js.map