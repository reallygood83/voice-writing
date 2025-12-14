import { App, Modal, Setting, TFile } from 'obsidian';
import {
    ServiceProvider,
    SUPPORTED_LANGUAGES,
    DIARIZATION_NOTE,
    SUPPORTED_AUDIO_FORMATS,
    AUDIO_MIME_TYPES,
    BUILT_IN_TEMPLATES,
    FormattingTemplate,
    TEMPLATE_MESSAGES,
    API_CONFIG
} from './constants';

export class RecordingModal extends Modal {
    private timerEl: HTMLElement;
    private startTime: number;
    private timerInterval: number;
    private onStop: () => void;

    constructor(app: App, onStop: () => void) {
        super(app);
        this.onStop = onStop;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('voice-writing-recording-modal');

        // Main Container clearly indicating recording state
        const container = contentEl.createDiv({ cls: 'recording-container' });
        
        // Icon with pulse animation
        const iconWrapper = container.createDiv({ cls: 'recording-icon-wrapper' });
        iconWrapper.createDiv({ cls: 'recording-pulse-ring' });
        iconWrapper.createEl('span', { text: '', cls: 'recording-icon mic-icon' });

        // Text
        container.createEl('h2', { text: 'Recording in Progress...' });
        
        // Timer
        this.timerEl = container.createDiv({ cls: 'recording-timer', text: '00:00' });
        this.startTime = Date.now();
        this.timerInterval = window.setInterval(() => this.updateTimer(), 1000);

        // Stop Button
        const btnContainer = container.createDiv({ cls: 'recording-controls' });
        const stopBtn = btnContainer.createEl('button', { 
            text: 'Stop Recording', 
            cls: 'mod-cta stop-recording-btn' 
        });
        stopBtn.onclick = () => {
            this.onStop();
            this.close();
        };

        // Click outside to close (optional, but better to keep it focused)
        // this.modalEl.addClass('modal-persistent'); // If we want to prevent closing by clicking background
    }

    updateTimer() {
        if (!this.timerEl) return;
        const diff = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(diff / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');
        this.timerEl.setText(`${mins}:${secs}`);
    }

    onClose() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.contentEl.empty();
    }
}

export class ProcessingModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('voice-writing-processing-modal');

        const container = contentEl.createDiv({ cls: 'processing-container' });

        // Improved Spinner
        const spinner = container.createDiv({ cls: 'voice-writing-spinner' });
        spinner.createDiv({ cls: 'double-bounce1' });
        spinner.createDiv({ cls: 'double-bounce2' });

        container.createEl('h2', { text: 'Transcribing...' });
        container.createEl('p', { text: 'Sending audio to AI for text conversion.' });
        container.createEl('small', { text: 'This usually takes a few seconds.', cls: 'processing-hint' });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class QuickOptionModal extends Modal {
    onSelect: (language: string, service: ServiceProvider, diarization: boolean) => void;
    currentLanguage: string;
    currentService: ServiceProvider;
    currentDiarization: boolean;

    constructor(
        app: App,
        currentLanguage: string,
        currentService: ServiceProvider,
        currentDiarization: boolean,
        onSelect: (l: string, s: ServiceProvider, d: boolean) => void
    ) {
        super(app);
        this.currentLanguage = currentLanguage;
        this.currentService = currentService;
        this.currentDiarization = currentDiarization;
        this.onSelect = onSelect;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Voice Writing Options' });

        let tempLanguage = this.currentLanguage;
        let tempService = this.currentService;
        let tempDiarization = this.currentDiarization;

        new Setting(contentEl)
            .setName('Language')
            .setDesc('Select audio language')
            .addDropdown(drop => {
                SUPPORTED_LANGUAGES.forEach(lang => {
                    drop.addOption(lang.code, lang.name);
                });
                drop.setValue(tempLanguage)
                    .onChange(value => tempLanguage = value);
            });

        new Setting(contentEl)
            .setName('Service')
            .setDesc('Transcription provider')
            .addDropdown(drop => drop
                .addOption('openai', 'OpenAI Whisper')
                .addOption('groq', 'Groq (Fast)')
                .setValue(tempService)
                .onChange(value => tempService = value as ServiceProvider)
            );

        new Setting(contentEl)
            .setName(DIARIZATION_NOTE.LABEL)
            .setDesc(DIARIZATION_NOTE.INFO)
            .addToggle(toggle => toggle
                .setValue(tempDiarization)
                .onChange(value => tempDiarization = value)
            );

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Apply')
                .setCta()
                .onClick(() => {
                    this.onSelect(tempLanguage, tempService, tempDiarization);
                    this.close();
                })
            );
    }

    onClose() {
        this.contentEl.empty();
    }
}

export class FileUploadModal extends Modal {
    private onFileSelected: (file: File) => void;
    private fileInputEl: HTMLInputElement;

