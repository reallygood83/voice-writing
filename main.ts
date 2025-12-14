import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, requestUrl } from 'obsidian';
import { MicrophoneRecorder, RecordingError } from './src/recorder';
import { TranscriptionService } from './src/transcription';
import { RecordingModal, ProcessingModal, QuickOptionModal } from './src/modals';
import { ServiceProvider, SUCCESS_MESSAGES, ERROR_MESSAGES } from './src/constants';

interface VoiceWritingSettings {
	apiKey: string;
	language: string;
	serviceProvider: ServiceProvider;
}

const DEFAULT_SETTINGS: VoiceWritingSettings = {
	apiKey: '',
	language: 'auto',
	serviceProvider: 'openai'
}

export default class VoiceWritingPlugin extends Plugin {
	settings: VoiceWritingSettings;
	recorder: MicrophoneRecorder;
	transcriptionService: TranscriptionService;
	statusBarItem: HTMLElement;
	ribbonIconEl: HTMLElement;
	recordingModal: RecordingModal | null = null;

	async onload() {
		await this.loadSettings();

		this.recorder = new MicrophoneRecorder();
		this.transcriptionService = new TranscriptionService();

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
				new QuickOptionModal(this.app, this.settings.language, this.settings.serviceProvider, async (lang, service) => {
					this.settings.language = lang;
					this.settings.serviceProvider = service;
					await this.saveSettings();
					new Notice(SUCCESS_MESSAGES.SETTINGS_SAVED(service, lang));
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

			// 1. Save Audio File
			const fileName = `recording-${Date.now()}.webm`;
			const arrayBuffer = await blob.arrayBuffer();
			await this.app.vault.createBinary(fileName, new Uint8Array(arrayBuffer));
			
			// 2. Transcribe
			try {
				const result = await this.transcriptionService.transcribe(
					blob, 
					this.settings.apiKey, 
					this.settings.language, 
					this.settings.serviceProvider
				);

				processingModal.close();
				new Notice(SUCCESS_MESSAGES.TRANSCRIPTION_COMPLETE);
				this.updateStatusBar('Idle');

				// 3. Insert into Editor
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView) {
					const editor = activeView.editor;
					const template = `![[${fileName}]]\n\n${result.text}\n`;
					editor.replaceSelection(template);
				} else {
					// No active editor - copy to clipboard
					new Notice(SUCCESS_MESSAGES.COPIED_TO_CLIPBOARD);
					navigator.clipboard.writeText(result.text);
				}

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
					new Notice('❌ Transcription failed. Audio saved locally.');
				}

				// Still insert the audio link
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView) {
					activeView.editor.replaceSelection(`![[${fileName}]]\n`);
				}
			}

		} catch (error) {
			// This catches recorder stop errors (e.g. no recording active)
			this.ribbonIconEl.removeClass('voice-writing-recording');
			this.updateStatusBar('Idle');
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

		new Setting(containerEl)
			.setName('API Key')
			.setDesc(`Enter your ${this.plugin.settings.serviceProvider === 'openai' ? 'OpenAI' : 'Groq'} API Key`)
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}))
			.addButton(button => button
				.setButtonText('Test API Key')
				.setCta()
				.onClick(async () => {
					button.setButtonText('Testing...');
					button.setDisabled(true);

					const result = await this.plugin.transcriptionService.testApiKey(
						this.plugin.settings.apiKey,
						this.plugin.settings.serviceProvider
					);

					new Notice(result.message, result.success ? 3000 : 5000);
					if (result.details) {
						console.log('API Test Details:', result.details);
					}

					button.setButtonText('Test API Key');
					button.setDisabled(false);
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
