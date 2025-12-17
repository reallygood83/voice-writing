# Voice Writing for Obsidian

A local-first, AI-powered voice writing plugin for Obsidian. Seamlessly record, transcribe, and write with your voice using OpenAI or Groq.

![GitHub release (latest by date)](https://img.shields.io/github/v/release/reallygood83/voice-writing?style=flat-square)

## Features

- **One-Click Recording**: Instantly start recording via the ribbon icon or status bar.
- **Audio File Upload**: Transcribe existing audio files (mp3, wav, m4a, webm, ogg, flac).
- **Smart Templates**: Auto-format transcriptions as meeting notes, lecture notes, brainstorming sessions, or interviews.
- **AI-Powered**: Supports **OpenAI Whisper** (High Quality) and **Groq** (Real-time speed, FREE!).
- **Quick Options**: Easily switch languages and models without digging into settings.
- **Optional Audio Storage**: Choose whether to save audio files to your vault or just keep the text.
- **Privacy First**: Audio is processed via your own API keys. Everything stays local.

## Before You Begin

To use this plugin, you need an API Key from **OpenAI** or **Groq**.

### 1. Get an API Key
- **Recommended**: [**Groq**](https://console.groq.com/keys) - Currently **FREE** and extremely fast!
- **Alternative**: [OpenAI](https://platform.openai.com/api-keys) - High accuracy, standard pricing

### 2. Set it up in Obsidian
1. Install and enable the plugin.
2. Go to **Settings** > **Voice Writing**.
3. Paste your key into the **API Key** field.
4. Select your provider (`Groq` or `OpenAI`).
5. You're ready to record!

## Installation

### Via BRAT (Recommended for Beta)
1. Install the **[BRAT](https://github.com/TfTHacker/obsidian42-brat)** plugin from Community Plugins.
2. Open BRAT settings > **Add Beta plugin**.
3. Enter repository: `reallygood83/voice-writing`.
4. Enable "Voice Writing" in your Community Plugins list.

### Manual Installation
1. Download the latest release from the [Releases](https://github.com/reallygood83/voice-writing/releases) page.
2. Extract the files into `.obsidian/plugins/voice-writing`.
3. Reload Obsidian.

## Configuration

Go to **Settings > Voice Writing**:

### API Keys
- **Service Provider**: Choose `OpenAI` or `Groq`
- **OpenAI API Key**: Enter your key (starts with `sk-`)
- **Groq API Key**: Enter your key (starts with `gsk_`)

### Storage
- **Save Audio Recordings**: Toggle ON to save audio files to vault
- **Audio Save Folder**: Specify folder path (e.g., `Recordings` or `Assets/Audio`)

### Transcription Options
- **Default Language**: Set primary language (`en`, `ko`, `ja`, or `auto`)

## Usage

### Record and Transcribe
1. Click the **Microphone Icon** in the left ribbon (or status bar).
2. Speak your thoughts. Status bar shows "Recording...".
3. Click again to stop.
4. Select a formatting template (optional).
5. Text appears in your current note!

### Upload Audio File
1. Run command: `Voice Writing: Upload Audio File` (Cmd/Ctrl + P)
2. Select your audio file (mp3, wav, m4a, etc.)
3. Choose a formatting template.
4. Transcribed text is inserted into your note.

### Quick Options
- Run command: `Voice Writing: Quick Options`
- Switch language or service provider on the fly.

### Formatting Templates

After transcription, choose from built-in templates:

| Template | Best For |
|----------|----------|
| **None** | Raw transcript without formatting |
| **Meeting Notes** | Meetings with action items and decisions |
| **Lecture Notes** | Classes and educational content |
| **Brainstorming** | Idea generation sessions |
| **Interview** | Q&A format conversations |

## Commands

| Command | Description |
|---------|-------------|
| `Start Recording` | Begin voice recording |
| `Stop Recording` | Stop and transcribe |
| `Quick Options` | Change language/provider |
| `Upload Audio File` | Transcribe existing audio file |

## Troubleshooting

### Audio file not found error
- Enable **Save Audio Recordings** in settings
- Specify a valid **Audio Save Folder**
- Check vault folder permissions

### Transcription fails
- Verify your API key is correct (use the Test button)
- Check your internet connection
- Ensure audio file is under 25MB

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
AGPL-3.0

## About the Author

Hi! I'm **Moon**, passionate about productivity and learning.

- YouTube: [Master of Learning](https://youtube.com/@배움의달인-p5v)
- X (Twitter): [@reallygood83](https://x.com/reallygood83)

If you find this plugin helpful, please star the repo and follow!
