/**
 * Portfolio Renderer - Unified rendering function for preview, view, and export
 * Ensures 1:1 visual consistency across all modes
 */

class PortfolioRenderer {
    /**
     * Render portfolio HTML from editor state
     * This is the SINGLE SOURCE OF TRUTH for portfolio rendering
     */
    static renderPortfolioHTML(portfolioData) {
        const state = portfolioData.editorState || {};
        const portfolio = portfolioData;
        
        // Extract all settings from state
        const name = state.name || portfolio.title || 'Мое портфолио';
        const profession = state.profession || '';
        const description = state.description || '';
        // Support both 'avatar' and 'avatarSrc' for compatibility
        const avatar = state.avatar || state.avatarSrc || '';
        
        // Colors - support both formats (new: primary/accent/background, old: primary_color/accent_color/background_color)
        const colorScheme = state.colorScheme || {};
        let primaryColor = colorScheme.primary || colorScheme.primary_color;
        let accentColor = colorScheme.accent || colorScheme.accent_color;
        let bgColor = colorScheme.background || colorScheme.background_color;
        // CRITICAL: backgroundType must be explicitly checked - default to 'solid' only if truly missing
        const backgroundType = colorScheme.backgroundType !== undefined ? colorScheme.backgroundType : 'solid';
        let bgColor2 = colorScheme.background2 || colorScheme.background_color_2;
        
        // Fallback to globalTheme if colorScheme is empty
        if (!primaryColor || !accentColor || !bgColor) {
            const globalTheme = portfolio.globalTheme || {};
            const themeColors = globalTheme.colors || {};
            if (!primaryColor && themeColors.primary_color) {
                primaryColor = themeColors.primary_color;
            }
            if (!accentColor && themeColors.accent_color) {
                accentColor = themeColors.accent_color;
            }
            if (!bgColor && themeColors.background_color) {
                bgColor = themeColors.background_color;
            }
            if (!bgColor2 && themeColors.background_color_2) {
                bgColor2 = themeColors.background_color_2;
            }
        }
        
        // Final fallback to defaults
        primaryColor = primaryColor || '#2563EB';
        accentColor = accentColor || '#1E40AF';
        bgColor = bgColor || '#ffffff';
        bgColor2 = bgColor2 || '#f3f4f6';
        
        // Card background color (цвет фона карточек/секций)
        let cardBgColor = colorScheme.cardBackground || colorScheme.card_background;
        if (!cardBgColor) {
            // Auto-detect based on background if not set
            const isLightBg = this.isLightColor(bgColor);
            cardBgColor = isLightBg ? '#f9fafb' : '#374151';
        }
        
        // Text settings
        const textFontFamily = state.textSettings?.fontFamily || 'Inter';
        const textFontWeight = state.textSettings?.fontWeight || '400';
        const textH1Size = state.textSettings?.h1Size || '48';
        const textH2Size = state.textSettings?.h2Size || '24';
        const textBodySize = state.textSettings?.bodySize || '16';
        const textLineHeight = state.textSettings?.lineHeight || '1.6';
        const textLetterSpacing = state.textSettings?.letterSpacing || '0';
        const textAlign = state.textSettings?.textAlign || 'center';
        
        // Avatar settings
        const avatarShape = state.avatarShape || 'circle';
        const avatarBorderRadius = avatarShape === 'circle' ? '50%' : 
                                   avatarShape === 'rounded' ? '12px' : '0';
        
        // Layout settings
        const spacingPreset = state.layoutSettings?.spacingPreset || 'normal';
        const blockSpacing = spacingPreset === 'compact' ? '16' : 
                            spacingPreset === 'spacious' ? '32' : '24';
        const cardStyle = state.layoutSettings?.cardStyle || 'elevated';
        const borderRadiusPreset = state.layoutSettings?.borderRadiusPreset || 'medium';
        const borderRadius = borderRadiusPreset === 'none' ? '0' :
                            borderRadiusPreset === 'small' ? '4px' :
                            borderRadiusPreset === 'medium' ? '8px' : '12px';
        const gridColumns = state.layoutSettings?.gridColumns || '2';
        const itemPreviewSize = state.layoutSettings?.itemPreviewSize || '128';
        
        // Calculate colors
        const textColor = this.getOptimalTextColor(bgColor);
        const isLightBg = this.isLightColor(bgColor);
        const fixedPrimaryColor = primaryColor;
        const fixedAccentColor = accentColor;
        const fixedTextColor = textColor; // Text color for main background
        const fixedCardBg = cardBgColor; // Use custom card background color
        const fixedCardTextColor = this.getOptimalTextColor(cardBgColor); // Text color for cards (based on card background)
        
        // Calculate text color for nested divs (experience, education, certificates, portfolio items)
        // These divs have their own background: white or #4B5563
        const nestedBgColor = isLightBg ? '#ffffff' : '#4B5563';
        const nestedTextColor = this.getOptimalTextColor(nestedBgColor);
        
        // Background - CRITICAL: Apply gradient if backgroundType is 'gradient'
        // Ensure bgColor2 has a fallback value for gradients
        const gradientColor2 = bgColor2 || (bgColor ? '#f3f4f6' : '#ffffff');
        let fixedBgColor = `background: ${bgColor || '#ffffff'};`;
        if (backgroundType === 'gradient' && bgColor) {
            fixedBgColor = `background: linear-gradient(135deg, ${bgColor} 0%, ${gradientColor2} 100%);`;
        }
        
        // Shadow
        const fixedShadow = cardStyle === 'elevated' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none';
        
        // Padding
        const padding = spacingPreset === 'compact' ? '16' : spacingPreset === 'spacious' ? '48' : '32';
        
        // Contacts
        const contacts = state.contacts || {};
        const phone = contacts.phone || '';
        const email = contacts.email || '';
        const website = contacts.website || '';
        const location = contacts.location || '';
        const socialLinks = state.socialLinks || [];
        
        // Other data
        const skills = state.skills || [];
        const experience = state.experience || [];
        const education = state.education || [];
        const certificates = state.certificates || [];
        const languages = state.languages || [];
        const portfolioItems = state.items || [];
        const customBlocks = state.customBlocks || [];
        
        // Block visibility
        const blockVisibility = state.blockVisibility || {};
        const showContacts = blockVisibility['block-contacts'] !== false;
        const showSkills = blockVisibility['block-skills'] !== false;
        const showExperience = blockVisibility['block-experience'] !== false;
        const showEducation = blockVisibility['block-education'] !== false;
        const showCertificates = blockVisibility['block-certificates'] !== false;
        const showLanguages = blockVisibility['block-languages'] !== false;
        const showWorks = blockVisibility['block-works'] !== false;
        
        // Build HTML
        let html = `
        <div style="${fixedBgColor} color: ${fixedTextColor}; padding: ${padding}px; border-radius: ${borderRadius}; box-shadow: ${fixedShadow}; max-width: 1200px; margin: 0 auto; width: 100%; box-sizing: border-box; word-wrap: break-word; overflow-wrap: break-word; overflow-x: hidden;" class="rounded-lg">
            <!-- Hero Block -->
            <div style="text-align: ${textAlign}; margin-bottom: ${blockSpacing}px; padding: 40px 24px; background: ${fixedCardBg}; border-radius: ${borderRadius}; box-shadow: ${fixedShadow};">
                ${avatar ? `<img src="${avatar}" alt="Avatar" style="width: 140px; height: 140px; border-radius: ${avatarBorderRadius}; object-fit: cover; object-position: center; border: 4px solid ${fixedPrimaryColor}; margin-bottom: 20px; display: block; ${textAlign === 'center' ? 'margin-left: auto; margin-right: auto;' : textAlign === 'right' ? 'margin-left: auto; margin-right: 0;' : 'margin-left: 0; margin-right: auto;'}; box-shadow: ${fixedShadow}; vertical-align: middle;">` : `<div style="width: 140px; height: 140px; border-radius: ${avatarBorderRadius}; background: ${fixedPrimaryColor}; margin: ${textAlign === 'center' ? '0 auto 20px;' : textAlign === 'right' ? '0 0 20px auto;' : '0 0 20px 0;'}; box-shadow: ${fixedShadow};"></div>`}
                <h1 style="font-size: ${textH1Size}px; font-family: '${textFontFamily}', sans-serif; font-weight: ${textFontWeight}; margin-bottom: 12px; color: ${fixedPrimaryColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px; word-wrap: break-word; overflow-wrap: break-word; max-width: 100%;">${name}</h1>
                ${profession ? `<p style="font-size: ${parseInt(textH2Size)}px; font-family: '${textFontFamily}', sans-serif; margin-top: 8px; margin-bottom: 16px; color: ${fixedCardTextColor}; font-weight: ${textFontWeight}; opacity: 0.8; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px; word-wrap: break-word; overflow-wrap: break-word; max-width: 100%;">${profession}</p>` : ''}
                ${description ? `<p style="font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif; margin-top: 12px; ${textAlign === 'center' ? 'max-width: 700px; margin-left: auto; margin-right: auto;' : ''} color: ${fixedCardTextColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px; opacity: 0.9; word-wrap: break-word; overflow-wrap: break-word; max-width: 100%;">${description}</p>` : ''}
            </div>
            
            ${showContacts && (phone || email || website || location || socialLinks.length > 0) ? `
                <div style="margin-bottom: ${blockSpacing}px; padding: 24px; background: ${fixedCardBg}; border-radius: ${borderRadius}; box-shadow: ${fixedShadow};">
                    <h2 style="font-size: ${textH2Size}px; font-family: '${textFontFamily}', sans-serif; font-weight: ${textFontWeight}; margin-bottom: 16px; color: ${fixedPrimaryColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">Контакты</h2>
                    ${phone ? `<p style="font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif; margin: 8px 0; color: ${fixedCardTextColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">📞 ${phone}</p>` : ''}
                    ${email ? `<p style="font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif; margin: 8px 0; color: ${fixedCardTextColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">📧 ${email}</p>` : ''}
                    ${website ? `<p style="font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif; margin: 8px 0; color: ${fixedCardTextColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">🌐 <a href="${website}" target="_blank" style="color: ${fixedAccentColor}; text-decoration: none; border-bottom: 1px solid ${fixedAccentColor};">${website}</a></p>` : ''}
                    ${location ? `<p style="font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif; margin: 8px 0; color: ${fixedCardTextColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">📍 ${location}</p>` : ''}
                    ${socialLinks.length > 0 ? `<div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px;">${socialLinks.map(link => `<a href="${link.url || ''}" target="_blank" style="padding: 6px 12px; background: ${fixedAccentColor}; color: white; border-radius: 6px; text-decoration: none; font-size: ${parseInt(textBodySize) * 0.9}px; font-family: '${textFontFamily}', sans-serif;">${link.platform || ''}</a>`).join('')}</div>` : ''}
                </div>
            ` : ''}
            
            ${showSkills && skills.length > 0 ? `
                <div style="margin-bottom: ${blockSpacing}px; padding: 24px; background: ${fixedCardBg}; border-radius: ${borderRadius}; box-shadow: ${fixedShadow}; color: ${fixedCardTextColor};">
                    <h2 style="font-size: ${textH2Size}px; font-family: '${textFontFamily}', sans-serif; font-weight: ${textFontWeight}; margin-bottom: 16px; color: ${fixedPrimaryColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">Навыки</h2>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        ${skills.map(skill => `<span style="padding: 10px 18px; background: ${fixedPrimaryColor}; color: white; border-radius: ${borderRadius}; font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif; font-weight: ${textFontWeight}; box-shadow: 0 2px 4px rgba(0,0,0,0.1); line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">${skill}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${showExperience && experience.length > 0 ? `
                <div style="margin-bottom: ${blockSpacing}px; padding: 24px; background: ${fixedCardBg}; border-radius: ${borderRadius}; box-shadow: ${fixedShadow};">
                    <h2 style="font-size: ${textH2Size}px; font-family: '${textFontFamily}', sans-serif; font-weight: ${textFontWeight}; margin-bottom: 20px; color: ${fixedPrimaryColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">Опыт работы</h2>
                    ${experience.map(exp => `
                        <div style="margin-bottom: 20px; padding: 20px; background: ${nestedBgColor}; border-left: 4px solid ${fixedPrimaryColor}; border-radius: ${borderRadius}; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <h3 style="font-size: ${parseInt(textH2Size) * 0.95}px; font-family: '${textFontFamily}', sans-serif; font-weight: ${textFontWeight}; margin-bottom: 8px; color: ${fixedPrimaryColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">${exp.position || 'Должность'}</h3>
                            <p style="font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif; margin: 6px 0; color: ${nestedTextColor}; font-weight: ${textFontWeight}; opacity: 0.8; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">${exp.company || ''} ${exp.period ? `• ${exp.period}` : ''}</p>
                            ${exp.description ? `<p style="font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif; margin-top: 12px; color: ${nestedTextColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">${exp.description}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${showEducation && education.length > 0 ? `
                <div style="margin-bottom: ${blockSpacing}px; padding: 24px; background: ${fixedCardBg}; border-radius: ${borderRadius}; box-shadow: ${fixedShadow};">
                    <h2 style="font-size: ${textH2Size}px; font-family: '${textFontFamily}', sans-serif; font-weight: ${textFontWeight}; margin-bottom: 20px; color: ${fixedPrimaryColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">Образование</h2>
                    ${education.map(edu => `
                        <div style="margin-bottom: 20px; padding: 20px; background: ${nestedBgColor}; border-left: 4px solid ${fixedPrimaryColor}; border-radius: ${borderRadius}; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <h3 style="font-size: ${parseInt(textH2Size) * 0.95}px; font-family: '${textFontFamily}', sans-serif; font-weight: ${textFontWeight}; margin-bottom: 8px; color: ${fixedPrimaryColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">${edu.institution || 'Учреждение'}</h3>
                            <p style="font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif; margin: 6px 0; color: ${nestedTextColor}; font-weight: ${textFontWeight}; opacity: 0.8; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">${edu.specialty || ''} ${edu.period ? `• ${edu.period}` : ''}</p>
                            ${edu.description ? `<p style="font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif; margin-top: 12px; color: ${nestedTextColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">${edu.description}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${showCertificates && certificates.length > 0 ? `
                <div style="margin-bottom: ${blockSpacing}px; padding: 24px; background: ${fixedCardBg}; border-radius: ${borderRadius}; box-shadow: ${fixedShadow};">
                    <h2 style="font-size: ${textH2Size}px; font-family: '${textFontFamily}', sans-serif; font-weight: ${textFontWeight}; margin-bottom: 20px; color: ${fixedPrimaryColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">Сертификаты</h2>
                    ${certificates.map(cert => `
                        <div style="margin-bottom: 20px; padding: 20px; background: ${nestedBgColor}; border-left: 4px solid ${fixedPrimaryColor}; border-radius: ${borderRadius}; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <h3 style="font-size: ${parseInt(textH2Size) * 0.95}px; font-family: '${textFontFamily}', sans-serif; font-weight: ${textFontWeight}; margin-bottom: 8px; color: ${fixedPrimaryColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">${cert.name || 'Сертификат'}</h3>
                            <p style="font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif; margin: 6px 0; color: ${nestedTextColor}; font-weight: ${textFontWeight}; opacity: 0.8; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">${cert.organization || ''} ${cert.date ? `• ${cert.date}` : ''}</p>
                            ${cert.link ? `<p style="font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif; margin-top: 8px;"><a href="${cert.link}" target="_blank" style="color: ${fixedAccentColor}; text-decoration: none; border-bottom: 1px solid ${fixedAccentColor};">🔗 Ссылка на сертификат</a></p>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${showLanguages && languages.length > 0 ? `
                <div style="margin-bottom: ${blockSpacing}px; padding: 24px; background: ${fixedCardBg}; border-radius: ${borderRadius}; box-shadow: ${fixedShadow};">
                    <h2 style="font-size: ${textH2Size}px; font-family: '${textFontFamily}', sans-serif; font-weight: ${textFontWeight}; margin-bottom: 16px; color: ${fixedPrimaryColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">Языки</h2>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        ${languages.map(lang => {
                            const levelNames = { beginner: 'Начальный', intermediate: 'Средний', advanced: 'Продвинутый', native: 'Родной' };
                            return `<span style="padding: 10px 18px; background: ${fixedPrimaryColor}; color: white; border-radius: ${borderRadius}; font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif; font-weight: ${textFontWeight}; box-shadow: 0 2px 4px rgba(0,0,0,0.1); line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">${lang.language} (${levelNames[lang.level] || lang.level})</span>`;
                        }).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${showWorks && portfolioItems.length > 0 ? `
                <div style="margin-bottom: ${blockSpacing}px; padding: 24px; background: ${fixedCardBg}; border-radius: ${borderRadius}; box-shadow: ${fixedShadow};">
                    <h2 style="font-size: ${textH2Size}px; font-family: '${textFontFamily}', sans-serif; font-weight: ${textFontWeight}; margin-bottom: 24px; color: ${fixedPrimaryColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">Мои работы</h2>
                    <div style="display: flex; flex-direction: column; gap: ${blockSpacing}px;">
                        ${portfolioItems.map(item => {
                            // Определить изображение для отображения
                            let imageSrc = '';
                            if (item.content_type === 'image' && item.image) {
                                imageSrc = item.image;
                            } else if (item.content_type === 'gallery' && item.content_data?.images?.length > 0) {
                                imageSrc = item.content_data.images[0];
                            }
                            
                            // Текстовая часть (слева)
                            const textSection = `
                                <div style="flex: 1; padding-right: 24px;">
                                    <h3 style="font-weight: ${textFontWeight}; font-size: ${parseInt(textH2Size) * 1.1}px; font-family: '${textFontFamily}', sans-serif; margin-bottom: 12px; color: ${fixedPrimaryColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">${item.title}</h3>
                                    ${item.description ? `<p style="font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif; color: ${nestedTextColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px; margin-bottom: 16px; opacity: 0.9;">${item.description}</p>` : ''}
                                    ${item.content_type === 'link' && item.content_data?.url ? `
                                        <a href="${item.content_data.url}" target="_blank" style="display: inline-block; padding: 10px 20px; background: ${fixedAccentColor}; color: white; border-radius: 6px; text-decoration: none; font-size: ${parseInt(textBodySize) * 0.9}px; font-family: '${textFontFamily}', sans-serif; font-weight: ${textFontWeight}; margin-top: 8px;">🔗 Live View</a>
                                    ` : ''}
                                    ${item.category ? `<span style="font-size: ${parseInt(textBodySize) * 0.875}px; padding: 6px 12px; background: ${fixedPrimaryColor}; color: white; border-radius: 6px; margin-top: 12px; display: inline-block; font-weight: ${textFontWeight}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px;">${item.category}</span>` : ''}
                                    ${item.tags && item.tags.length > 0 ? `<div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px;">${item.tags.map(tag => `<span style="font-size: ${parseInt(textBodySize) * 0.8}px; padding: 4px 10px; background: ${fixedCardBg}; color: ${fixedAccentColor}; border-radius: 6px; border: 1px solid ${fixedAccentColor};">#${tag}</span>`).join('')}</div>` : ''}
                                </div>
                            `;
                            
                            // Изображение (справа)
                            const imageSection = imageSrc ? `
                                <div style="flex: 0 0 40%; min-width: 300px; display: flex; align-items: center; justify-content: center;">
                                    <img src="${imageSrc}" alt="${item.title}" style="width: 100%; height: 280px; object-fit: cover; object-position: center; border-radius: ${borderRadius}; box-shadow: ${fixedShadow}; display: block; vertical-align: middle;">
                                </div>
                            ` : item.content_type === 'video' && item.content_data?.url ? `
                                <div style="flex: 0 0 40%; min-width: 300px; height: 280px; background: ${fixedCardBg}; border-radius: ${borderRadius}; display: flex; align-items: center; justify-content: center; color: ${fixedAccentColor}; border: 2px dashed ${fixedAccentColor};">
                                    <div style="text-align: center;">
                                        <div style="font-size: 48px; margin-bottom: 8px;">▶️</div>
                                        <div style="font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif;">Видео</div>
                                    </div>
                                </div>
                            ` : item.content_type === 'link' && item.content_data?.url ? `
                                <div style="flex: 0 0 40%; min-width: 300px; height: 280px; background: ${fixedCardBg}; border-radius: ${borderRadius}; display: flex; align-items: center; justify-content: center; color: ${fixedAccentColor}; border: 2px solid ${fixedAccentColor};">
                                    <div style="text-align: center;">
                                        <div style="font-size: 48px; margin-bottom: 8px;">🔗</div>
                                        <div style="font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif;">Ссылка</div>
                                    </div>
                                </div>
                            ` : '';
                            
                            return `
                                <div style="display: flex; gap: 24px; background: ${nestedBgColor}; border-radius: ${borderRadius}; padding: 32px; box-shadow: ${fixedShadow}; align-items: center;">
                                    ${textSection}
                                    ${imageSection}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${customBlocks && customBlocks.length > 0 ? customBlocks.map(block => {
                const blockTitle = block.title || '';
                const blockDescription = block.description || '';
                const blockImage = block.image || '';
                
                // Custom block specific settings (ONLY for custom blocks)
                const titleFontSize = block.titleFontSize || 24;
                const imageSizeRatio = block.imageSizeRatio || 55; // Image: 55% (matches reference)
                const textSizeRatio = 100 - imageSizeRatio; // Text: 45%
                const blockPadding = block.blockPadding || 12; // Compact padding
                
                // Block background color - use custom if set, otherwise use default
                const blockBgColor = block.backgroundColor || fixedCardBg;
                // Calculate text color based on background color
                const blockTextColor = this.getOptimalTextColor(blockBgColor);
                
                // FIXED LAYOUT: TEXT LEFT, IMAGE RIGHT (always, regardless of saved layout)
                // Compact horizontal card - NOT a large section
                
                // Image section - large relative to block, but block itself is compact
                // Image height is LIMITED to keep block compact (max 180px for compact card)
                const imageSection = blockImage ? `
                    <div class="custom-block-image-area" style="overflow: hidden; border-radius: ${borderRadius};">
                        <img src="${blockImage}" alt="${blockTitle}" style="width: 100%; height: auto; max-height: 180px; object-fit: cover; object-position: center; display: block;">
                    </div>
                ` : '';
                
                // Text section - left side, aligned to TOP (not center), compact
                const textSection = `
                    <div class="custom-block-text-area" style="display: flex; flex-direction: column; justify-content: flex-start; padding-right: 24px;">
                        ${blockTitle ? `<h2 class="custom-block-title" style="font-size: ${titleFontSize}px; font-family: '${textFontFamily}', sans-serif; font-weight: ${textFontWeight}; margin-bottom: 12px; color: ${fixedPrimaryColor}; line-height: 1.3; letter-spacing: ${textLetterSpacing}px; text-align: left; word-wrap: break-word; overflow-wrap: break-word;">${blockTitle}</h2>` : ''}
                        ${blockDescription ? `<div style="font-size: ${textBodySize}px; font-family: '${textFontFamily}', sans-serif; color: ${blockTextColor}; line-height: ${textLineHeight}; letter-spacing: ${textLetterSpacing}px; opacity: 0.9; word-wrap: break-word; overflow-wrap: break-word; text-align: left;">${blockDescription.replace(/\n/g, '<br>')}</div>` : ''}
                    </div>
                `;
                
                // CSS Grid: TEXT LEFT (45%), IMAGE RIGHT (55%)
                // Compact layout - NO min-height, height defined by content
                const contentLayout = blockImage ? `
                    <div class="custom-block-grid" style="display: grid; grid-template-columns: ${textSizeRatio}% ${imageSizeRatio}%; gap: 24px; align-items: start;">
                        ${textSection}
                        ${imageSection}
                    </div>
                ` : `
                    <div style="padding: 16px;">
                        ${textSection}
                    </div>
                `;
                
                return `
                    <div class="custom-block-container" style="margin-bottom: ${blockSpacing}px; width: 100%;">
                        <div style="background: ${blockBgColor}; border-radius: ${borderRadius}; box-shadow: ${fixedShadow}; padding: ${blockPadding}px; overflow: hidden;">
                            ${contentLayout}
                        </div>
                    </div>
                `;
            }).join('') : ''}
        </div>
        `;
        
        return html;
    }
    
    /**
     * Get optimal text color based on background
     * Returns black or white for maximum contrast
     */
    static getOptimalTextColor(bgColor) {
        try {
            if (!bgColor || typeof bgColor !== 'string') {
                return '#000000'; // Default to black
            }
            
            // Remove # if present and trim
            let hex = bgColor.replace('#', '').trim();
            
            // Handle 3-digit hex colors (e.g., #fff -> #ffffff)
            if (hex.length === 3) {
                hex = hex.split('').map(char => char + char).join('');
            }
            
            // Validate hex color
            if (hex.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(hex)) {
                return '#000000'; // Default to black for invalid colors
            }
            
            // Parse RGB values
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            
            // Calculate relative luminance (WCAG formula)
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            
            // Return black for light backgrounds, white for dark backgrounds
            return luminance > 0.5 ? '#000000' : '#FFFFFF';
        } catch (error) {
            console.warn('Error calculating optimal text color:', error, 'for color:', bgColor);
            return '#000000'; // Default to black on error
        }
    }
    
    /**
     * Check if color is light
     */
    static isLightColor(color) {
        try {
            if (!color || typeof color !== 'string') {
                return true; // Default to light
            }
            
            // Remove # if present
            let hex = color.replace('#', '').trim();
            
            // Handle 3-digit hex colors
            if (hex.length === 3) {
                hex = hex.split('').map(char => char + char).join('');
            }
            
            // Validate hex color
            if (hex.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(hex)) {
                return true; // Default to light for invalid colors
            }
            
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            
            // Calculate relative luminance (WCAG formula)
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            return luminance > 0.5;
        } catch (error) {
            console.warn('Error checking if color is light:', error, 'for color:', color);
            return true; // Default to light
        }
    }
    
    /**
     * Load font if needed
     * Supports all Google Fonts
     */
    static loadFont(fontFamily) {
        if (!fontFamily) {
            return Promise.resolve();
        }
        
        // System fonts that don't need loading
        const systemFonts = ['Inter'];
        if (systemFonts.includes(fontFamily)) {
            return Promise.resolve();
        }
        
        // Check if font is already loaded
        const existingLink = document.querySelector(`link[href*="${fontFamily.replace(/\s+/g, '+')}"]`);
        if (existingLink) {
            return Promise.resolve();
        }
        
        return new Promise((resolve) => {
            const link = document.createElement('link');
            // Support multiple weights: 300, 400, 500, 600, 700, 800
            const fontName = fontFamily.replace(/\s+/g, '+');
            link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@300;400;500;600;700;800&display=swap`;
            link.rel = 'stylesheet';
            
            link.onload = resolve;
            link.onerror = () => {
                console.warn(`Failed to load font: ${fontFamily}`);
                resolve(); // Continue even if font fails
            };
            
            document.head.appendChild(link);
        });
    }
}

// Make available globally
window.PortfolioRenderer = PortfolioRenderer;

