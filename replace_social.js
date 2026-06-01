const fs = require('fs');
const path = require('path');

const targetDirs = ['frontend', 'admin', 'backend'];
const exts = ['.html'];

const newSocialLinks = `<div class="social-links">
                        <a href="https://www.instagram.com/the_hall001?igsh=djcwOXh0YmVnNWQ%3D&utm_source=qr" target="_blank" class="social-link" aria-label="Instagram">
                            <i class="fab fa-instagram"></i>
                        </a>
                        <a href="https://www.tiktok.com/@thehalll0?_r=1&_t=ZS-96lahEDhLPt" target="_blank" class="social-link" aria-label="TikTok">
                            <i class="fab fa-tiktok"></i>
                        </a>
                        <a href="https://www.youtube.com/@Hallcinema1123" target="_blank" class="social-link" aria-label="YouTube">
                            <i class="fab fa-youtube"></i>
                        </a>
                    </div>`;

// Regex to match <div class="social-links"> followed by its contents until the matching </div>
// Since regex can be tricky with nested divs, we know this div only contains <a> elements.
const socialRegex = /<div class="social-links">[\s\S]*?<\/div>/g;

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

            const replaced = content.replace(socialRegex, newSocialLinks);
            if (replaced !== content) {
                content = replaced;
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
console.log('Done replacing social links.');
