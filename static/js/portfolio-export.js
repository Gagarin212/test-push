/**
 * Portfolio Export Service - Handles export and view mode
 * CRITICAL: Exports MUST be 1:1 identical to live preview
 */

class PortfolioExportService {
    constructor() {
        this.portfolioService = window.portfolioService;
    }

    /**
     * Convert image to base64
     */
    async imageToBase64(url) {
        return new Promise((resolve, reject) => {
            // If already base64, return as is
            if (url.startsWith('data:')) {
                resolve(url);
                return;
            }

            // If blob URL, convert to base64
            if (url.startsWith('blob:')) {
                fetch(url)
                    .then(res => res.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    })
                    .catch(reject);
                return;
            }

            // For external URLs, try to fetch and convert
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = this.naturalWidth;
                    canvas.height = this.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(this, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } catch (error) {
                    // If CORS fails, return original URL
                    console.warn('Could not convert image to base64:', error);
                    resolve(url);
                }
            };
            img.onerror = () => {
                console.warn('Image load failed, using original URL:', url);
                resolve(url);
            };
            img.src = url;
        });
    }

    /**
     * Wait for all images to load
     */
    async waitForImages(container) {
        const images = container.querySelectorAll('img');
        const promises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = resolve; // Continue even if image fails
                // Timeout after 5 seconds
                setTimeout(resolve, 5000);
            });
        });
        await Promise.all(promises);
    }

    /**
     * Wait for fonts to load
     */
    async waitForFonts(fontFamily) {
        if (!fontFamily || fontFamily === 'Inter') {
            return Promise.resolve();
        }
        
        try {
            if (document.fonts && document.fonts.check) {
                const fontName = `1em "${fontFamily}"`;
                if (document.fonts.check(fontName)) {
                    return Promise.resolve();
                }
                await document.fonts.ready;
            }
        } catch (error) {
            console.warn('Font loading check failed:', error);
        }
        
        // Fallback: wait a bit for fonts to load
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    /**
     * Get all computed styles from preview container
     */
    getPreviewStyles() {
        const preview = document.getElementById('portfolio-preview');
        if (!preview) return '';

        // Get all style tags
        const styleTags = Array.from(document.querySelectorAll('style')).map(style => style.innerHTML).join('\n');
        
        // Get computed styles for preview container
        const computedStyles = window.getComputedStyle(preview);
        
        return `
            ${styleTags}
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: ${computedStyles.fontFamily || 'Inter, sans-serif'};
                }
                .portfolio-export-container {
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                }
            </style>
        `;
    }

    /**
     * Replace image sources with base64 in HTML string (not used, kept for reference)
     */
    async replaceImagesWithBase64(htmlString) {
        // This function is kept for reference but not actively used
        // We use replaceImagesInElement instead which works directly on DOM elements
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const images = doc.querySelectorAll('img');
        
        for (const img of images) {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('data:')) {
                try {
                    const base64 = await this.imageToBase64(src);
                    img.setAttribute('src', base64);
                } catch (error) {
                    console.warn('Failed to convert image to base64:', src, error);
                }
            }
        }
        
        return doc.body.innerHTML;
    }

    /**
     * Export portfolio as static HTML using EXACT preview HTML
     */
    async exportAsHTML(portfolioId) {
        try {
            const portfolio = this.portfolioService.getPortfolio(portfolioId);
            if (!portfolio) {
                throw new Error('Portfolio not found');
            }

            // Use unified renderer
            if (!window.PortfolioRenderer) {
                throw new Error('PortfolioRenderer not loaded');
            }

            // Load font if needed
            const state = portfolio.editorState || {};
            const fontFamily = state.textSettings?.fontFamily || 'Inter';
            await window.PortfolioRenderer.loadFont(fontFamily);
            
            // Render HTML using unified renderer
            const htmlContent = window.PortfolioRenderer.renderPortfolioHTML(portfolio);
            
            // Create temporary container to convert images
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            document.body.appendChild(tempDiv);
            
            // Convert all images to base64
            await this.replaceImagesInElement(tempDiv);
            
            // Get final HTML
            const finalHtml = tempDiv.innerHTML;
            document.body.removeChild(tempDiv);
            
            // Get styles
            const styles = this.getPreviewStyles();
            
            // Generate final HTML
            const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${portfolio.title || 'Portfolio'}</title>
    <link href="https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 0;
            font-family: '${fontFamily}', sans-serif;
        }
        /* Ensure text colors are applied */
        * {
            color: inherit;
        }
        ${styles}
    </style>
</head>
<body style="margin: 0; padding: 0; background: ${state.colorScheme?.background || state.colorScheme?.background_color || '#ffffff'};">
    <div class="portfolio-export-container" style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
        ${finalHtml}
    </div>
</body>
</html>`;
            
            // Download
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(portfolio.title || 'portfolio').replace(/[^a-z0-9]/gi, '_')}.html`;
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
     * Replace images in element with base64
     */
    async replaceImagesInElement(element) {
        const images = element.querySelectorAll('img');
        for (const img of images) {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('data:')) {
                try {
                    const base64 = await this.imageToBase64(src);
                    img.setAttribute('src', base64);
                } catch (error) {
                    console.warn('Failed to convert image to base64:', src, error);
                }
            }
        }
    }

    /**
     * Export portfolio as PDF using unified renderer
     */
    async exportAsPDF(portfolioId) {
        try {
            // Check if html2pdf is available
            if (typeof html2pdf === 'undefined') {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
            }

            const portfolio = this.portfolioService.getPortfolio(portfolioId);
            if (!portfolio) {
                throw new Error('Portfolio not found');
            }

            // Use unified renderer
            if (!window.PortfolioRenderer) {
                throw new Error('PortfolioRenderer not loaded');
            }

            const state = portfolio.editorState || {};
            const fontFamily = state.textSettings?.fontFamily || 'Inter';
            
            // Load font
            await window.PortfolioRenderer.loadFont(fontFamily);
            
            // Render HTML using unified renderer
            const htmlContent = window.PortfolioRenderer.renderPortfolioHTML(portfolio);
            
            // Create temporary container for PDF rendering
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.top = '0';
            tempContainer.style.width = '1200px';
            tempContainer.style.backgroundColor = state.colorScheme?.background || '#ffffff';
            tempContainer.style.padding = '2rem';
            
            // Add font link
            const fontLink = document.createElement('link');
            fontLink.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}:wght@400;600;700&display=swap`;
            fontLink.rel = 'stylesheet';
            tempContainer.appendChild(fontLink);
            
            // Add styles
            const styles = this.getPreviewStyles();
            const styleElement = document.createElement('style');
            styleElement.innerHTML = styles + `
                body {
                    font-family: '${fontFamily}', sans-serif;
                }
            `;
            tempContainer.appendChild(styleElement);
            
            // Set content
            tempContainer.innerHTML += htmlContent;
            document.body.appendChild(tempContainer);
            
            // Wait for images to load
            await this.waitForImages(tempContainer);
            
            // Convert images to base64 for PDF
            await this.replaceImagesInElement(tempContainer);
            
            // Wait for fonts and layout to stabilize
            await this.waitForFonts(fontFamily);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // PDF options
            const opt = {
                margin: [0.5, 0.5, 0.5, 0.5],
                filename: `${(portfolio.title || 'portfolio').replace(/[^a-z0-9]/gi, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    width: 1200,
                    windowWidth: 1200,
                    backgroundColor: state.colorScheme?.background || '#ffffff'
                },
                jsPDF: { 
                    unit: 'in', 
                    format: 'a4', 
                    orientation: 'portrait',
                    compress: true
                },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            // Generate PDF
            await html2pdf().set(opt).from(tempContainer).save();
            
            // Cleanup
            document.body.removeChild(tempContainer);

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
            // Check if already loaded
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Generate shareable link (local)
     */
    generateShareableLink(portfolioId) {
        const baseUrl = window.location.origin;
        return `${baseUrl}/view/${portfolioId}`;
    }

    /**
     * Validate export readiness
     */
    validateExportReadiness() {
        const preview = document.getElementById('portfolio-preview');
        if (!preview) {
            return { valid: false, error: 'Preview container not found' };
        }

        const images = preview.querySelectorAll('img');
        const missingImages = [];
        images.forEach(img => {
            if (!img.src || img.src === '' || img.src.startsWith('blob:') && !img.complete) {
                missingImages.push(img.alt || 'Unknown image');
            }
        });

        if (missingImages.length > 0) {
            console.warn('Some images may not be ready for export:', missingImages);
        }

        return { 
            valid: true, 
            warnings: missingImages.length > 0 ? `Some images may not export correctly: ${missingImages.join(', ')}` : null
        };
    }
}

// Create global instance
window.portfolioExportService = new PortfolioExportService();
