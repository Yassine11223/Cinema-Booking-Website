const fs = require('fs');
const path = require('path');

const targetDirs = ['frontend', 'admin', 'backend'];
const exts = ['.html', '.js', '.css', '.json'];

const logoSvg = `<svg viewBox="0 0 100 100" width="55" height="55" xmlns="http://www.w3.org/2000/svg">
                        <!-- Outer Arch -->
                        <path d="M 22 85 L 22 45 A 28 28 0 0 1 78 45 L 78 85" fill="none" stroke="#e60000" stroke-width="4" />
                        <!-- Inner Arch -->
                        <path d="M 30 85 L 30 45 A 20 20 0 0 1 70 45 L 70 85" fill="none" stroke="#e60000" stroke-width="3" />
                        
                        <!-- Bases -->
                        <rect x="18" y="85" width="16" height="3" fill="#e60000" />
                        <rect x="66" y="85" width="16" height="3" fill="#e60000" />

                        <!-- Left Curtain -->
                        <path d="M 50 25 A 20 20 0 0 0 30 45 L 30 85 L 42 85 Q 40 65, 48 55 Q 52 40, 50 25 Z" fill="#e60000" />
                        
                        <!-- Right Curtain -->
                        <path d="M 50 25 A 20 20 0 0 1 70 45 L 70 85 L 58 85 Q 60 65, 52 55 Q 48 40, 50 25 Z" fill="#e60000" />

                        <!-- Curtain folds -->
                        <path d="M 34 85 Q 35 70, 43 55" fill="none" stroke="#7a0000" stroke-width="1.5" />
                        <path d="M 38 85 Q 38 70, 45 55" fill="none" stroke="#7a0000" stroke-width="1.5" />
                        <path d="M 45 55 Q 48 40, 45 30" fill="none" stroke="#7a0000" stroke-width="1.5" />
                        
                        <path d="M 66 85 Q 65 70, 57 55" fill="none" stroke="#7a0000" stroke-width="1.5" />
                        <path d="M 62 85 Q 62 70, 55 55" fill="none" stroke="#7a0000" stroke-width="1.5" />
                        <path d="M 55 55 Q 52 40, 55 30" fill="none" stroke="#7a0000" stroke-width="1.5" />
                    </svg>`;

const logoRegex = /<div class="logo">\s*<a href="([^"]+)"[^>]*>[\s\S]*?<\/a>\s*<\/div>/g;

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git') continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walk(fullPath);
        } else if (exts.includes(path.extname(fullPath))) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // 1. Replace logo
            if (path.extname(fullPath) === '.html') {
                const newLogoHTML = `<div class="logo">
                <a href="$1" style="display: flex; align-items: center; justify-content: center; text-decoration: none;" aria-label="Home">
                    ${logoSvg}
                </a>
            </div>`;
                const nextContent = content.replace(logoRegex, newLogoHTML);
                if (nextContent !== content) {
                    content = nextContent;
                    modified = true;
                }
            }

            // 2. Replace text occurrences
            const replacements = [
                { regex: /Vision X Cinemas/gi, text: 'THE HALL CINEMAS' },
                { regex: /Vision X/gi, text: 'THE HALL CINEMAS' },
                { regex: /Scene Cinema/gi, text: 'THE HALL CINEMAS' }
            ];

            for (const { regex, text } of replacements) {
                const replaced = content.replace(regex, text);
                if (replaced !== content) {
                    content = replaced;
                    modified = true;
                }
            }

            // Also clean up any accidental double words, e.g., "THE HALL CINEMAS Cinemas" or "THE HALL CINEMAS THE HALL CINEMAS"
            const doubleRegex1 = /THE HALL CINEMAS CINEMAS/gi;
            if (doubleRegex1.test(content)) {
                content = content.replace(doubleRegex1, 'THE HALL CINEMAS');
                modified = true;
            }
            const doubleRegex2 = /THE HALL CINEMAS THE HALL CINEMAS/gi;
            if (doubleRegex2.test(content)) {
                content = content.replace(doubleRegex2, 'THE HALL CINEMAS');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated:', fullPath);
            }
        }
    }
}

targetDirs.forEach(walk);
console.log('Done.');
