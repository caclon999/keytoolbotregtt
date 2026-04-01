const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== CẤU HÌNH ====================
const BOT_REG_TOKEN = "8639257506:AAG56juNd6FFP41mXSGtOdgzObfKhoupG30";
const UPTOLINK_API = "e15a2932b45cbc6b11b973a58cf379ca9f7187a1";
const WEBKEY_URL = "https://www.webkey.x10.mx/?ma=";

// ==================== DATABASE RAM ====================
const keyUsage = {};
const userFreeReg = {};
const tiktokAccounts = {};
let accountCounter = 0;

// ==================== HÀM TIỆN ÍCH ====================
function randomString(length = 8) {
    return crypto.randomBytes(length).toString('hex').substring(0, length);
}

function xor(str) {
    let result = '';
    for (let i = 0; i < str.length; i++) {
        result += (str.charCodeAt(i) ^ 5).toString(16);
    }
    return result;
}

function generatePassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function createShortLink(destinationUrl) {
    try {
        const apiUrl = `https://uptolink.one/api?api=${UPTOLINK_API}&url=${encodeURIComponent(destinationUrl)}&alias=CustomAlias`;
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            },
            timeout: 30000
        });
        if (response.data && response.data.status !== 'error') {
            return response.data.shortenedUrl || destinationUrl;
        }
        return destinationUrl;
    } catch (error) {
        return destinationUrl;
    }
}

// ==================== TEMP EMAIL SERVICE ====================
class TempEmailService {
    constructor() {
        this.tempEmail = null;
    }
    
    generateRandomEmail() {
        const domains = ['hunght1890.com', 'satato.com.vn'];
        const randomStr = randomString(15);
        const domain = domains[Math.floor(Math.random() * domains.length)];
        return `${randomStr}@${domain}`;
    }
    
    createTempEmail() {
        this.tempEmail = this.generateRandomEmail();
        return this.tempEmail;
    }
    
    async pollForMessage(logCallback, pollInterval = 15) {
        for (let attempt = 0; attempt < 12; attempt++) {
            if (logCallback) logCallback(`📧 Lần thử ${attempt + 1}/12...`);
            try {
                const url = `https://hunght1890.com/${this.tempEmail}`;
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': '*/*'
                    },
                    timeout: 10000
                });
                if (response.data && response.data.trim() && response.data.trim() !== '[]') {
                    const codeMatch = response.data.match(/\b\d{6}\b/);
                    if (codeMatch) return codeMatch[0];
                }
            } catch (error) {}
            await new Promise(resolve => setTimeout(resolve, pollInterval * 1000));
        }
        return null;
    }
}

// ==================== AVATAR SERVICE ====================
class AvatarService {
    async generateAvatar() {
        const so = Math.floor(Math.random() * 1000) + 1;
        return `https://testingbot.com/free-online-tools/random-avatar/${so}`;
    }
    
    async downloadAvatar(url) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                },
                timeout: 10000
            });
            return response.data;
        } catch (error) {
            return null;
        }
    }
    
    async uploadAvatarToTikTok(sessionKey, username, logCallback) {
        if (logCallback) logCallback("🖼️ Đang upload avatar...");
        try {
            const avatarUrl = await this.generateAvatar();
            const avatarData = await this.downloadAvatar(avatarUrl);
            if (!avatarData) return false;
            
            const csrfToken = sessionKey.split(';')[0];
            
            const headers = {
                'accept': 'application/json, text/plain, */*',
               // 'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'vi-VN,vi;q=0.9,en;q=0.8',
                'content-type': 'image/jpeg',
                'origin': 'https://www.tiktok.com',
                'referer': `https://www.tiktok.com/@${username}`,
                'sec-ch-ua': '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
                'cookie': `sessionid=${sessionKey}; session_key=${sessionKey}`,
                'x-tt-csrf-token': csrfToken
            };
            
            const params = {
                'aid': '1988',
                'app_language': 'vi',
                'app_name': 'tiktok_web',
                'browser_language': 'vi',
                'browser_name': 'Mozilla',
                'browser_online': 'true',
                'browser_platform': 'Win32',
                'browser_version': '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'channel': 'tiktok_web',
                'cookie_enabled': 'true',
                'device_id': Math.floor(Math.random() * 1000000000000000000),
                'device_platform': 'web_pc',
                'focus_state': 'true',
                'from_page': 'user',
                'history_len': '5',
                'is_fullscreen': 'false',
                'is_page_visible': 'true',
                'os': 'windows',
                'priority_region': 'VN',
                'referer': `https://www.tiktok.com/@${username}`,
                'region': 'VN',
                'screen_height': '1080',
                'screen_width': '1920',
                'tz_name': 'Asia/Ho_Chi_Minh',
                'webcast_language': 'vi',
                'msToken': ''
            };
            
            const response = await axios.post('https://www.tiktok.com/api/upload/avatar/', avatarData, {
                headers: headers,
                params: params,
                timeout: 30000
            });
            
            if (response.status === 200) {
                if (logCallback) logCallback("✅ Upload avatar thành công!");
                return true;
            }
            return false;
        } catch (error) {
            if (logCallback) logCallback(`⚠️ Lỗi upload: ${error.message}`);
            return false;
        }
    }
}