    constructor(app: App, onFileSelected: (file: File) => void) {
        super(app);
        this.onFileSelected = onFileSelected;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('voice-writing-upload-modal');

        const container = contentEl.createDiv({ cls: 'upload-container' });

        // Title
        container.createEl('h2', { text: 'Upload Audio File' });
        container.createEl('p', {
            text: 'Select an audio file to transcribe.',
            cls: 'upload-description'
        });

        // Supported formats info
        const formatsInfo = container.createDiv({ cls: 'supported-formats' });
        formatsInfo.createEl('small', {
            text: `Supported: ${SUPPORTED_AUDIO_FORMATS.join(', ')} (Max ${API_CONFIG.MAX_FILE_SIZE_MB}MB)`
        });

        // Drop zone
        const dropZone = container.createDiv({ cls: 'upload-drop-zone' });
        dropZone.createEl('span', { text: '', cls: 'upload-icon audio-icon' });
        dropZone.createEl('p', { text: 'Drag & drop audio file here' });
        dropZone.createEl('p', { text: 'or', cls: 'upload-or' });

        // Hidden file input
        this.fileInputEl = dropZone.createEl('input', {
            type: 'file',
            cls: 'upload-file-input'
        }) as HTMLInputElement;
        this.fileInputEl.accept = SUPPORTED_AUDIO_FORMATS.map(ext => `.${ext}`).join(',');
        this.fileInputEl.style.display = 'none';

        // Browse button
        const browseBtn = dropZone.createEl('button', {
            text: 'Browse Files',
            cls: 'mod-cta upload-browse-btn'
        });
        browseBtn.onclick = () => this.fileInputEl.click();

        // File input change handler
        this.fileInputEl.onchange = () => {
            const files = this.fileInputEl.files;
            if (files && files.length > 0) {
                this.handleFile(files[0]);
            }
        };

        // Drag and drop handlers
        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.addClass('drag-over');
        };
        dropZone.ondragleave = () => {
            dropZone.removeClass('drag-over');
        };
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.removeClass('drag-over');
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                this.handleFile(files[0]);
            }
        };

        // Cancel button
        const btnContainer = container.createDiv({ cls: 'upload-buttons' });
        const cancelBtn = btnContainer.createEl('button', {
            text: 'Cancel',
            cls: 'upload-cancel-btn'
        });
        cancelBtn.onclick = () => this.close();
    }

    private handleFile(file: File) {
        // Check file extension
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (!SUPPORTED_AUDIO_FORMATS.includes(ext as any)) {
            // Show error
            const errorEl = this.contentEl.querySelector('.upload-error');
            if (errorEl) errorEl.remove();
            const error = this.contentEl.createDiv({ cls: 'upload-error' });
            error.createEl('span', { text: TEMPLATE_MESSAGES.INVALID_FILE_TYPE });
            return;
        }

        // Check file size
        const maxSize = API_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024;
        if (file.size > maxSize) {
            const errorEl = this.contentEl.querySelector('.upload-error');
            if (errorEl) errorEl.remove();
            const error = this.contentEl.createDiv({ cls: 'upload-error' });
            error.createEl('span', { text: TEMPLATE_MESSAGES.FILE_TOO_LARGE });
            return;
        }

        // Valid file - close modal and call callback
        this.onFileSelected(file);
        this.close();
    }

    onClose() {
        this.contentEl.empty();
    }
}

export class TemplateSelectionModal extends Modal {
    private onTemplateSelected: (template: FormattingTemplate | null) => void;
    private customTemplates: FormattingTemplate[];

    constructor(
        app: App,
        customTemplates: FormattingTemplate[],
        onTemplateSelected: (template: FormattingTemplate | null) => void
    ) {
        super(app);
        this.customTemplates = customTemplates;
        this.onTemplateSelected = onTemplateSelected;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('voice-writing-template-modal');

        const container = contentEl.createDiv({ cls: 'template-container' });

        // Title
        container.createEl('h2', { text: 'Format Transcription' });
        container.createEl('p', {
            text: TEMPLATE_MESSAGES.SELECT_TEMPLATE,
            cls: 'template-description'
        });

        // Template grid
        const grid = container.createDiv({ cls: 'template-grid' });

        // Built-in templates
        for (const template of BUILT_IN_TEMPLATES) {
            this.createTemplateCard(grid, template);
        }

        // Custom templates section
        if (this.customTemplates.length > 0) {
            container.createEl('h3', { text: 'Custom Templates', cls: 'custom-templates-header' });
            const customGrid = container.createDiv({ cls: 'template-grid' });
            for (const template of this.customTemplates) {
                this.createTemplateCard(customGrid, template);
            }
        }

        // Cancel button
        const btnContainer = container.createDiv({ cls: 'template-buttons' });
        const cancelBtn = btnContainer.createEl('button', {
            text: 'Skip (Use Raw Text)',
            cls: 'template-skip-btn'
        });
        cancelBtn.onclick = () => {
            this.onTemplateSelected(null);
            this.close();
        };
    }

    private createTemplateCard(parent: HTMLElement, template: FormattingTemplate) {
        const card = parent.createDiv({ cls: 'template-card' });

        // Icon based on template type (using CSS classes instead of emojis for compatibility)
        const iconClasses: Record<string, string> = {
            'none': 'template-icon-none',
            'meeting': 'template-icon-meeting',
            'lecture': 'template-icon-lecture',
            'idea': 'template-icon-idea',
            'interview': 'template-icon-interview',
            'custom': 'template-icon-custom'
        };
        const iconClass = iconClasses[template.id] || 'template-icon-default';

        card.createEl('span', { cls: `template-icon ${iconClass}` });
        card.createEl('h4', { text: template.nameKo || template.name });
        card.createEl('p', { text: template.description, cls: 'template-desc' });

        card.onclick = () => {
            this.onTemplateSelected(template);
            this.close();
        };
    }

    onClose() {
        this.contentEl.empty();
    }
}
