/**
 * ClipSense API Client
 *
 * Handles communication with ClipSense backend for video analysis.
 */

import axios, { AxiosInstance } from "axios";
import { createReadStream, statSync } from "fs";
import { basename } from "path";

const API_BASE_URL = "https://api.clipsense.app/api/v1";
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export class ClipSenseClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 300000, // 5 minutes (video analysis takes time)
    });
  }

  /**
   * Analyze a video file
   */
  async analyzeVideo(
    videoPath: string,
    question: string
  ): Promise<{ jobId: string; analysis: string }> {
    // Validate file size
    const stats = statSync(videoPath);
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`Video file too large. Max size: 500MB (${stats.size} bytes provided)`);
    }

    // Step 1: Get presigned upload URL
    const { data: presignData } = await this.client.post("/upload/presign", {
      filename: basename(videoPath),
      content_type: this.getContentType(videoPath),
      file_size: stats.size,
    });

    const { upload_url, video_key } = presignData;

    // Step 2: Upload video to Firebase Storage using PUT
    const fileStream = createReadStream(videoPath);
    await axios.put(upload_url, fileStream, {
      headers: {
        "Content-Type": this.getContentType(videoPath),
      },
      timeout: 120000, // 2 minutes for upload
      maxBodyLength: MAX_FILE_SIZE,
      maxContentLength: MAX_FILE_SIZE,
    });

    // Step 3: Start analysis job
    const { data: jobData } = await this.client.post("/analyze/start", {
      video_key: video_key,
      filename: basename(videoPath),
      question,
      analysis_type: "mobile_bug",
    });

    const jobId = jobData.id;

    // Step 4: Poll for results
    const result = await this.pollJobStatus(jobId);

    return {
      jobId,
      analysis: this.formatAnalysis(result),
    };
  }

  /**
   * Poll job status until complete
   */
  private async pollJobStatus(jobId: string): Promise<any> {
    const maxAttempts = 120; // 10 minutes max (5s interval)
    let attempts = 0;

    while (attempts < maxAttempts) {
      const { data } = await this.client.get(`/analyze/jobs/${jobId}/status`);

      if (data.status === "completed") {
        // Get full job details
        const { data: fullJob } = await this.client.get(`/analyze/jobs/${jobId}`);
        return fullJob;
      }

      if (data.status === "failed") {
        throw new Error(`Analysis failed: ${data.error_message || "Unknown error"}`);
      }

      // Wait 5 seconds before next poll
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error("Analysis timeout after 10 minutes");
  }

  /**
   * Format analysis result for display
   */
  private formatAnalysis(job: any): string {
    const { result, cost_total, tokens_used } = job;

    if (!result?.response) {
      throw new Error("No analysis result found");
    }

    return `
## Mobile Bug Analysis

${result.response}

---
**Analysis Details:**
- Frames analyzed: ${job.frames_extracted || "N/A"}
- Tokens used: ${tokens_used || 0}
- Cost: $${(cost_total || 0).toFixed(4)}
`.trim();
  }

  /**
   * Get content type from file extension
   */
  private getContentType(filepath: string): string {
    const ext = filepath.toLowerCase().split(".").pop();
    const types: Record<string, string> = {
      mp4: "video/mp4",
      mov: "video/quicktime",
      webm: "video/webm",
      avi: "video/x-msvideo",
      mkv: "video/x-matroska",
      flv: "video/x-flv",
      mpeg: "video/mpeg",
      mpg: "video/mpeg",
      "3gp": "video/3gpp",
      wmv: "video/x-ms-wmv",
    };
    return types[ext || ""] || "video/mp4";
  }
}