// ==================== ĐĂNG KÝ TÀI KHOẢN ====================
async function registerAccount(stt, userId, regType, logCallback) {
    if (!logCallback) logCallback = () => {};
    
    try {
        const emailService = new TempEmailService();
        const email = emailService.createTempEmail();
        if (!email) return null;
        logCallback(`✅ Email: ${email}`);
        
        const password = generatePassword();
        logCallback(`✅ Password: ${password}`);
        
        const sendCodeUrl = "https://api16-normal-c-alisg.tiktokv.com/passport/email/send_code/";
        
        const params = {
            "passport-sdk-version": "6031990",
            "device_platform": "android",
            "os": "android",
            "ssmix": "a",
            "_rticket": Date.now(),
            "cdid": "a90f0ed5-8028-413e-a00d-77e931779d00",
            "channel": "googleplay",
            "aid": "1233",
            "app_name": "musical_ly",
            "version_code": "370805",
            "version_name": "37.8.5",
            "manifest_version_code": "2023708050",
            "update_version_code": "2023708050",
            "ab_version": "37.8.5",
            "resolution": "900*1600",
            "dpi": "240",
            "device_type": "NE2211",
            "device_brand": "OnePlus",
            "language": "en",
            "os_api": "28",
            "os_version": "9",
            "ac": "wifi",
            "is_pad": "0",
            "current_region": "TW",
            "app_type": "normal",
            "sys_region": "US",
            "last_install_time": Math.floor(Date.now() / 1000) - 3600,
            "mcc_mnc": "46692",
            "timezone_name": "Asia/Baghdad",
            "carrier_region_v2": "466",
            "residence": "TW",
            "app_language": "en",
            "carrier_region": "TW",
            "timezone_offset": "10800",
            "host_abi": "arm64-v8a",
            "locale": "en-GB",
            "ac2": "wifi",
            "uoo": "0",
            "op_region": "TW",
            "build_number": "37.8.5",
            "region": "GB",
            "ts": Math.floor(Date.now() / 1000),
            "iid": "7528525992324908807",
            "device_id": "7528525775047132680",
            "openudid": "7a59d727a58ee91e",
            "support_webview": "1",
            "reg_store_region": "tw",
            "user_selected_region": "0",
            "okhttp_version": "4.2.210.6-tiktok",
            "use_store_region_cookie": "1",
            "app_version": "37.8.5"
        };
        
        const payload = {
            'rules_version': "v2",
            'password': xor(password),
            'account_sdk_source': "app",
            'mix_mode': "1",
            'multi_login': "1",
            'type': "34",
            'email': xor(email),
            'email_theme': "2"
        };
        
        const cookies = {
            "install_id": "7528525992324908807",
            "passport_csrf_token": "13e1ddab691a6a5ed7cd70592d960fe7",
            "passport_csrf_token_default": "13e1ddab691a6a5ed7cd70592d960fe7"
        };
        
        logCallback(`📨 Đang gửi mã xác minh...`);
        
        const headers = {
            'User-Agent': "com.zhiliaoapp.musically/2023708050 (Linux; U; Android 9; en_GB; NE2211; Build/SKQ1.220617.001;tt-ok/3.12.13.16)",
            'Connection': "Keep-Alive",
           // 'Accept-Encoding': "gzip",
            'x-tt-pba-enable': "1",
            'x-bd-kmsv': "0",
            'x-tt-dm-status': "login=1;ct=1;rt=8",
            'x-bd-client-key': "#yEjw14J8W9l4SfT9U1TO60CXVvhTKWlciV4wIs/yJvoJp9e6R85bFU+QLZlj2NzfUISVioYXoQrs9gx6",
            'x-tt-passport-csrf-token': "13e1ddab691a6a5ed7cd70592d960fe7",
            'tt-ticket-guard-public-key': "BHxT6qq83FTRAnJYjUgFDzwxX14GDgGVWmXnZftx8oJntWW03KYyAqdengSdAMgufFURdqiqF23x6RFV+F4593I=",
            'sdk-version': "2",
            'tt-ticket-guard-iteration-version': "0",
            'tt-ticket-guard-version': "3",
            'passport-sdk-settings': "x-tt-token",
            'passport-sdk-sign': "x-tt-token",
            'passport-sdk-version': "6031990",
            'x-tt-bypass-dp': "1",
            'oec-vc-sdk-version': "3.0.5.i18n",
            'x-vc-bdturing-sdk-version': "2.3.8.i18n",
            'x-tt-request-tag': "n=0;nr=011;bg=0"
        };
        
        const sendResp = await axios.post(sendCodeUrl, new URLSearchParams(payload), {
            headers: headers,
            params: params,
            timeout: 30000
        });
        
        if (sendResp.data && sendResp.data.includes("Maximum number of attempts reached")) {
            logCallback(`❌ Đã đạt giới hạn đăng ký!`);
            return null;
        }
        
        if (!sendResp.data.includes("email_ticket")) return null;
        logCallback(`✅ Đã gửi mã xác minh`);
        
        logCallback(`📬 Đang chờ nhận mã...`);
        const code = await emailService.pollForMessage(logCallback);
        if (!code) return null;
        logCallback(`✅ Mã: ${code}`);
        
        const registerUrl = "https://api16-normal-c-alisg.tiktokv.com/passport/email/register_verify_login/";
        const regPayload = {
            'birthday': "2002-02-24",
            'fixed_mix_mode': "1",
            'code': xor(code),
            'account_sdk_source': "app",
            'mix_mode': "1",
            'multi_login': "1",
            'type': "34",
            'email': xor(email)
        };
        
        logCallback(`📝 Đang đăng ký tài khoản...`);
        
        const regResp = await axios.post(registerUrl, new URLSearchParams(regPayload), {
            headers: headers,
            params: params,
            timeout: 30000
        });
        
        if (regResp.data && regResp.data.includes("session_key")) {
            const data = regResp.data.data;
            const sessionKey = data.session_key;
            const username = data.name;
            
            logCallback(`✅ ĐĂNG KÝ THÀNH CÔNG! @${username}`);
            
            const avatarService = new AvatarService();
            await avatarService.uploadAvatarToTikTok(sessionKey, username, logCallback);
            
            accountCounter++;
            tiktokAccounts[accountCounter] = {
                id: accountCounter,
                username: username,
                email: email,
                password: password,
                session_key: sessionKey,
                cookie_string: `sessionid=${sessionKey}; session_key=${sessionKey}`,
                status: 'LIVE',
                created_at: new Date().toISOString(),
                user_id: userId,
                is_alive: 1
            };
            
            return { username, email, password, session: sessionKey };
        }
        return null;
    } catch (error) {
        logCallback(`❌ Lỗi: ${error.message}`);
        return null;
    }
}

