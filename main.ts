import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, requestUrl } from 'obsidian';
import { MicrophoneRecorder, RecordingError } from './src/recorder';
import { TranscriptionService } from './src/transcription';
import { FormattingService } from './src/formatting';
import { RecordingModal, ProcessingModal, QuickOptionModal, FileUploadModal, TemplateSelectionModal } from './src/modals';
import {
	ServiceProvider,
	SUCCESS_MESSAGES,
	ERROR_MESSAGES,
	DIARIZATION_NOTE,
	FormattingTemplate,
	BUILT_IN_TEMPLATES,
	TEMPLATE_MESSAGES,
	AUDIO_MIME_TYPES
} from './src/constants';

interface VoiceWritingSettings {
	openaiApiKey: string;
	groqApiKey: string;
	language: string;
	serviceProvider: ServiceProvider;
	enableSpeakerDiarization: boolean;
	customTemplates: FormattingTemplate[];
	saveAudioFiles: boolean;
	audioSaveFolder: string;
}

const DEFAULT_SETTINGS: VoiceWritingSettings = {
	openaiApiKey: '',
	groqApiKey: '',
	language: 'auto',
	serviceProvider: 'openai',
	enableSpeakerDiarization: false,
	customTemplates: [],
	saveAudioFiles: false,
	audioSaveFolder: ''
}

export default class VoiceWritingPlugin extends Plugin {
	settings: VoiceWritingSettings;
	recorder: MicrophoneRecorder;
	transcriptionService: TranscriptionService;
	formattingService: FormattingService;
	statusBarItem: HTMLElement;
	ribbonIconEl: HTMLElement;
	recordingModal: RecordingModal | null = null;

	async onload() {
		await this.loadSettings();

		this.recorder = new MicrophoneRecorder();
		this.transcriptionService = new TranscriptionService();
		this.formattingService = new FormattingService();

		// Ribbon Icon
		this.ribbonIconEl = this.addRibbonIcon('mic', 'Voice Writing', (evt: MouseEvent) => {
			this.toggleRecording();
		});
		this.ribbonIconEl.addClass('voice-writing-ribbon');

		// Status Bar
		this.statusBarItem = this.addStatusBarItem();
		this.updateStatusBar('Idle');
		this.statusBarItem.onClickEvent(() => {
			this.toggleRecording();
		});

		// Commands
		this.addCommand({
			id: 'start-recording',
			name: 'Start Recording',
			callback: () => this.startRecording()
		});

		this.addCommand({
			id: 'stop-recording',
			name: 'Stop Recording',
			callback: () => this.stopRecording()
		});

		this.addCommand({
			id: 'quick-options',
			name: 'Quick Options',
			callback: () => {
				new QuickOptionModal(
					this.app,
					this.settings.language,
					this.settings.serviceProvider,
					this.settings.enableSpeakerDiarization,
					async (lang, service, diarization) => {
						this.settings.language = lang;
						this.settings.serviceProvider = service;
						this.settings.enableSpeakerDiarization = diarization;
						await this.saveSettings();
						new Notice(SUCCESS_MESSAGES.QUICK_SETTINGS_SAVED(service, lang, diarization));
					}
				).open();
			}
		});

		this.addCommand({
			id: 'upload-audio-file',
			name: 'Upload Audio File',
			callback: () => {
				new FileUploadModal(this.app, (file) => {
					this.transcribeFile(file);
				}).open();
			}
		});

		this.addSettingTab(new VoiceWritingSettingTab(this.app, this));
	}

	async toggleRecording() {
		if (this.recorder.isRecording()) {
			await this.stopRecording();
		} else {
			await this.startRecording();
		}
	}

	async startRecording() {
		try {
			await this.recorder.startRecording();
			new Notice(SUCCESS_MESSAGES.RECORDING_STARTED);
			this.ribbonIconEl.addClass('voice-writing-recording');
			this.updateStatusBar('Recording...');
			
			// Show Recording Modal
			this.recordingModal = new RecordingModal(this.app, () => {
				this.stopRecording();
			});
			this.recordingModal.open();

		} catch (error) {
			const recordingError = error as RecordingError;
			if (recordingError && recordingError.type) {
				new Notice(recordingError.message);
			} else {
				new Notice(ERROR_MESSAGES.MICROPHONE_GENERAL_ERROR);
			}
			console.error('Recording error:', error);
		}
	}

