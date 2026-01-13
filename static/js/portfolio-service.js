/**
 * Portfolio Service - Manages portfolio persistence and state
 * Mimics Angular service pattern for clean architecture
 */

class PortfolioService {
    constructor() {
        this.storageKey = 'portfolio_library';
        this.currentPortfolioId = null;
        this.unsavedChanges = false;
        this.saveStatus = 'saved'; // 'saved', 'saving', 'unsaved'
        this.versionHistory = [];
        this.maxVersions = 50;
        this.undoStack = [];
        this.redoStack = [];
        this.autosaveDebounceTimer = null;
        this.autosaveDelay = 2000; // 2 seconds
        this.autosaveEnabled = true; // Flag to disable autosave during load
        this.isLoading = false; // Flag to prevent state overwrites during load
    }

    /**
     * Generate UUID for portfolio ID
     */
    generateId() {
        return 'portfolio_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get all saved portfolios from LocalStorage
     */
    getAllPortfolios() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored) return [];
            const portfolios = JSON.parse(stored);
            return Array.isArray(portfolios) ? portfolios : [];
        } catch (error) {
            console.error('Error loading portfolios:', error);
            return [];
        }
    }

    /**
     * Get portfolio by ID
     */
    getPortfolio(id) {
        const portfolios = this.getAllPortfolios();
        return portfolios.find(p => p.id === id) || null;
    }

    /**
     * Save portfolio to LocalStorage with optional versioning
     */
    savePortfolio(portfolioData, createVersion = false) {
        try {
            this.saveStatus = 'saving';
            this.updateSaveStatus();
            
            const portfolios = this.getAllPortfolios();
            
            // Validate portfolio data
            if (!portfolioData.title || !portfolioData.title.trim()) {
                throw new Error('Portfolio title is required');
            }

            const portfolioId = portfolioData.id || this.generateId();
            const existingIndex = portfolios.findIndex(p => p.id === portfolioId);
            const existing = existingIndex >= 0 ? portfolios[existingIndex] : null;

            // Create version snapshot if needed
            if (createVersion && existing) {
                this.createVersionSnapshot(portfolioId, existing);
            }

            const portfolio = {
                id: portfolioId,
                title: portfolioData.title.trim(),
                createdAt: existing ? existing.createdAt : new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                pages: portfolioData.pages || [],
                globalTheme: portfolioData.globalTheme || {},
                blocks: portfolioData.blocks || [],
                version: this.incrementVersion(existing ? existing.version : '1.0.0'),
                // Editor state
                editorState: portfolioData.editorState || {},
                // Metadata
                pagesCount: portfolioData.pages ? portfolioData.pages.length : 1,
                blocksCount: portfolioData.blocks ? portfolioData.blocks.length : 0
            };

            // Check if portfolio exists
            if (existingIndex >= 0) {
                // Update existing
                portfolios[existingIndex] = portfolio;
            } else {
                // Add new
                portfolios.push(portfolio);
            }

            try {
                const serialized = JSON.stringify(portfolios);
                if (!serialized || serialized === 'null') {
                    throw new Error('Serialization failed: empty or null data');
                }
                
                localStorage.setItem(this.storageKey, serialized);
                
                const verify = localStorage.getItem(this.storageKey);
                if (!verify || verify !== serialized) {
                    throw new Error('Save verification failed: data mismatch');
                }
                
                this.unsavedChanges = false;
                this.saveStatus = 'saved';
                this.updateSaveStatus();
                this.currentPortfolioId = portfolioId;
                
                return portfolio;
            } catch (storageError) {
                if (storageError.name === 'QuotaExceededError' || storageError.code === 22) {
                    const error = new Error('Недостаточно места в хранилище браузера. Очистите старые портфолио или используйте экспорт.');
                    console.error('Storage quota exceeded:', error);
                    throw error;
                }
                throw storageError;
            }
        } catch (error) {
            console.error('Error saving portfolio:', error);
            this.saveStatus = 'unsaved';
            this.updateSaveStatus();
            throw error;
        }
    }

    /**
     * Increment version number
     */
    incrementVersion(currentVersion) {
        try {
            const parts = (currentVersion || '1.0.0').split('.');
            const major = parseInt(parts[0]) || 1;
            const minor = parseInt(parts[1]) || 0;
            const patch = parseInt(parts[2]) || 0;
            
            return `${major}.${minor}.${patch + 1}`;
        } catch (error) {
            return '1.0.0';
        }
    }

    /**
     * Delete portfolio
     */
    deletePortfolio(id) {
        try {
            const portfolios = this.getAllPortfolios();
            const filtered = portfolios.filter(p => p.id !== id);
            localStorage.setItem(this.storageKey, JSON.stringify(filtered));
            return true;
        } catch (error) {
            console.error('Error deleting portfolio:', error);
            throw error;
        }
    }

    /**
     * Duplicate portfolio
     */
    duplicatePortfolio(id) {
        try {
            const original = this.getPortfolio(id);
            if (!original) {
                throw new Error('Portfolio not found');
            }

            const duplicate = {
                ...original,
                id: this.generateId(),
                title: original.title + ' (Копия)',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            return this.savePortfolio(duplicate);
        } catch (error) {
            console.error('Error duplicating portfolio:', error);
            throw error;
        }
    }

    /**
     * Serialize current editor state to portfolio format
     */
    serializeEditorState() {
        try {
            // Get all form values
            const name = document.getElementById('portfolio-name')?.value || 'Мое портфолио';
            const profession = document.getElementById('portfolio-profession')?.value || '';
            const description = document.getElementById('portfolio-description')?.value || '';
            
            // Colors - save in both formats for compatibility
            const primaryColor = document.getElementById('color-primary')?.value || '#2563EB';
            const accentColor = document.getElementById('color-accent')?.value || '#1E40AF';
            const bgColor = document.getElementById('color-background')?.value || '#ffffff';
            const bgColor2 = document.getElementById('color-background-2')?.value || '#f3f4f6';
            // CRITICAL: Always get backgroundType, default to 'solid' if not set
            const backgroundTypeSelect = document.getElementById('background-type');
            const backgroundType = backgroundTypeSelect?.value || 'solid';
            const cardBgColor = document.getElementById('color-card-background')?.value || '';
            
            // Log for debugging
            const colorScheme = {
                // New format (used by renderer)
                primary: primaryColor,
                accent: accentColor,
                background: bgColor,
                background2: bgColor2,
                backgroundType: backgroundType, // CRITICAL: Always include backgroundType
                cardBackground: cardBgColor,
                // Legacy format (for compatibility)
                primary_color: primaryColor,
                accent_color: accentColor,
                background_color: bgColor,
                background_color_2: bgColor2,
                card_background: cardBgColor
            };

            // Text settings
            const textSettings = {
                fontFamily: document.getElementById('text-font-family')?.value || 'Inter',
                fontWeight: document.getElementById('text-font-weight')?.value || '400',
                lineHeight: document.getElementById('text-line-height')?.value || '1.6',
                letterSpacing: document.getElementById('text-letter-spacing')?.value || '0',
                h1Size: document.getElementById('text-h1-size')?.value || '48',
                h2Size: document.getElementById('text-h2-size')?.value || '24',
                bodySize: document.getElementById('text-body-size')?.value || '16',
                textAlign: document.querySelector('.text-align-btn.active')?.dataset.align || 'center'
            };

            // Layout settings
            const layoutSettings = {
                layoutType: document.getElementById('layout-type')?.value || 'centered',
                gridColumns: document.querySelector('.grid-cols-btn.active')?.dataset.cols || '2',
                itemPreviewSize: document.getElementById('item-preview-size')?.value || '128',
                blockSpacing: document.getElementById('block-spacing')?.value || '24',
                cardStyle: document.querySelector('.card-style-btn.active')?.dataset.style || 'elevated',
                borderRadiusPreset: document.querySelector('.border-radius-btn.active')?.dataset.radius || 'medium',
                spacingPreset: document.querySelector('.spacing-preset-btn.active')?.dataset.preset || 'normal'
            };

            // Avatar
            const avatarShape = document.querySelector('.avatar-shape-btn.active')?.dataset.shape || 'circle';
            const avatar = document.getElementById('avatar-preview');
            const avatarSrc = avatar && avatar.tagName === 'IMG' ? avatar.src : (avatar && avatar.querySelector('img') ? avatar.querySelector('img').src : '');

            // Contact info
            const contacts = {
                phone: document.getElementById('portfolio-phone')?.value || '',
                email: document.getElementById('portfolio-email')?.value || '',
                website: document.getElementById('portfolio-website')?.value || '',
                location: document.getElementById('portfolio-location')?.value || ''
            };

            // Social links
            const socialLinks = {};
            document.querySelectorAll('.social-link-item').forEach(item => {
                const platform = item.querySelector('.social-platform')?.value;
                const url = item.querySelector('.social-url')?.value;
                if (platform && url) {
                    socialLinks[platform] = url;
                }
            });

            // Skills
            const skills = Array.from(document.querySelectorAll('.skill-input'))
                .map(input => input.value.trim())
                .filter(skill => skill);

            // Experience
            const experience = Array.from(document.querySelectorAll('.experience-item')).map(item => ({
                position: item.querySelector('.exp-position')?.value.trim() || '',
                company: item.querySelector('.exp-company')?.value.trim() || '',
                period: item.querySelector('.exp-period')?.value.trim() || '',
                description: item.querySelector('.exp-description')?.value.trim() || ''
            })).filter(exp => exp.position || exp.company);

            // Education
            const education = Array.from(document.querySelectorAll('.education-item')).map(item => ({
                institution: item.querySelector('.edu-institution')?.value.trim() || '',
                specialty: item.querySelector('.edu-specialty')?.value.trim() || '',
                period: item.querySelector('.edu-period')?.value.trim() || '',
                description: item.querySelector('.edu-description')?.value.trim() || ''
            })).filter(edu => edu.institution);

            // Certificates
            const certificates = Array.from(document.querySelectorAll('.certificate-item')).map(item => ({
                name: item.querySelector('.cert-name')?.value.trim() || '',
                organization: item.querySelector('.cert-organization')?.value.trim() || '',
                date: item.querySelector('.cert-date')?.value || '',
                link: item.querySelector('.cert-link')?.value.trim() || ''
            })).filter(cert => cert.name);

            // Languages
            const languages = Array.from(document.querySelectorAll('.language-item')).map(item => ({
                language: item.querySelector('.lang-language')?.value.trim() || '',
                level: item.querySelector('.lang-level')?.value || 'beginner'
            })).filter(lang => lang.language);

            // Block visibility
            const blockVisibility = {
                contacts: document.getElementById('block-contacts')?.checked !== false,
                skills: document.getElementById('block-skills')?.checked !== false,
                experience: document.getElementById('block-experience')?.checked !== false,
                education: document.getElementById('block-education')?.checked !== false,
                certificates: document.getElementById('block-certificates')?.checked !== false,
                languages: document.getElementById('block-languages')?.checked !== false,
                works: document.getElementById('block-works')?.checked !== false
            };

            // Portfolio items (works)
            const items = window.portfolioItems || [];

            // Custom blocks
            const customBlocks = window.customBlocks || [];

            return {
                title: name,
                editorState: {
                    name,
                    profession,
                    description,
                    colorScheme: {
                        // New format (used by renderer)
                        primary: primaryColor,
                        accent: accentColor,
                        background: bgColor,
                background2: bgColor2,
                backgroundType: backgroundType,
                cardBackground: cardBgColor,
                // Legacy format (for compatibility)
                        primary_color: primaryColor,
                        accent_color: accentColor,
                        background_color: bgColor,
                        background_color_2: bgColor2
                    },
                    textSettings,
                    layoutSettings: {
                        ...layoutSettings,
                        borderRadiusPreset: layoutSettings.borderRadiusPreset || layoutSettings.borderRadius || 'medium',
                        spacingPreset: layoutSettings.spacingPreset || 'normal',
                        cardStyle: layoutSettings.cardStyle || 'elevated'
                    },
                    avatarShape,
                    avatar: avatarSrc, // Save as 'avatar' for renderer
                    avatarSrc: avatarSrc, // Keep for backward compatibility
                    contacts,
                    socialLinks: Object.entries(socialLinks).map(([platform, url]) => ({ platform, url })), // Convert to array format
                    skills,
                    experience,
                    education,
                    certificates,
                    languages,
                    blockVisibility: {
                        'block-contacts': blockVisibility.contacts,
                        'block-skills': blockVisibility.skills,
                        'block-experience': blockVisibility.experience,
                        'block-education': blockVisibility.education,
                        'block-certificates': blockVisibility.certificates,
                        'block-languages': blockVisibility.languages,
                        'block-works': blockVisibility.works
                    },
                    items,
                    customBlocks
                },
                globalTheme: {
                    colors: {
                        primary_color: primaryColor,
                        accent_color: accentColor,
                        background_color: bgColor,
                        background_color_2: bgColor2,
                        card_background: cardBgColor
                    },
                    typography: textSettings,
                    layout: layoutSettings
                },
                blocks: [
                    { type: 'hero', visible: true, order: 0 },
                    { type: 'contacts', visible: blockVisibility.contacts, order: 1 },
                    { type: 'skills', visible: blockVisibility.skills, order: 2 },
                    { type: 'experience', visible: blockVisibility.experience, order: 3 },
                    { type: 'education', visible: blockVisibility.education, order: 4 },
                    { type: 'certificates', visible: blockVisibility.certificates, order: 5 },
                    { type: 'languages', visible: blockVisibility.languages, order: 6 },
                    { type: 'works', visible: blockVisibility.works, order: 7 }
                ],
                pages: [{ id: 'home', title: 'Главная', blocks: [] }]
            };
        } catch (error) {
            console.error('Error serializing editor state:', error);
            throw error;
        }
    }

    /**
     * Load portfolio into editor
     * CRITICAL: This must COMPLETELY replace editor state, not merge with defaults
     */
    loadPortfolioIntoEditor(portfolio) {
        try {
            if (!portfolio || !portfolio.editorState) {
                console.error('Invalid portfolio data:', portfolio);
                throw new Error('Invalid portfolio data');
            }

            const state = portfolio.editorState;
            
            // CRITICAL: Disable autosave and set loading flag to prevent overwriting
            const wasAutosaveEnabled = this.autosaveEnabled;
            this.autosaveEnabled = false;
            this.isLoading = true;
            
            // Clear any pending autosave
            if (this.autosaveDebounceTimer) {
                clearTimeout(this.autosaveDebounceTimer);
                this.autosaveDebounceTimer = null;
            }

            // Basic info
            if (document.getElementById('portfolio-name')) {
                document.getElementById('portfolio-name').value = state.name || '';
            }
            if (document.getElementById('portfolio-profession')) {
                document.getElementById('portfolio-profession').value = state.profession || '';
            }
            if (document.getElementById('portfolio-description')) {
                document.getElementById('portfolio-description').value = state.description || '';
            }

            // Colors - support both new and legacy formats
            if (state.colorScheme) {
                const primaryColor = state.colorScheme.primary || state.colorScheme.primary_color || '#2563EB';
                const accentColor = state.colorScheme.accent || state.colorScheme.accent_color || '#1E40AF';
                const bgColor = state.colorScheme.background || state.colorScheme.background_color || '#ffffff';
                const bgColor2 = state.colorScheme.background2 || state.colorScheme.background_color_2 || '#f3f4f6';
                const cardBgColor = state.colorScheme.cardBackground || state.colorScheme.card_background;
                
                if (document.getElementById('color-primary')) {
                    document.getElementById('color-primary').value = primaryColor;
                }
                if (document.getElementById('color-accent')) {
                    document.getElementById('color-accent').value = accentColor;
                }
                if (document.getElementById('color-background')) {
                    document.getElementById('color-background').value = bgColor;
                }
                if (document.getElementById('color-background-2')) {
                    document.getElementById('color-background-2').value = bgColor2;
                }
                if (cardBgColor && document.getElementById('color-card-background')) {
                    document.getElementById('color-card-background').value = cardBgColor;
                }
                
                // Update background type - CRITICAL: Always set backgroundType (default to 'solid' if not specified)
                const savedBackgroundType = state.colorScheme.backgroundType || 'solid';
                
                // CRITICAL: Update ALL background-type selects FIRST (synchronously, before any async operations)
                document.querySelectorAll('#background-type').forEach(select => {
                    select.value = savedBackgroundType;
                });
                
                // Update UI elements (show/hide gradient control, update previews)
                const gradientControl = document.getElementById('gradient-opacity-control');
                const backgroundPreview = document.getElementById('background-preview');
                const gradientPreview = document.getElementById('gradient-preview');
                
                if (savedBackgroundType === 'gradient') {
                    if (gradientControl) gradientControl.classList.remove('hidden');
                    if (backgroundPreview) {
                        backgroundPreview.style.background = `linear-gradient(135deg, ${bgColor} 0%, ${bgColor2} 100%)`;
                    }
                    if (gradientPreview) {
                        gradientPreview.style.background = `linear-gradient(135deg, ${bgColor} 0%, ${bgColor2} 100%)`;
                    }
                } else {
                    if (gradientControl) gradientControl.classList.add('hidden');
                    if (backgroundPreview) backgroundPreview.style.background = bgColor;
                }
                
                // Update text inputs for background colors
                const bgTextInput = document.getElementById('color-background-text');
                if (bgTextInput) bgTextInput.value = bgColor;
                const bg2TextInput = document.getElementById('color-background-2-text');
                if (bg2TextInput) bg2TextInput.value = bgColor2;
                
                // CRITICAL: Trigger change event to ensure all handlers are notified
                setTimeout(() => {
                    document.querySelectorAll('#background-type').forEach(select => {
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                }, 50);
            } else {
                // CRITICAL: Even if backgroundType is not in saved state, ensure DOM has a value
                // This prevents undefined behavior
                document.querySelectorAll('#background-type').forEach(select => {
                    if (!select.value) select.value = 'solid';
                });
            }

            // Text settings - CRITICAL: Load all values including display values
            if (state.textSettings) {
                const ts = state.textSettings;
                if (document.getElementById('text-font-family')) {
                    const fontFamily = ts.fontFamily || 'Inter';
                    document.getElementById('text-font-family').value = fontFamily;
                    // Load font if needed
                    if (window.PortfolioRenderer && fontFamily !== 'Inter') {
                        window.PortfolioRenderer.loadFont(fontFamily);
                    }
                }
                if (document.getElementById('text-font-weight')) {
                    document.getElementById('text-font-weight').value = ts.fontWeight || '400';
                }
                if (document.getElementById('text-line-height')) {
                    const lineHeight = ts.lineHeight || '1.6';
                    document.getElementById('text-line-height').value = lineHeight;
                    const lineHeightDisplay = document.getElementById('text-line-height-value');
                    if (lineHeightDisplay) lineHeightDisplay.textContent = parseFloat(lineHeight).toFixed(1);
                }
                if (document.getElementById('text-letter-spacing')) {
                    const letterSpacing = ts.letterSpacing || '0';
                    document.getElementById('text-letter-spacing').value = letterSpacing;
                    const letterSpacingDisplay = document.getElementById('text-letter-spacing-value');
                    if (letterSpacingDisplay) letterSpacingDisplay.textContent = letterSpacing + 'px';
                }
                if (document.getElementById('text-h1-size')) {
                    const h1Size = ts.h1Size || '48';
                    document.getElementById('text-h1-size').value = h1Size;
                    const h1SizeDisplay = document.getElementById('text-h1-size-value');
                    if (h1SizeDisplay) h1SizeDisplay.textContent = h1Size + 'px';
                }
                if (document.getElementById('text-h2-size')) {
                    const h2Size = ts.h2Size || '24';
                    document.getElementById('text-h2-size').value = h2Size;
                    const h2SizeDisplay = document.getElementById('text-h2-size-value');
                    if (h2SizeDisplay) h2SizeDisplay.textContent = h2Size + 'px';
                }
                if (document.getElementById('text-body-size')) {
                    const bodySize = ts.bodySize || '16';
                    document.getElementById('text-body-size').value = bodySize;
                    const bodySizeDisplay = document.getElementById('text-body-size-value');
                    if (bodySizeDisplay) bodySizeDisplay.textContent = bodySize + 'px';
                }
                if (ts.textAlign && window.setTextAlign) {
                    window.setTextAlign(ts.textAlign);
                }
            }

            // Layout settings
            if (state.layoutSettings) {
                const ls = state.layoutSettings;
                if (document.getElementById('layout-type')) {
                    document.getElementById('layout-type').value = ls.layoutType || 'centered';
                }
                if (ls.gridColumns && window.setGridColumns) {
                    window.setGridColumns(ls.gridColumns);
                }
                if (document.getElementById('item-preview-size')) {
                    document.getElementById('item-preview-size').value = ls.itemPreviewSize || '128';
                }
                if (document.getElementById('block-spacing')) {
                    const blockSpacing = ls.blockSpacing || '24';
                    document.getElementById('block-spacing').value = blockSpacing;
                    const blockSpacingDisplay = document.getElementById('block-spacing-value');
                    if (blockSpacingDisplay) blockSpacingDisplay.textContent = blockSpacing + 'px';
                }
                if (ls.cardStyle && window.setCardStyle) {
                    window.setCardStyle(ls.cardStyle);
                }
                // Support both borderRadius and borderRadiusPreset
                const borderRadiusPreset = ls.borderRadiusPreset || ls.borderRadius || 'medium';
                if (window.setBorderRadius) {
                    window.setBorderRadius(borderRadiusPreset);
                }
                const spacingPreset = ls.spacingPreset || 'normal';
                if (window.setSpacingPreset) {
                    window.setSpacingPreset(spacingPreset);
                }
            }

            // Avatar
            // Load avatar (support both 'avatar' and 'avatarSrc' for compatibility)
            const avatarUrl = state.avatar || state.avatarSrc;
            if (avatarUrl && document.getElementById('avatar-preview')) {
                const avatarPreview = document.getElementById('avatar-preview');
                if (avatarPreview.tagName === 'IMG') {
                    avatarPreview.src = avatarUrl;
                } else {
                    avatarPreview.innerHTML = `<img src="${avatarUrl}" alt="Avatar" class="w-20 h-20 rounded-full object-cover">`;
                }
            }
            if (state.avatarShape && document.getElementById('avatar-shape')) {
                document.getElementById('avatar-shape').value = state.avatarShape;
            }

            // Contacts
            if (state.contacts) {
                if (document.getElementById('portfolio-phone')) {
                    document.getElementById('portfolio-phone').value = state.contacts.phone || '';
                }
                if (document.getElementById('portfolio-email')) {
                    document.getElementById('portfolio-email').value = state.contacts.email || '';
                }
                if (document.getElementById('portfolio-website')) {
                    document.getElementById('portfolio-website').value = state.contacts.website || '';
                }
                if (document.getElementById('portfolio-location')) {
                    document.getElementById('portfolio-location').value = state.contacts.location || '';
                }
            }

            // Social links - load into form
            if (state.socialLinks && Array.isArray(state.socialLinks) && state.socialLinks.length > 0) {
                // Wait a bit for DOM to be ready
                setTimeout(() => {
                    // Clear existing social links
                    document.querySelectorAll('.social-link-item').forEach(item => {
                        const removeBtn = item.querySelector('button[onclick*="removeSocialLink"]');
                        if (removeBtn) removeBtn.click();
                    });
                    // Add social links from saved data
                    state.socialLinks.forEach((link, index) => {
                        if (link.platform && link.url && window.addSocialLink) {
                            setTimeout(() => {
                                window.addSocialLink();
                                const items = document.querySelectorAll('.social-link-item');
                                const lastItem = items[items.length - 1];
                                if (lastItem) {
                                    const platformSelect = lastItem.querySelector('.social-platform');
                                    const urlInput = lastItem.querySelector('.social-url');
                                    if (platformSelect) platformSelect.value = link.platform;
                                    if (urlInput) urlInput.value = link.url;
                                }
                            }, index * 50);
                        }
                    });
                }, 100);
            }

            // Skills - load into form
            if (state.skills && Array.isArray(state.skills) && state.skills.length > 0) {
                setTimeout(() => {
                    // Clear existing skills
                    document.querySelectorAll('.skill-item').forEach(item => {
                        const removeBtn = item.querySelector('button[onclick*="removeSkill"]');
                        if (removeBtn) removeBtn.click();
                    });
                    // Add skills from saved data
                    state.skills.forEach((skill, index) => {
                        if (skill && window.addSkill) {
                            setTimeout(() => {
                                window.addSkill();
                                const inputs = document.querySelectorAll('.skill-input');
                                const lastInput = inputs[inputs.length - 1];
                                if (lastInput) lastInput.value = skill;
                            }, index * 50);
                        }
                    });
                }, 200);
            }

            // Experience - load into form
            if (state.experience && Array.isArray(state.experience) && state.experience.length > 0) {
                setTimeout(() => {
                    // Clear existing experience
                    document.querySelectorAll('.experience-item').forEach(item => {
                        const removeBtn = item.querySelector('button[onclick*="removeExperience"]');
                        if (removeBtn) removeBtn.click();
                    });
                    // Add experience from saved data
                    state.experience.forEach((exp, index) => {
                        if (exp && window.addExperience) {
                            setTimeout(() => {
                                window.addExperience();
                                const items = document.querySelectorAll('.experience-item');
                                const lastItem = items[items.length - 1];
                                if (lastItem) {
                                    if (exp.position && lastItem.querySelector('.exp-position')) {
                                        lastItem.querySelector('.exp-position').value = exp.position;
                                    }
                                    if (exp.company && lastItem.querySelector('.exp-company')) {
                                        lastItem.querySelector('.exp-company').value = exp.company;
                                    }
                                    if (exp.period && lastItem.querySelector('.exp-period')) {
                                        lastItem.querySelector('.exp-period').value = exp.period;
                                    }
                                    if (exp.description && lastItem.querySelector('.exp-description')) {
                                        lastItem.querySelector('.exp-description').value = exp.description;
                                    }
                                }
                            }, index * 100);
                        }
                    });
                }, 300);
            }

            // Education - load into form
            if (state.education && Array.isArray(state.education) && state.education.length > 0) {
                setTimeout(() => {
                    // Clear existing education
                    document.querySelectorAll('.education-item').forEach(item => {
                        const removeBtn = item.querySelector('button[onclick*="removeEducation"]');
                        if (removeBtn) removeBtn.click();
                    });
                    // Add education from saved data
                    state.education.forEach((edu, index) => {
                        if (edu && window.addEducation) {
                            setTimeout(() => {
                                window.addEducation();
                                const items = document.querySelectorAll('.education-item');
                                const lastItem = items[items.length - 1];
                                if (lastItem) {
                                    if (edu.institution && lastItem.querySelector('.edu-institution')) {
                                        lastItem.querySelector('.edu-institution').value = edu.institution;
                                    }
                                    if (edu.specialty && lastItem.querySelector('.edu-specialty')) {
                                        lastItem.querySelector('.edu-specialty').value = edu.specialty;
                                    }
                                    if (edu.period && lastItem.querySelector('.edu-period')) {
                                        lastItem.querySelector('.edu-period').value = edu.period;
                                    }
                                    if (edu.description && lastItem.querySelector('.edu-description')) {
                                        lastItem.querySelector('.edu-description').value = edu.description;
                                    }
                                }
                            }, index * 100);
                        }
                    });
                }, 400);
            }

            // Certificates - load into form
            if (state.certificates && Array.isArray(state.certificates) && state.certificates.length > 0) {
                setTimeout(() => {
                    // Clear existing certificates
                    document.querySelectorAll('.certificate-item').forEach(item => {
                        const removeBtn = item.querySelector('button[onclick*="removeCertificate"]');
                        if (removeBtn) removeBtn.click();
                    });
                    // Add certificates from saved data
                    state.certificates.forEach((cert, index) => {
                        if (cert && window.addCertificate) {
                            setTimeout(() => {
                                window.addCertificate();
                                const items = document.querySelectorAll('.certificate-item');
                                const lastItem = items[items.length - 1];
                                if (lastItem) {
                                    if (cert.name && lastItem.querySelector('.cert-name')) {
                                        lastItem.querySelector('.cert-name').value = cert.name;
                                    }
                                    if (cert.organization && lastItem.querySelector('.cert-organization')) {
                                        lastItem.querySelector('.cert-organization').value = cert.organization;
                                    }
                                    if (cert.date && lastItem.querySelector('.cert-date')) {
                                        lastItem.querySelector('.cert-date').value = cert.date;
                                    }
                                    if (cert.link && lastItem.querySelector('.cert-link')) {
                                        lastItem.querySelector('.cert-link').value = cert.link;
                                    }
                                }
                            }, index * 100);
                        }
                    });
                }, 500);
            }

            // Languages - load into form
            if (state.languages && Array.isArray(state.languages) && state.languages.length > 0) {
                setTimeout(() => {
                    // Clear existing languages
                    document.querySelectorAll('.language-item').forEach(item => {
                        const removeBtn = item.querySelector('button[onclick*="removeLanguage"]');
                        if (removeBtn) removeBtn.click();
                    });
                    // Add languages from saved data
                    state.languages.forEach((lang, index) => {
                        if (lang && window.addLanguage) {
                            setTimeout(() => {
                                window.addLanguage();
                                const items = document.querySelectorAll('.language-item');
                                const lastItem = items[items.length - 1];
                                if (lastItem) {
                                    if (lang.language && lastItem.querySelector('.lang-language')) {
                                        lastItem.querySelector('.lang-language').value = lang.language;
                                    }
                                    if (lang.level && lastItem.querySelector('.lang-level')) {
                                        lastItem.querySelector('.lang-level').value = lang.level;
                                    }
                                }
                            }, index * 50);
                        }
                    });
                }, 600);
            }

            // Block visibility
            if (state.blockVisibility) {
                const bv = state.blockVisibility;
                if (document.getElementById('block-contacts')) {
                    document.getElementById('block-contacts').checked = bv['block-contacts'] !== false;
                }
                if (document.getElementById('block-skills')) {
                    document.getElementById('block-skills').checked = bv['block-skills'] !== false;
                }
                if (document.getElementById('block-experience')) {
                    document.getElementById('block-experience').checked = bv['block-experience'] !== false;
                }
                if (document.getElementById('block-education')) {
                    document.getElementById('block-education').checked = bv['block-education'] !== false;
                }
                if (document.getElementById('block-certificates')) {
                    document.getElementById('block-certificates').checked = bv['block-certificates'] !== false;
                }
                if (document.getElementById('block-languages')) {
                    document.getElementById('block-languages').checked = bv['block-languages'] !== false;
                }
                if (document.getElementById('block-works')) {
                    document.getElementById('block-works').checked = bv['block-works'] !== false;
                }
            }

            // Portfolio items - CRITICAL: Must load before rendering
            window.portfolioItems = (state.items && Array.isArray(state.items)) ? state.items : [];
            
            // Custom blocks - CRITICAL: Must load before rendering
            window.customBlocks = (state.customBlocks && Array.isArray(state.customBlocks)) ? state.customBlocks : [];
            
            // Render items and blocks AFTER data is loaded
            if (window.renderItems) {
                window.renderItems();
            }
            if (window.renderCustomBlocks) {
                window.renderCustomBlocks();
            }

            // Re-enable autosave after load completes
            this.autosaveEnabled = wasAutosaveEnabled;
            this.isLoading = false;
            
            // Wait for all async operations to complete before updating preview
            setTimeout(() => {
                // Update preview AFTER all data is loaded
                if (window.updatePreview) {
                    window.updatePreview();
                }
                
            }, 1200); // Wait for all setTimeout operations to complete

            this.currentPortfolioId = portfolio.id;
            this.unsavedChanges = false;
            this.saveStatus = 'saved';
            this.updateSaveStatus();

            return true;
        } catch (error) {
            console.error('Error loading portfolio into editor:', error);
            throw error;
        }
    }

    /**
     * Mark unsaved changes
     * CRITICAL: Must NOT mark as unsaved during load
     */
    markUnsaved() {
        if (this.isLoading) return;
        this.unsavedChanges = true;
        this.saveStatus = 'unsaved';
        this.updateSaveStatus();
    }

    /**
     * Autosave with debouncing
     * CRITICAL: Must NOT run during load or it will overwrite loaded data
     */
    autosave(portfolioData) {
        if (!this.autosaveEnabled || this.isLoading) return;
        
        this.saveStatus = 'saving';
        this.updateSaveStatus();
        this.unsavedChanges = true;
        
        // Clear existing timer
        if (this.autosaveDebounceTimer) {
            clearTimeout(this.autosaveDebounceTimer);
        }
        
        // Set new timer
        this.autosaveDebounceTimer = setTimeout(() => {
            try {
                if (!this.autosaveEnabled || this.isLoading) return;
                // Don't create version on autosave
                this.savePortfolio(portfolioData, false);
            } catch (error) {
                console.error('Autosave error:', error);
                this.saveStatus = 'unsaved';
                this.updateSaveStatus();
            }
        }, this.autosaveDelay || 2000);
    }

    /**
     * Create version snapshot
     */
    createVersionSnapshot(portfolioId, portfolioData) {
        try {
            const versionKey = `portfolio_versions_${portfolioId}`;
            let versions = [];
            
            const stored = localStorage.getItem(versionKey);
            if (stored) {
                versions = JSON.parse(stored);
            }
            
            const version = {
                id: this.generateId(),
                portfolioId: portfolioId,
                createdAt: new Date().toISOString(),
                version: portfolioData.version || '1.0.0',
                data: JSON.parse(JSON.stringify(portfolioData)) // Deep copy
            };
            
            versions.push(version);
            
            // Keep only last N versions
            const maxVersions = this.maxVersions || 50;
            if (versions.length > maxVersions) {
                versions = versions.slice(-maxVersions);
            }
            
            localStorage.setItem(versionKey, JSON.stringify(versions));
            return version;
        } catch (error) {
            console.error('Error creating version snapshot:', error);
            return null;
        }
    }

    /**
     * Get version history for a portfolio
     */
    getVersionHistory(portfolioId) {
        try {
            const versionKey = `portfolio_versions_${portfolioId}`;
            const stored = localStorage.getItem(versionKey);
            if (!stored) return [];
            
            const versions = JSON.parse(stored);
            return Array.isArray(versions) ? versions.reverse() : []; // Newest first
        } catch (error) {
            console.error('Error loading version history:', error);
            return [];
        }
    }

    /**
     * Restore portfolio from version
     */
    restoreVersion(portfolioId, versionId) {
        try {
            const versions = this.getVersionHistory(portfolioId);
            const version = versions.find(v => v.id === versionId);
            
            if (!version) {
                throw new Error('Version not found');
            }
            
            // Create a new version from current state before restore
            const current = this.getPortfolio(portfolioId);
            if (current) {
                this.createVersionSnapshot(portfolioId, current);
            }
            
            // Restore portfolio
            const restored = this.savePortfolio(version.data, false);
            
            return restored;
        } catch (error) {
            console.error('Error restoring version:', error);
            throw error;
        }
    }

    /**
     * Update save status indicator
     */
    updateSaveStatus() {
        const indicator = document.getElementById('save-status-indicator');
        if (!indicator) return;
        
        const statusText = {
            'saved': 'Сохранено',
            'saving': 'Сохранение...',
            'unsaved': 'Не сохранено'
        };
        
        const statusColor = {
            'saved': '#10b981',
            'saving': '#f59e0b',
            'unsaved': '#ef4444'
        };
        
        indicator.textContent = statusText[this.saveStatus] || 'Неизвестно';
        indicator.style.color = statusColor[this.saveStatus] || '#6b7280';
    }

    /**
     * Save state for undo
     */
    saveStateForUndo() {
        try {
            const state = this.serializeEditorState();
            this.undoStack.push(JSON.parse(JSON.stringify(state)));
            
            // Limit undo stack size
            if (this.undoStack.length > 50) {
                this.undoStack.shift();
            }
            
            // Clear redo stack when new action is performed
            this.redoStack = [];
        } catch (error) {
            console.error('Error saving state for undo:', error);
        }
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.undoStack.length === 0) {
            return false;
        }
        
        // Save current state to redo stack
        try {
            const currentState = this.serializeEditorState();
            this.redoStack.push(JSON.parse(JSON.stringify(currentState)));
        } catch (error) {
            console.error('Error saving state for redo:', error);
        }
        
        // Restore previous state
        const previousState = this.undoStack.pop();
        if (previousState && this.loadPortfolioIntoEditor) {
            this.loadPortfolioIntoEditor({
                editorState: previousState,
                title: previousState.name || 'Мое портфолио'
            });
            return true;
        }
        
        return false;
    }

    /**
     * Redo last undone action
     */
    redo() {
        if (this.redoStack.length === 0) {
            return false;
        }
        
        // Save current state to undo stack
        try {
            const currentState = this.serializeEditorState();
            this.undoStack.push(JSON.parse(JSON.stringify(currentState)));
        } catch (error) {
            console.error('Error saving state for undo:', error);
        }
        
        // Restore next state
        const nextState = this.redoStack.pop();
        if (nextState && this.loadPortfolioIntoEditor) {
            this.loadPortfolioIntoEditor({
                editorState: nextState,
                title: nextState.name || 'Мое портфолио'
            });
            return true;
        }
        
        return false;
    }

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges() {
        return this.unsavedChanges;
    }


    /**
     * Create version snapshot
     */
    createVersionSnapshot(portfolioId, portfolioData) {
        try {
            const versionKey = `portfolio_versions_${portfolioId}`;
            let versions = [];
            
            const stored = localStorage.getItem(versionKey);
            if (stored) {
                versions = JSON.parse(stored);
            }
            
            const version = {
                id: this.generateId(),
                portfolioId: portfolioId,
                createdAt: new Date().toISOString(),
                version: portfolioData.version || '1.0.0',
                data: JSON.parse(JSON.stringify(portfolioData)) // Deep copy
            };
            
            versions.push(version);
            
            // Keep only last N versions
            const maxVersions = this.maxVersions || 50;
            if (versions.length > maxVersions) {
                versions = versions.slice(-maxVersions);
            }
            
            localStorage.setItem(versionKey, JSON.stringify(versions));
            return version;
        } catch (error) {
            console.error('Error creating version snapshot:', error);
            return null;
        }
    }

    /**
     * Get version history for a portfolio
     */
    getVersionHistory(portfolioId) {
        try {
            const versionKey = `portfolio_versions_${portfolioId}`;
            const stored = localStorage.getItem(versionKey);
            if (!stored) return [];
            
            const versions = JSON.parse(stored);
            return Array.isArray(versions) ? versions.reverse() : []; // Newest first
        } catch (error) {
            console.error('Error loading version history:', error);
            return [];
        }
    }

    /**
     * Restore portfolio from version
     */
    restoreVersion(portfolioId, versionId) {
        try {
            const versions = this.getVersionHistory(portfolioId);
            const version = versions.find(v => v.id === versionId);
            
            if (!version) {
                throw new Error('Version not found');
            }
            
            // Restore portfolio
            const restored = this.savePortfolio(version.data, false);
            
            // Create a new version from current state before restore
            const current = this.getPortfolio(portfolioId);
            if (current) {
                this.createVersionSnapshot(portfolioId, current);
            }
            
            return restored;
        } catch (error) {
            console.error('Error restoring version:', error);
            throw error;
        }
    }

    /**
     * Update save status indicator
     */
    updateSaveStatus() {
        const indicator = document.getElementById('save-status-indicator');
        if (!indicator) return;
        
        const statusText = {
            'saved': 'Сохранено',
            'saving': 'Сохранение...',
            'unsaved': 'Не сохранено'
        };
        
        const statusColor = {
            'saved': '#10b981',
            'saving': '#f59e0b',
            'unsaved': '#ef4444'
        };
        
        indicator.textContent = statusText[this.saveStatus] || 'Неизвестно';
        indicator.style.color = statusColor[this.saveStatus] || '#6b7280';
    }

    /**
     * Export portfolio as HTML
     */
    exportAsHTML(portfolioId) {
        try {
            const portfolio = this.getPortfolio(portfolioId);
            if (!portfolio) {
                throw new Error('Portfolio not found');
            }

            // Get preview HTML (this would need to be generated from portfolio data)
            const preview = document.getElementById('portfolio-preview');
            if (!preview) {
                throw new Error('Preview not available');
            }

            const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${portfolio.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { margin: 0; padding: 0; }
        ${this.generatePortfolioStyles(portfolio)}
    </style>
</head>
<body>
    ${preview.innerHTML}
</body>
</html>`;

            // Download
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${portfolio.title.replace(/[^a-z0-9]/gi, '_')}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Error exporting HTML:', error);
            throw error;
        }
    }

    /**
     * Generate CSS styles for portfolio
     */
    generatePortfolioStyles(portfolio) {
        const theme = portfolio.globalTheme || {};
        const colors = theme.colors || {};
        
        return `
            :root {
                --primary-color: ${colors.primary_color || '#2563EB'};
                --accent-color: ${colors.accent_color || '#1E40AF'};
                --background-color: ${colors.background_color || '#ffffff'};
            }
        `;
    }

    /**
     * Export portfolio as PDF (requires html2pdf library)
     */
    async exportAsPDF(portfolioId) {
        try {
            const portfolio = this.getPortfolio(portfolioId);
            if (!portfolio) {
                throw new Error('Portfolio not found');
            }

            // Check if html2pdf is available
            if (typeof html2pdf === 'undefined') {
                // Load html2pdf library dynamically
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
            }

            const preview = document.getElementById('portfolio-preview');
            if (!preview) {
                throw new Error('Preview not available');
            }

            const opt = {
                margin: 1,
                filename: `${portfolio.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            await html2pdf().set(opt).from(preview).save();
            return true;
        } catch (error) {
            console.error('Error exporting PDF:', error);
            throw error;
        }
    }

    /**
     * Load script dynamically
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Save state for undo
     */
    saveStateForUndo() {
        try {
            const state = this.serializeEditorState();
            this.undoStack.push(JSON.parse(JSON.stringify(state)));
            
            // Limit undo stack size
            if (this.undoStack.length > 50) {
                this.undoStack.shift();
            }
            
            // Clear redo stack when new action is performed
            this.redoStack = [];
        } catch (error) {
            console.error('Error saving state for undo:', error);
        }
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.undoStack.length === 0) {
            return false;
        }
        
        // Save current state to redo stack
        try {
            const currentState = this.serializeEditorState();
            this.redoStack.push(JSON.parse(JSON.stringify(currentState)));
        } catch (error) {
            console.error('Error saving state for redo:', error);
        }
        
        // Restore previous state
        const previousState = this.undoStack.pop();
        if (previousState && window.portfolioService) {
            window.portfolioService.loadPortfolioIntoEditor({
                editorState: previousState,
                title: previousState.name || 'Мое портфолио'
            });
            return true;
        }
        
        return false;
    }

    /**
     * Redo last undone action
     */
    redo() {
        if (this.redoStack.length === 0) {
            return false;
        }
        
        // Save current state to undo stack
        try {
            const currentState = this.serializeEditorState();
            this.undoStack.push(JSON.parse(JSON.stringify(currentState)));
        } catch (error) {
            console.error('Error saving state for undo:', error);
        }
        
        // Restore next state
        const nextState = this.redoStack.pop();
        if (nextState && window.portfolioService) {
            window.portfolioService.loadPortfolioIntoEditor({
                editorState: nextState,
                title: nextState.name || 'Мое портфолио'
            });
            return true;
        }
        
        return false;
    }
}

// Create global instance
window.portfolioService = new PortfolioService();

