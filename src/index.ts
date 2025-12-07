#!/usr/bin/env node

/**
 * ClipSense MCP Server
 *
 * Provides mobile debugging assistance through video analysis.
 * Connects Claude Code to ClipSense API for analyzing React Native, iOS, and Android bug videos.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ClipSenseClient } from "./client.js";
import { ApiKeyManager } from "./auth.js";

const VERSION = "0.1.2";

async function main() {
  // Initialize API key manager
  const keyManager = new ApiKeyManager();
  const apiKey = await keyManager.getApiKey();

  if (!apiKey) {
    console.error("❌ No API key found. Please set CLIPSENSE_API_KEY environment variable or configure it in your MCP settings.");
    process.exit(1);
  }

  // Initialize ClipSense client
  const client = new ClipSenseClient(apiKey);

  // Create MCP server
  const server = new Server(
    {
      name: "clipsense",
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool: analyze-video
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "analyze-video",
          description: "Use this tool to analyze video files on the user's computer that show mobile app bugs. Reads local video files (MP4, MOV, WebM, AVI, MKV, FLV, MPEG, 3GP, WMV) and provides AI-powered analysis to identify errors, crashes, UI issues, and suggests code fixes. Works with React Native, iOS (Swift/Objective-C), and Android (Kotlin/Java) apps. Use this when the user asks you to analyze, examine, or debug a video file showing app behavior.",
          inputSchema: {
            type: "object",
            properties: {
              videoPath: {
                type: "string",
                description: "Absolute path to the video file on the user's computer (e.g., /Users/username/Desktop/bug.mp4). Max 500MB, max 10 minutes.",
              },
              question: {
                type: "string",
                description: "Specific question about the bug (optional). Example: 'Why does the button not respond when tapped?' If not provided, a general analysis will be performed.",
              },
            },
            required: ["videoPath"],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "analyze-video") {
      const { videoPath, question } = request.params.arguments as {
        videoPath: string;
        question?: string;
      };

      try {
        // Upload video and analyze
        const result = await client.analyzeVideo(videoPath, question || "Analyze this bug video and identify the issue.");

        return {
          content: [
            {
              type: "text",
              text: result.analysis,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Error: ${error.message}\n\n${error.details || ""}`,
            },
          ],
          isError: true,
        };
      }
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("✅ ClipSense MCP server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