	async stopRecording() {
		// Close recording modal if it exists (in case triggered by command/ribbon)
		if (this.recordingModal) {
			this.recordingModal.close();
			this.recordingModal = null;
		}

		try {
			const blob = await this.recorder.stopRecording();
			this.ribbonIconEl.removeClass('voice-writing-recording');
			this.updateStatusBar('Processing...');
			
			// Show Processing Modal
			const processingModal = new ProcessingModal(this.app);
			processingModal.open();

			// 1. Save Audio File (if enabled)
			let filePath = '';
			let audioFileSaved = false;

			if (this.settings.saveAudioFiles) {
				const fileName = `recording-${Date.now()}.webm`;
				const arrayBuffer = await blob.arrayBuffer();

				// Use user-configured folder or vault root
				filePath = fileName;
				const saveFolder = this.settings.audioSaveFolder.trim();
				if (saveFolder) {
					// Ensure folder exists
					const folderExists = this.app.vault.getAbstractFileByPath(saveFolder);
					if (!folderExists) {
						try {
							await this.app.vault.createFolder(saveFolder);
						} catch (e) {
							console.error('Failed to create folder:', saveFolder);
						}
					}
					filePath = `${saveFolder}/${fileName}`;
				}

				try {
					await this.app.vault.createBinary(filePath, arrayBuffer);
					audioFileSaved = true;
				} catch (saveError) {
					console.error('Failed to save audio file:', saveError);
					new Notice('Failed to save audio file. Check vault permissions.');
				}
			}
			
			// 2. Transcribe
			try {
				const apiKey = this.settings.serviceProvider === 'openai'
					? this.settings.openaiApiKey
					: this.settings.groqApiKey;
				const result = await this.transcriptionService.transcribe(
					blob,
					apiKey,
					this.settings.language,
					this.settings.serviceProvider
				);

				processingModal.close();
				new Notice(SUCCESS_MESSAGES.TRANSCRIPTION_COMPLETE);
				this.updateStatusBar('Idle');

				// 3. Show Template Selection Modal
				new TemplateSelectionModal(
					this.app,
					this.settings.customTemplates,
					async (selectedTemplate) => {
						let finalText = result.text;

						// Format if template selected (not null and not 'none')
						if (selectedTemplate && selectedTemplate.id !== 'none') {
							new Notice(TEMPLATE_MESSAGES.FORMATTING);
							const apiKey = this.settings.serviceProvider === 'openai'
								? this.settings.openaiApiKey
								: this.settings.groqApiKey;

							const formatResult = await this.formattingService.formatTranscription(
								result.text,
								selectedTemplate,
								apiKey,
								this.settings.serviceProvider
							);

							if (formatResult.success) {
								finalText = formatResult.text;
								new Notice(TEMPLATE_MESSAGES.FORMAT_COMPLETE);
							} else {
								new Notice(TEMPLATE_MESSAGES.FORMAT_FAILED);
							}
						}

						// Insert into Editor
						const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
						if (activeView) {
							const editor = activeView.editor;
							// Only include audio link if file was saved successfully
							const content = audioFileSaved
								? `![[${filePath}]]\n\n${finalText}\n`
								: `${finalText}\n`;
							editor.replaceSelection(content);
						} else {
							// No active editor - copy to clipboard
							new Notice(SUCCESS_MESSAGES.COPIED_TO_CLIPBOARD);
							navigator.clipboard.writeText(finalText);
						}
					}
				).open();

			} catch (error) {
				processingModal.close();
				console.error(error);
				this.updateStatusBar('Error');
				
				// Handle specific API errors
				const errMsg = (error as Error).message;
				if (errMsg === 'API_UNAUTHORIZED') {
					new Notice(ERROR_MESSAGES.API_UNAUTHORIZED, 5000); // Long duration
				} else if (errMsg === 'API_QUOTA_EXCEEDED') {
					new Notice(ERROR_MESSAGES.API_QUOTA_EXCEEDED, 5000);
				} else {
					new Notice('Transcription failed. Audio saved locally.');
				}

				// Still insert the audio link if file was saved
				if (audioFileSaved) {
					const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (activeView) {
						activeView.editor.replaceSelection(`![[${filePath}]]\n`);
					}
				}
			}

		} catch (error) {
			// This catches recorder stop errors (e.g. no recording active)
			this.ribbonIconEl.removeClass('voice-writing-recording');
			this.updateStatusBar('Idle');
		}
	}