// ==================== TEMPLATE HTML ====================
const KEYBOT_TEMPLATE = (key, shortUrl) => `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Key TikTok Bot</title>
<style>
body{font-family:Arial;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;justify-content:center;align-items:center;margin:0;padding:20px}
.container{background:white;border-radius:20px;padding:40px;text-align:center;max-width:500px;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
.key{font-size:28px;font-weight:bold;color:#667eea;background:#f5f5f5;padding:20px;border-radius:10px;margin:20px 0;word-break:break-all;font-family:monospace}
.btn{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;padding:12px 30px;border-radius:25px;font-size:16px;cursor:pointer;margin:10px}
.btn-copy{background:#28a745}
.info{margin-top:20px;font-size:12px;color:#666}
code{background:#f0f0f0;padding:2px 6px;border-radius:4px}
.short-link{margin-top:16px;padding:12px;background:#f3f4f6;border-radius:12px;font-size:12px}
</style>
</head>
<body>
<div class=container>
<h1>🔑 KEY TIKTOK BOT</h1>
<div class=key id=keyValue>${key}</div>
<button class="btn btn-copy" onclick="copyKey()">📋 COPY KEY</button>
<button class=btn onclick="window.open('https://t.me/tiktok_reg_bot')">🤖 MỞ BOT</button>
<div class=info><strong>CÁCH DÙNG:</strong><br>1. Copy key bên trên<br>2. Mở bot: <code>@tiktok_reg_bot</code><br>3. Gửi: <code>/key ${key}</code><br>4. Nhận 3 lượt đăng ký VIP!</div>
<div class=short-link>🔗 Link rút gọn: <a href="${shortUrl}" target="_blank">${shortUrl}</a></div>
</div>
<script>function copyKey(){const k=document.getElementById('keyValue').innerText;navigator.clipboard.writeText(k);alert('✅ Đã copy key: '+k)}</script>
</body>
</html>
`;

