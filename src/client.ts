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
    // Validate file exists and get stats
    let stats;
    try {
      stats = statSync(videoPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(
          `Video file not found: ${videoPath}\n\n` +
          `Please check:\n` +
          `  • The file path is correct\n` +
          `  • You have permission to read the file\n` +
          `  • The file exists at the specified location`
        );
      }
      throw new Error(
        `Failed to access video file: ${error.message}\n\n` +
        `Path: ${videoPath}`
      );
    }

    // Validate it's a file, not a directory
    if (!stats.isFile()) {
      throw new Error(
        `Path is not a file: ${videoPath}\n\n` +
        `Please provide a path to a video file, not a directory.`
      );
    }

    // Validate file size
    if (stats.size === 0) {
      throw new Error(
        `Video file is empty (0 bytes): ${videoPath}\n\n` +
        `Please ensure the video file is valid and not corrupted.`
      );
    }

    if (stats.size > MAX_FILE_SIZE) {
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
      throw new Error(
        `Video file too large: ${fileSizeMB}MB (max: ${maxSizeMB}MB)\n\n` +
        `To fix this:\n` +
        `  • Trim the video to show only the bug (crash moment + 10 seconds before)\n` +
        `  • Compress with: ffmpeg -i input.mp4 -vcodec h264 -acodec aac output.mp4\n` +
        `  • Use a shorter screen recording\n\n` +
        `File: ${videoPath}`
      );
    }

    // Validate file extension
    const ext = videoPath.toLowerCase().split(".").pop() || "";
    const supportedFormats = ["mp4", "mov", "webm", "avi", "mkv", "flv", "mpeg", "mpg", "3gp", "wmv"];
    if (!supportedFormats.includes(ext)) {
      throw new Error(
        `Unsupported video format: .${ext}\n\n` +
        `Supported formats: ${supportedFormats.join(", ")}\n\n` +
        `To convert your video:\n` +
        `  ffmpeg -i ${videoPath} output.mp4\n\n` +
        `File: ${videoPath}`
      );
    }

    try {
      // Step 1: Get presigned upload URL
      const { data: presignData } = await this.client.post("/upload/presign", {
        filename: basename(videoPath),
        content_type: this.getContentType(videoPath),
        file_size: stats.size,
      });

      const { upload_url, video_key } = presignData;

      // Step 2: Upload video to Cloudflare R2
      console.error(`Uploading ${basename(videoPath)} (${(stats.size / (1024 * 1024)).toFixed(2)}MB)...`);
      const fileStream = createReadStream(videoPath);
      await axios.put(upload_url, fileStream, {
        headers: {
          "Content-Type": this.getContentType(videoPath),
        },
        timeout: 120000, // 2 minutes for upload
        maxBodyLength: MAX_FILE_SIZE,
        maxContentLength: MAX_FILE_SIZE,
      });
      console.error(`Upload complete. Starting analysis...`);

      // Step 3: Start analysis job
      const { data: jobData } = await this.client.post("/analyze/start", {
        video_key: video_key,
        filename: basename(videoPath),
        question,
        analysis_type: "mobile_bug",
      });

      const jobId = jobData.id;
      console.error(`Analysis job started (ID: ${jobId}). This may take 2-3 minutes...`);

      // Step 4: Poll for results
      const result = await this.pollJobStatus(jobId);

      return {
        jobId,
        analysis: this.formatAnalysis(result),
      };
    } catch (error: any) {
      // Handle specific error types
      if (error.response) {
        // HTTP error from API
        const status = error.response.status;
        const message = error.response.data?.detail || error.response.data?.error || error.message;

        if (status === 401 || status === 403) {
          throw new Error(
            `Authentication failed\n\n` +
            `Your API key is invalid or expired.\n\n` +
            `To fix this:\n` +
            `  1. Get a new API key: curl -X POST "https://api.clipsense.app/api/v1/keys/request" -H "Content-Type: application/json" -d '{"email":"your-email@example.com"}'\n` +
            `  2. Update your MCP settings with the new key\n` +
            `  3. Restart your IDE\n\n` +
            `Error: ${message}`
          );
        }

        if (status === 429) {
          throw new Error(
            `Rate limit exceeded\n\n` +
            `You've used all your monthly analyses.\n\n` +
            `To fix this:\n` +
            `  • Wait until next month (free tier resets monthly)\n` +
            `  • Upgrade to PRO: https://clipsense.app/pricing\n\n` +
            `Error: ${message}`
          );
        }

        if (status === 413) {
          throw new Error(
            `Video file too large for server\n\n` +
            `The server rejected your video file.\n\n` +
            `To fix this:\n` +
            `  • Trim the video to only show the bug\n` +
            `  • Compress with: ffmpeg -i ${videoPath} -vcodec h264 -acodec aac output.mp4\n\n` +
            `Error: ${message}`
          );
        }

        if (status >= 500) {
          throw new Error(
            `ClipSense server error (${status})\n\n` +
            `The ClipSense API is experiencing issues.\n\n` +
            `To fix this:\n` +
            `  • Try again in a few minutes\n` +
            `  • Check status: https://clipsense.app/status\n` +
            `  • Contact support: support@clipsense.app\n\n` +
            `Error: ${message}`
          );
        }

        throw new Error(
          `API error (${status}): ${message}\n\n` +
          `Please contact support@clipsense.app if this persists.`
        );
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error(
          `Cannot connect to ClipSense API\n\n` +
          `Please check:\n` +
          `  • Your internet connection\n` +
          `  • Firewall settings (allow https://api.clipsense.app)\n` +
          `  • VPN/proxy settings\n\n` +
          `Error: ${error.message}`
        );
      }

      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw new Error(
          `Request timeout\n\n` +
          `The upload or API request took too long.\n\n` +
          `To fix this:\n` +
          `  • Check your internet connection\n` +
          `  • Try a smaller video file\n` +
          `  • Try again in a few minutes\n\n` +
          `Error: ${error.message}`
        );
      }

      // Re-throw if already formatted
      throw error;
    }
  }

  /**
   * Poll job status until complete
   */
  private async pollJobStatus(jobId: string): Promise<any> {
    const maxAttempts = 120; // 10 minutes max (5s interval)
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const { data } = await this.client.get(`/analyze/jobs/${jobId}/status`);

        if (data.status === "completed") {
          console.error(`Analysis complete!`);
          // Get full job details
          const { data: fullJob } = await this.client.get(`/analyze/jobs/${jobId}`);
          return fullJob;
        }

        if (data.status === "failed") {
          throw new Error(
            `Analysis failed\n\n` +
            `The video analysis encountered an error.\n\n` +
            `Error details: ${data.error_message || "Unknown error"}\n\n` +
            `To fix this:\n` +
            `  • Ensure the video file is valid and not corrupted\n` +
            `  • Try a different video format\n` +
            `  • Contact support@clipsense.app with job ID: ${jobId}`
          );
        }

        // Progress indicator (every 30 seconds)
        if (attempts % 6 === 0 && attempts > 0) {
          const elapsed = (attempts * 5) / 60;
          console.error(`Still processing... (${elapsed.toFixed(1)} min elapsed)`);
        }

        // Wait 5 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
      } catch (error: any) {
        // If polling fails due to network error, provide helpful message
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
          throw new Error(
            `Lost connection to ClipSense API\n\n` +
            `Your video is still being processed (Job ID: ${jobId})\n\n` +
            `To check status:\n` +
            `  • Visit: https://clipsense.app/results/${jobId}\n` +
            `  • Or try again in a few minutes\n\n` +
            `Error: ${error.message}`
          );
        }
        throw error;
      }
    }

    throw new Error(
      `Analysis timeout\n\n` +
      `The analysis is taking longer than expected (>10 minutes).\n\n` +
      `Your job is still processing. To check status:\n` +
      `  • Visit: https://clipsense.app/results/${jobId}\n` +
      `  • Contact support@clipsense.app with job ID: ${jobId}\n\n` +
      `This usually happens with very long videos (>5 minutes).`
    );
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
