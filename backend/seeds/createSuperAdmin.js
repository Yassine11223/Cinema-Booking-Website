/**
 * Create or safely update the first Super Admin account.
 */

const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const { connectDatabase, mongoose } = require('../../config/database');
const User = require('../../models/User');

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (!arg.startsWith('--')) continue;
        const [rawKey, inlineValue] = arg.slice(2).split('=');
        const key = rawKey.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
        if (inlineValue !== undefined) {
            args[key] = inlineValue;
        } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
            args[key] = argv[i + 1];
            i += 1;
        } else {
            args[key] = true;
        }
    }
    return args;
}

function createReadline() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: process.stdout.isTTY,
    });
}

function ask(rl, question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim()));
    });
}

function askHidden(rl, question) {
    if (!process.stdout.isTTY) return ask(rl, question);

    const originalWrite = rl._writeToOutput;
    rl._writeToOutput = function writeHidden(output) {
        if (rl.stdoutMuted && output !== '\r\n' && output !== '\n' && output !== '\r') {
            rl.output.write('*');
            return;
        }
        rl.output.write(output);
    };

    rl.stdoutMuted = true;
    return ask(rl, question)
        .finally(() => {
            rl.stdoutMuted = false;
            rl._writeToOutput = originalWrite;
            rl.output.write('\n');
        });
}

async function askYesNo(rl, question, defaultNo = true) {
    const suffix = defaultNo ? ' [y/N]: ' : ' [Y/n]: ';
    const answer = (await ask(rl, question + suffix)).toLowerCase();
    if (!answer) return !defaultNo;
    return answer === 'y' || answer === 'yes';
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function validatePassword(password, allowBlank = false) {
    if (allowBlank && !password) return;
    if (!password) throw new Error('Password is required.');
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');
}

async function collectCredentials(rl, args, existingUser = null) {
    const env = {
        name: process.env.SUPER_ADMIN_NAME,
        email: process.env.SUPER_ADMIN_EMAIL,
        password: process.env.SUPER_ADMIN_PASSWORD,
    };

    const interactive = process.stdin.isTTY && process.stdout.isTTY;
    const defaults = {
        name: args.name || env.name || existingUser?.name || 'Super Admin',
        email: args.email || env.email || existingUser?.email || '',
        password: args.password || env.password || '',
    };

    if (!interactive) {
        return defaults;
    }

    const nameInput = await ask(rl, `Super Admin name${defaults.name ? ` [${defaults.name}]` : ''}: `);
    const emailInput = await ask(rl, `Super Admin email${defaults.email ? ` [${defaults.email}]` : ''}: `);

    let password = defaults.password;
    if (password) {
        const source = args.password ? 'CLI argument' : 'SUPER_ADMIN_PASSWORD';
        const useProvided = await askYesNo(rl, `Use password from ${source}?`, false);
        if (!useProvided) password = '';
    }

    const updatingExisting = Boolean(existingUser);
    if (!password) {
        const prompt = updatingExisting
            ? 'New Super Admin password (leave blank to keep existing password): '
            : 'Super Admin password: ';
        password = await askHidden(rl, prompt);

        if (password) {
            const confirm = await askHidden(rl, 'Confirm Super Admin password: ');
            if (password !== confirm) throw new Error('Passwords do not match.');
        }
    }

    return {
        name: nameInput || defaults.name,
        email: emailInput || defaults.email,
        password,
    };
}

async function applySuperAdmin(user, credentials, allowBlankPassword = false) {
    if (!isValidEmail(credentials.email)) {
        throw new Error('A valid Super Admin email is required.');
    }
    validatePassword(credentials.password, allowBlankPassword);

    if (user) {
        user.name = credentials.name || user.name || 'Super Admin';
        user.email = credentials.email.toLowerCase();
        user.role = 'super_admin';
        user.status = 'active';
        if (credentials.password) user.password = credentials.password;
        await user.save();
        return { action: 'updated', email: user.email };
    }

    const created = await User.create({
        name: credentials.name || 'Super Admin',
        email: credentials.email.toLowerCase(),
        password: credentials.password,
        role: 'super_admin',
        status: 'active',
    });

    return { action: 'created', email: created.email };
}

async function createSuperAdmin() {
    const args = parseArgs(process.argv.slice(2));
    const rl = createReadline();
    const interactive = process.stdin.isTTY && process.stdout.isTTY;

    await connectDatabase();

    try {
        const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
        if (existingSuperAdmin) {
            console.log(`Super Admin already exists: ${existingSuperAdmin.email}`);
            const shouldUpdate = args.updateExisting || args.update || (
                interactive && await askYesNo(rl, 'Update this Super Admin account?', true)
            );

            if (!shouldUpdate) {
                console.log('No changes made. No duplicate Super Admin was created.');
                return;
            }

            const credentials = await collectCredentials(rl, args, existingSuperAdmin);
            const result = await applySuperAdmin(existingSuperAdmin, credentials, true);
            console.log(`Super Admin ${result.action}: ${result.email}`);
            console.log('Password was not logged.');
            return;
        }

        const credentials = await collectCredentials(rl, args);
        if (!isValidEmail(credentials.email)) {
            throw new Error('A valid Super Admin email is required.');
        }
        validatePassword(credentials.password);

        const existingUser = await User.findByEmail(credentials.email);
        if (existingUser) {
            const shouldPromote = args.updateExisting || args.promote || (
                interactive && await askYesNo(rl, `User ${existingUser.email} already exists. Promote to Super Admin?`, true)
            );

            if (!shouldPromote) {
                console.log('No changes made. Existing user was not promoted.');
                return;
            }

            const result = await applySuperAdmin(existingUser, credentials);
            console.log(`Existing user promoted to Super Admin: ${result.email}`);
            console.log('Password was not logged.');
            return;
        }

        const result = await applySuperAdmin(null, credentials);
        console.log(`Super Admin ${result.action}: ${result.email}`);
        console.log('Password was not logged.');
    } finally {
        rl.close();
    }
}

createSuperAdmin()
    .catch((error) => {
        console.error('Failed to create Super Admin:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.connection.close().catch(() => {});
    });