	async transcribeFile(file: File) {
		const processingModal = new ProcessingModal(this.app);
		processingModal.open();
		this.updateStatusBar('Processing...');

		try {
			// Determine MIME type from file extension
			const ext = file.name.split('.').pop()?.toLowerCase() || '';
			const mimeType = AUDIO_MIME_TYPES[ext] || 'audio/mpeg';

			// Create blob with correct MIME type
			const arrayBuffer = await file.arrayBuffer();
			const blob = new Blob([arrayBuffer], { type: mimeType });

			// Get API key based on service provider
			const apiKey = this.settings.serviceProvider === 'openai'
				? this.settings.openaiApiKey
				: this.settings.groqApiKey;

			// Transcribe with actual file name and MIME type
			const result = await this.transcriptionService.transcribe(
				blob,
				apiKey,
				this.settings.language,
				this.settings.serviceProvider,
				file.name,  // Pass actual file name
				mimeType    // Pass actual MIME type
			);

			processingModal.close();
			new Notice(SUCCESS_MESSAGES.TRANSCRIPTION_COMPLETE);
			this.updateStatusBar('Idle');

			// Show Template Selection Modal
			new TemplateSelectionModal(
				this.app,
				this.settings.customTemplates,
				async (selectedTemplate) => {
					let finalText = result.text;

					// Format if template selected (not null and not 'none')
					if (selectedTemplate && selectedTemplate.id !== 'none') {
						new Notice(TEMPLATE_MESSAGES.FORMATTING);
						const apiKey = this.settings.serviceProvider === 'openai'
							? this.settings.openaiApiKey
							: this.settings.groqApiKey;

						const formatResult = await this.formattingService.formatTranscription(
							result.text,
							selectedTemplate,
							apiKey,
							this.settings.serviceProvider
						);

						if (formatResult.success) {
							finalText = formatResult.text;
							new Notice(TEMPLATE_MESSAGES.FORMAT_COMPLETE);
						} else {
							new Notice(TEMPLATE_MESSAGES.FORMAT_FAILED);
						}
					}

					// Insert into Editor
					const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (activeView) {
						const editor = activeView.editor;
						const content = `**File: ${file.name}**\n\n${finalText}\n`;
						editor.replaceSelection(content);
					} else {
						// No active editor - copy to clipboard
						new Notice(SUCCESS_MESSAGES.COPIED_TO_CLIPBOARD);
						navigator.clipboard.writeText(finalText);
					}
				}
			).open();

		} catch (error) {
			processingModal.close();
			console.error('Transcription error:', error);
			this.updateStatusBar('Error');

			// Handle specific API errors
			const errMsg = (error as Error).message;
			if (errMsg === 'API_UNAUTHORIZED') {
				new Notice(ERROR_MESSAGES.API_UNAUTHORIZED, 5000);
			} else if (errMsg === 'API_QUOTA_EXCEEDED') {
				new Notice(ERROR_MESSAGES.API_QUOTA_EXCEEDED, 5000);
			} else {
				new Notice('Transcription failed. Please try again.');
			}
		}
	}