// ==================== API ROUTES ====================
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'TikTok Key Bot API is running!',
        version: '2.0'
    });
});

app.get('/keybot.html', async (req, res) => {
    let key = req.query.key || '';
    if (!key) {
        key = crypto.randomBytes(8).toString('hex');
    }
    
    if (!keyUsage[key]) {
        keyUsage[key] = {
            used_count: 0,
            max_uses: 3,
            created_at: new Date().toISOString()
        };
    }
    
    const keyLink = `${WEBKEY_URL}${key}`;
    const shortUrl = await createShortLink(keyLink);
    
    res.send(KEYBOT_TEMPLATE(key, shortUrl));
});

app.get('/api/congluotokey', (req, res) => {
    try {
        const key = req.query.key;
        const userId = req.query.user_id;
        
        if (!key || !userId) {
            return res.status(400).json({ status: 'error', message: 'Missing key or user_id' });
        }
        
        if (!keyUsage[key]) {
            keyUsage[key] = {
                used_count: 1,
                max_uses: 3,
                user_id: parseInt(userId),
                used_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            return res.json({
                status: 'success',
                message: 'Key hợp lệ! Còn 2 lượt',
                remaining: 2,
                added: 3
            });
        }
        
        const kd = keyUsage[key];
        if (kd.used_count >= kd.max_uses) {
            return res.status(403).json({
                status: 'error',
                message: 'Key đã hết lượt sử dụng',
                remaining: 0
            });
        }
        
        kd.used_count += 1;
        kd.user_id = parseInt(userId);
        kd.used_at = new Date().toISOString();
        const remaining = kd.max_uses - kd.used_count;
        
        res.json({
            status: 'success',
            message: `Còn ${remaining} lượt`,
            remaining: remaining,
            added: 3
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.get('/api/getkey', async (req, res) => {
    try {
        const userId = req.query.user_id || '';
        const key = crypto.randomBytes(8).toString('hex');
        
        if (!keyUsage[key]) {
            keyUsage[key] = {
                used_count: 0,
                max_uses: 3,
                user_id: userId ? parseInt(userId) : 0,
                created_at: new Date().toISOString()
            };
        }
        
        const keyLink = `${WEBKEY_URL}${key}`;
        const shortUrl = await createShortLink(keyLink);
        
        res.json({
            status: 'success',
            key: key,
            shortenedUrl: shortUrl,
            message: 'Bạn Cần Vượt Link Để Có Key'
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.get('/api/check_key', (req, res) => {
    try {
        const key = req.query.key;
        if (!key) {
            return res.status(400).json({ status: 'error', message: 'Missing key' });
        }
        
        if (!keyUsage[key]) {
            return res.json({ status: 'error', message: 'Key không tồn tại', exists: false });
        }
        
        const kd = keyUsage[key];
        const remaining = kd.max_uses - kd.used_count;
        
        res.json({
            status: 'success',
            exists: true,
            used_count: kd.used_count,
            max_uses: kd.max_uses,
            remaining: remaining
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.get('/api/stats', (req, res) => {
    res.json({
        status: 'success',
        total_keys: Object.keys(keyUsage).length,
        total_used: Object.values(keyUsage).reduce((sum, k) => sum + (k.used_count || 0), 0),
        active_keys: Object.values(keyUsage).filter(k => k.used_count < k.max_uses).length,
        total_accounts: accountCounter
    });
});

// ==================== TELEGRAM BOT ====================
const bot = new TelegramBot(BOT_REG_TOKEN, { polling: true });

bot.onText(/\/regfree(.+)?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    let sl = 1;
    if (match[1]) {
        const num = parseInt(match[1].trim());
        if (!isNaN(num)) sl = Math.min(num, 3);
    }
    
    const today = new Date().toISOString().split('T')[0];
    let used = 0;
    if (userFreeReg[userId] && userFreeReg[userId].last_date === today) {
        used = userFreeReg[userId].reg_count;
    }
    const remaining = 3 - used;
    
    if (remaining <= 0) {
        bot.sendMessage(chatId, "❌ Bạn đã hết lượt free hôm nay! Dùng /getkey để nhận key VIP.");
        return;
    }
    
    if (sl > remaining) sl = remaining;
    
    const msgSend = await bot.sendMessage(chatId, `🚀 Đang đăng ký ${sl} tài khoản FREE...`);
    const results = [];
    
    for (let i = 0; i < sl; i++) {
        const result = await registerAccount(i+1, userId, 'free', (log) => {});
        if (result) {
            results.push(result);
            if (!userFreeReg[userId] || userFreeReg[userId].last_date !== today) {
                userFreeReg[userId] = { reg_count: 1, last_date: today, username: msg.from.username || '' };
            } else {
                userFreeReg[userId].reg_count++;
            }
        }
    }
    
    if (results.length > 0) {
        let text = `✅ THÀNH CÔNG ${results.length}/${sl}\n\n`;
        results.forEach(acc => {
            text += `👤 @${acc.username}\n📧 ${acc.email}\n🔑 ${acc.password}\n${'-'.repeat(30)}\n`;
        });
        bot.editMessageText(text, { chat_id: chatId, message_id: msgSend.message_id });
    } else {
        bot.editMessageText("❌ Đăng ký thất bại!", { chat_id: chatId, message_id: msgSend.message_id });
    }
});

bot.onText(/\/regvip(.+)?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    let sl = 1;
    if (match[1]) {
        const num = parseInt(match[1].trim());
        if (!isNaN(num)) sl = Math.min(num, 10);
    }
    
    const msgSend = await bot.sendMessage(chatId, `🚀 Đang đăng ký ${sl} tài khoản VIP...`);
    const results = [];
    
    for (let i = 0; i < sl; i++) {
        const result = await registerAccount(i+1, userId, 'vip', (log) => {});
        if (result) results.push(result);
    }
    
    if (results.length > 0) {
        let text = `✅ VIP THÀNH CÔNG ${results.length}/${sl}\n\n`;
        results.forEach(acc => {
            text += `👤 @${acc.username}\n📧 ${acc.email}\n🔑 ${acc.password}\n${'-'.repeat(30)}\n`;
        });
        bot.editMessageText(text, { chat_id: chatId, message_id: msgSend.message_id });
    } else {
        bot.editMessageText("❌ Đăng ký thất bại!", { chat_id: chatId, message_id: msgSend.message_id });
    }
});

bot.onText(/\/key (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const key = match[1];
    
    try {
        const response = await axios.get(`https://keytoolbotregtt.vercel.app/api/congluotokey`, {
            params: { key, user_id: userId }
        });
        const result = response.data;
        if (result.status === 'success') {
            bot.sendMessage(chatId, `✅ ${result.message}\n📊 Còn ${result.remaining} lượt`);
        } else {
            bot.sendMessage(chatId, `❌ ${result.message}`);
        }
    } catch (error) {
        bot.sendMessage(chatId, `❌ Lỗi: ${error.message}`);
    }
});

bot.onText(/\/getkey/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        const response = await axios.get(`https://keytoolbotregtt.vercel.app/api/getkey`, {
            params: { user_id: userId }
        });
        const result = response.data;
        if (result.status === 'success') {
            bot.sendMessage(chatId, 
                `🔑 NHẬN KEY MIỄN PHÍ\n\n` +
                `🔗 Link: ${result.shortenedUrl}\n\n` +
                `Sau khi vượt link, dùng: /key ${result.key}`
            );
        } else {
            bot.sendMessage(chatId, `❌ ${result.message}`);
        }
    } catch (error) {
        bot.sendMessage(chatId, `❌ Lỗi: ${error.message}`);
    }
});

bot.onText(/\/checkaccreg (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1];
    
    const account = Object.values(tiktokAccounts).find(acc => acc.username === username);
    if (account) {
        bot.sendMessage(chatId,
            `✅ @${account.username}\n` +
            `📧 ${account.email}\n` +
            `🔑 ${account.password}\n` +
            `🍪 ${account.session_key.substring(0, 30)}...\n` +
            `📅 ${account.created_at}`
        );
    } else {
        bot.sendMessage(chatId, `❌ Không tìm thấy @${username}`);
    }
});

bot.onText(/\/myacc/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const accounts = Object.values(tiktokAccounts).filter(acc => acc.user_id === userId);
    if (accounts.length === 0) {
        bot.sendMessage(chatId, "❌ Bạn chưa có tài khoản nào!");
        return;
    }
    
    let text = `📋 ${accounts.length} tài khoản:\n\n`;
    accounts.forEach(acc => {
        text += `👤 @${acc.username}\n📧 ${acc.email}\n🔑 ${acc.password}\n${'-'.repeat(30)}\n`;
    });
    bot.sendMessage(chatId, text);
});

// ==================== EXPORT ====================
module.exports = app;
