# ClipSense MCP Server

![npm version](https://img.shields.io/npm/v/@gburanda/clipsense-mcp-server)
![downloads](https://img.shields.io/npm/dm/@gburanda/clipsense-mcp-server)
![license](https://img.shields.io/npm/l/@gburanda/clipsense-mcp-server)
![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue)

Model Context Protocol (MCP) server for **ClipSense** - AI-powered mobile debugging through video analysis.

Analyze screen recordings of mobile app bugs with AI coding assistants. Get instant insights into crashes, UI issues, and unexpected behavior in React Native, iOS, and Android apps.

## Compatibility

**Works with multiple AI coding assistants** that support MCP (Model Context Protocol):

- **Claude Code** (VS Code extension) - Full filesystem access, handles videos up to 500MB
- **Cursor** - Full MCP support via `.cursor/mcp.json`
- **Windsurf** - MCP support via `.windsurf/mcp.json`
- **Cline** - Full MCP support with integrated marketplace
- **Roo-Cline/Roo Code** - MCP support with manual configuration
- **Continue.dev** - MCP support for VS Code and JetBrains IDEs
- **OpenAI Codex** - Comprehensive MCP support

**Important Limitations:**

- **Claude Desktop**: Does NOT work due to 31MB file upload limit (99.99% of videos exceed this)
- **One-time analysis**: Each analysis is independent; follow-up questions require re-analyzing the video

## Features

- **Video Bug Analysis**: Analyze local screen recordings showing mobile app issues
- **AI-Powered Debugging**: Claude Sonnet 4.5 analyzes videos frame-by-frame to identify problems
- **Multi-Platform Support**: Works with React Native, iOS (Swift/Objective-C), Android (Kotlin/Java)
- **Code Fix Suggestions**: Get actionable recommendations to fix bugs
- **Fast Processing**: Results in ~2 minutes for most videos

## Demo

![ClipSense Demo](https://placeholder-for-demo.gif)

*From crash video to root cause in under 3 minutes*

## Installation

### 1. Get Your API Key

Request a free API key:

```bash
curl -X POST "https://api.clipsense.app/api/v1/keys/request" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

Check your email for the API key (starts with `cs_sk_`).

### 2. Install via npm

```bash
npm install -g @gburanda/clipsense-mcp-server
```

### 3. Configure Your AI Coding Assistant

#### Claude Code (VS Code Extension)

Add to your MCP settings file:

**macOS/Linux**: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
**Windows**: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "clipsense": {
      "command": "npx",
      "args": ["-y", "@gburanda/clipsense-mcp-server"],
      "env": {
        "CLIPSENSE_API_KEY": "cs_sk_YOUR_API_KEY_HERE"
      }
    }
  }
}
```

#### Cursor

Create or edit `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "clipsense": {
      "command": "npx",
      "args": ["-y", "@gburanda/clipsense-mcp-server"],
      "env": {
        "CLIPSENSE_API_KEY": "cs_sk_YOUR_API_KEY_HERE"
      }
    }
  }
}
```

#### Windsurf

Create or edit `.windsurf/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "clipsense": {
      "command": "npx",
      "args": ["-y", "@gburanda/clipsense-mcp-server"],
      "env": {
        "CLIPSENSE_API_KEY": "cs_sk_YOUR_API_KEY_HERE"
      }
    }
  }
}
```

#### Continue.dev

Add to your Continue configuration (VS Code or JetBrains):

```json
{
  "mcpServers": {
    "clipsense": {
      "command": "npx",
      "args": ["-y", "@gburanda/clipsense-mcp-server"],
      "env": {
        "CLIPSENSE_API_KEY": "cs_sk_YOUR_API_KEY_HERE"
      }
    }
  }
}
```

#### Cline, Roo-Cline, OpenAI Codex

Refer to your IDE's MCP configuration documentation. The server configuration follows the same pattern shown above.

### 4. Restart Your IDE

The ClipSense MCP tool will now be available in your AI coding assistant.

## Usage

In your AI coding assistant, simply ask to analyze a bug video:

```
Analyze this bug video: /Users/me/Desktop/app-crash.mp4
```

Your AI assistant will use the ClipSense MCP server to:
1. Upload your video
2. Process it with AI vision (Claude Sonnet 4.5)
3. Identify the bug and suggest fixes

### Follow-up Questions

**Each analysis is independent.** To ask follow-up questions about the same video:

```
Analyze /Users/me/Desktop/app-crash.mp4 and focus on the network request flow
```

The video will be re-analyzed with your new question. Follow-up questions without re-specifying the video path will not have access to the previous analysis context.

### Supported Video Formats

**All common formats supported:**
- MP4, MOV, WebM, AVI, MKV, FLV, MPEG/MPG, 3GP, WMV
- Max file size: 500MB
- Max duration: 10 minutes
- All formats automatically converted to MP4 for processing

## Example Questions

- "Why does my app crash when I tap the login button?"
- "What's causing this UI glitch on the profile screen?"
- "Analyze this video and explain what's happening"
- "What could be causing this infinite scroll issue?"

## Example Analysis Output

When you analyze a video, ClipSense provides:

```markdown
# ClipSense Analysis Complete 🔍

## Root Cause
Null pointer exception when accessing user.profile.avatar at ProfileScreen.tsx:142

## Timeline
- 0:00-0:15 - User navigates to profile screen
- 0:15-0:18 - App attempts to load avatar image
- 0:18 - Crash occurs (NullPointerException)

## Visual Evidence
127 frames analyzed
Key moments:
- 0:15 (Frame 23): Profile screen rendered, avatar placeholder visible
- 0:18 (Frame 24): White screen (crash)

## Recommended Fix
Add null check before accessing avatar:

```javascript
const avatarUrl = user?.profile?.avatar ?? DEFAULT_AVATAR;
```

## Next Steps
1. Add null safety checks in ProfileScreen.tsx
2. Implement error boundary for profile component
3. Add fallback UI for missing user data

---
💬 **Have follow-up questions?** Continue this conversation with your AI assistant
📊 **View full details:** https://clipsense.app/results/job_abc123
📝 **Analysis ID:** job_abc123
```

## Pricing

- **FREE**: 3 analyses per month, no credit card required
- **PRO ($29/mo)**: 50 analyses per month
- **TEAM ($99/mo)**: 300 analyses per month, team collaboration
- **ENTERPRISE (Custom)**: Contact sales for custom pricing

> **Note:** Pricing reflects current backend implementation. Contact support@clipsense.app for custom plans.

## FAQ

### What video formats are supported?
All common video formats: MP4, MOV, WebM, AVI, MKV, FLV, MPEG/MPG, 3GP, and WMV files up to 500MB and 10 minutes duration. All formats are automatically converted to MP4 for processing.

### How long does analysis take?
Most videos are analyzed in 2-3 minutes. Longer videos (5+ minutes) may take up to 5 minutes.

### Is my video data secure?
Yes. Videos are encrypted during upload and storage. All videos are automatically deleted after 24 hours. We never train AI models on your data.

### Can I ask follow-up questions about an analysis?
Each MCP analysis is independent. To explore different aspects of the same bug, re-analyze the video with a more specific question (e.g., "focus on the network request flow").

### What if I run out of free analyses?
You can upgrade to PREMIUM ($19/mo) for unlimited analyses, or wait until next month when your free tier resets.

## Troubleshooting

### Error: "CLIPSENSE_API_KEY not found"
**Solution:** Ensure your MCP settings file has the correct `env` section with your API key:
```json
"env": {
  "CLIPSENSE_API_KEY": "cs_sk_YOUR_KEY_HERE"
}
```
Restart your IDE after updating.

### Error: "Command not found: npx"
**Solution:** Install Node.js (v18+) from [nodejs.org](https://nodejs.org). Then restart your terminal and IDE.

### Error: "Upload failed" or "File too large"
**Solution:**
- Ensure video is under 500MB
- Trim video to show only the relevant bug (crash moment + 10 seconds before)
- Compress with: `ffmpeg -i input.mp4 -vcodec h264 -acodec aac output.mp4`

### Analysis stuck at "processing"
**Solution:**
- Check status at https://clipsense.app/results/[job_id]
- If stuck for 10+ minutes, contact support@clipsense.app with the job ID

### Claude Code doesn't see the ClipSense tool
**Solution:**
1. Verify MCP settings file location matches your IDE
2. Check for JSON syntax errors in your MCP config
3. Restart VS Code completely (Cmd+Q, not just window close)
4. Try `npx @gburanda/clipsense-mcp-server` manually to test installation

## Support

- Documentation: https://clipsense.app/docs
- Issues: https://github.com/clipsense/-mcp-server/issues
- Email: support@clipsense.app

## License

MIT