	updateStatusBar(text: string) {
		this.statusBarItem.setText(`Mic: ${text}`);
		if (text === 'Recording...') {
			this.statusBarItem.addClass('voice-writing-recording');
		} else {
			this.statusBarItem.removeClass('voice-writing-recording');
		}
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class VoiceWritingSettingTab extends PluginSettingTab {
	plugin: VoiceWritingPlugin;

	constructor(app: App, plugin: VoiceWritingPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		containerEl.createEl('h2', {text: 'Voice Writing Settings'});

		new Setting(containerEl)
			.setName('Service Provider')
			.setDesc('Choose between OpenAI (Best quality) or Groq (Fastest)')
			.addDropdown(drop => drop
				.addOption('openai', 'OpenAI')
				.addOption('groq', 'Groq')
				.setValue(this.plugin.settings.serviceProvider)
				.onChange(async (value) => {
					this.plugin.settings.serviceProvider = value as ServiceProvider;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show correct key field
				}));

		// --- API Keys Section ---
		containerEl.createEl('h3', {text: 'API Keys'});
		
		// OpenAI API Key Setup Guide
		const openaiGuide = containerEl.createDiv({ cls: 'setting-item-description api-guide' });
		openaiGuide.innerHTML = `
			<strong>How to get OpenAI API Key:</strong><br>
			1. Go to <a href="https://platform.openai.com/api-keys">platform.openai.com/api-keys</a><br>
			2. Sign up or log in<br>
			3. Click "Create new secret key"<br>
			4. Copy the key (starts with <code>sk-</code>)
		`;

		// OpenAI API Key
		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('Whisper model - High quality transcription')
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.openaiApiKey)
				.onChange(async (value) => {
					this.plugin.settings.openaiApiKey = value;
					await this.plugin.saveSettings();
				}))
			.addButton(button => button
				.setButtonText('Test')
				.setCta()
				.onClick(async () => {
					button.setButtonText('Testing...');
					button.setDisabled(true);

					const result = await this.plugin.transcriptionService.testApiKey(
						this.plugin.settings.openaiApiKey,
						'openai'
					);

					new Notice(result.message, result.success ? 3000 : 5000);
					if (result.details) {
						console.log('OpenAI API Test Details:', result.details);
					}

					button.setButtonText('Test');
					button.setDisabled(false);
				}));

		// Groq API Key Setup Guide
		const groqGuide = containerEl.createDiv({ cls: 'setting-item-description api-guide' });
		groqGuide.innerHTML = `
			<strong>How to get Groq API Key (Recommended - FREE!):</strong><br>
			1. Go to <a href="https://console.groq.com/keys">console.groq.com/keys</a><br>
			2. Sign up with Google/GitHub<br>
			3. Click "Create API Key"<br>
			4. Copy the key (starts with <code>gsk_</code>)<br>
			<em>Groq is free and extremely fast!</em>
		`;

		// Groq API Key
		new Setting(containerEl)
			.setName('Groq API Key')
			.setDesc('Whisper Large V3 - Extremely fast transcription (FREE)')
			.addText(text => text
				.setPlaceholder('gsk_...')
				.setValue(this.plugin.settings.groqApiKey)
				.onChange(async (value) => {
					this.plugin.settings.groqApiKey = value;
					await this.plugin.saveSettings();
				}))
			.addButton(button => button
				.setButtonText('Test')
				.setCta()
				.onClick(async () => {
					button.setButtonText('Testing...');
					button.setDisabled(true);

					const result = await this.plugin.transcriptionService.testApiKey(
						this.plugin.settings.groqApiKey,
						'groq'
					);

					new Notice(result.message, result.success ? 3000 : 5000);
					if (result.details) {
						console.log('Groq API Test Details:', result.details);
					}

					button.setButtonText('Test');
					button.setDisabled(false);
				}));

		// --- Storage Settings Section ---
		containerEl.createEl('h3', {text: 'Storage'});
		new Setting(containerEl)
			.setName('Save Audio Recordings')
			.setDesc('Save recorded audio files to vault. If disabled, only transcribed text will be inserted.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.saveAudioFiles)
				.onChange(async (value) => {
					this.plugin.settings.saveAudioFiles = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show/hide folder setting
				}));

		if (this.plugin.settings.saveAudioFiles) {
			new Setting(containerEl)
				.setName('Audio Save Folder')
				.setDesc('Folder to save recorded audio files. Leave empty for vault root. Example: "Recordings" or "Assets/Audio"')
				.addText(text => text
					.setPlaceholder('Recordings')
					.setValue(this.plugin.settings.audioSaveFolder)
					.onChange(async (value) => {
						this.plugin.settings.audioSaveFolder = value;
						await this.plugin.saveSettings();
					}));
		}

		// --- Other Settings Section ---
		containerEl.createEl('h3', {text: 'Transcription Options'});
		new Setting(containerEl)
			.setName(DIARIZATION_NOTE.LABEL)
			.setDesc(DIARIZATION_NOTE.INFO)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableSpeakerDiarization)
				.onChange(async (value) => {
					this.plugin.settings.enableSpeakerDiarization = value;
					await this.plugin.saveSettings();
				}));
				
		new Setting(containerEl)
			.setName('Default Language')
			.setDesc('Language code for transcription (e.g., en, ko, ja). Use "auto" for auto-detection.')
			.addDropdown(drop => {
                // We could use constant here, but for simplicity in main.ts logic:
                const langs = [
                    { code: 'auto', name: 'Auto Detect' },
                    { code: 'en', name: 'English' },
                    { code: 'ko', name: 'Korean' },
                    { code: 'ja', name: 'Japanese' },
                ];
                langs.forEach(lang => {
                    drop.addOption(lang.code, lang.name);
                });
                drop.setValue(this.plugin.settings.language)
                    .onChange(async (value) => {
                        this.plugin.settings.language = value;
                        await this.plugin.saveSettings();
                    });
            });
	}
}
