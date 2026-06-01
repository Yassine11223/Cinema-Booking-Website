const fs = require('fs');
const path = require('path');

const targetDirs = ['frontend', 'admin', 'backend'];
const exts = ['.html', '.js', '.css', '.json'];

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

            const replacements = [
                { regex: /Scene AI/gi, text: 'THE HALL AI' },
                { regex: /Scene Assistant/gi, text: 'THE HALL Assistant' },
                { regex: /Scene Rewards/gi, text: 'THE HALL Rewards' },
                { regex: /scenecinemas\.com/gi, text: 'thehallcinemas.com' },
                { regex: /@scene\.com/gi, text: '@thehallcinemas.com' },
                { regex: />SCENE<\/span><span class="brand-w"> CINEMAS/gi, text: '>THE HALL</span><span class="brand-w"> CINEMAS' },
                { regex: /<span class="ticket-cinema-name">SCENE<\/span>/gi, text: '<span class="ticket-cinema-name">THE HALL</span>' },
                { regex: /Welcome to Scene AI/gi, text: 'Welcome to THE HALL AI' },
                { regex: /scene_user/g, text: 'thehall_user' },
                { regex: /scene_chatbot_history/g, text: 'thehall_chatbot_history' },
                { regex: /scene_bookings/g, text: 'thehall_bookings' },
                { regex: /scene_movies_catalog/g, text: 'thehall_movies_catalog' },
                { regex: /scene_users_local/g, text: 'thehall_users_local' },
                { regex: /scene_remember_email/g, text: 'thehall_remember_email' }
            ];

            for (const { regex, text } of replacements) {
                const replaced = content.replace(regex, text);
                if (replaced !== content) {
                    content = replaced;
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated:', fullPath);
            }
        }
    }
}

targetDirs.forEach(walk);
console.log('Done additional replacements.');
