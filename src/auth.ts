/**
 * API Key Manager
 *
 * Handles API key storage and retrieval from environment variables or config file.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CONFIG_DIR = join(homedir(), ".clipsense");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export class ApiKeyManager {
  /**
   * Get API key from environment variable or config file
   */
  async getApiKey(): Promise<string | null> {
    // 1. Check environment variable
    const envKey = process.env.CLIPSENSE_API_KEY;
    if (envKey) {
      return envKey;
    }

    // 2. Check config file
    try {
      if (existsSync(CONFIG_FILE)) {
        const config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
        if (config.apiKey) {
          return config.apiKey;
        }
      }
    } catch (error) {
      // Ignore read errors, proceed to return null
    }

    return null;
  }

  /**
   * Save API key to config file
   */
  async saveApiKey(apiKey: string): Promise<void> {
    // Create config directory if it doesn't exist
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Save API key
    const config = { apiKey };
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  }
}
