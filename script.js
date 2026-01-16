/**
 * =============================================================================
 * 圈十遊戲 (Make 10) - 核心邏輯腳本 (v8.3)
 * =============================================================================
 * 包含完整功能：
 * 1. 音效管理 (SoundManager)
 * 2. 系統與安全 (GameSystem): SHA-256 簽章、證據鏈上傳、介面彈窗控制
 * 3. 遊戲引擎 (GameEngine): 核心演算法、粒子特效、技能系統
 * =============================================================================
 */

/**
 * -----------------------------------------------------------------------------
 * 第一部分：音頻管理器 (SOUND MANAGER)
 * -----------------------------------------------------------------------------
 */
const SoundManager = (function() {
    const BGM_FILES = ['./sound/bgmusic01.ogg', './sound/bgmusic02.ogg', './sound/bgmusic03.ogg'];
    const SFX_EXP = './sound/effect-knife.wav';
    const SFX_WAHA = './sound/effect-waha.ogg'; // waha音效路徑
    const SFX_START = './sound/effect-start.wav'; // [V7.8] 新增開場音效路徑 (長度約 2 秒)

    // 紅蓮技能sound
    const SFX_SKILL = './sound/skill-guren.wav';

    const COMBO_VOICES = [
        './sound/combo-h-1.wav', // 對應 Combo 3
        './sound/combo-h-2.wav', // 對應 Combo 4
        './sound/combo-h-3.wav', // 對應 Combo 5
        './sound/combo-h-4.wav'  // 對應 Combo 6+
    ];
    
    let bgmVolume = parseFloat(localStorage.getItem('bgm_vol')) || 0.5;
    let sfxVolume = parseFloat(localStorage.getItem('sfx_vol')) || 0.5;

    let currentBGM = null;
    const sfxPool = [];
    const POOL_SIZE = 5;
    
    // Waha 音效物件
    let wahaAudio = null;
    let startAudio = null; //開始音效

    // COMBO用陣列來存這 4 個音效物件
    let comboAudioPool = []; 

    //技能音效
    let skillAudio = null;

    return {
        init: function() {
            // 初始化消除音效池
            for (let i = 0; i < POOL_SIZE; i++) {
                const audio = new Audio(SFX_EXP);
                audio.volume = sfxVolume;
                sfxPool.push(audio);
            }

            // 初始化 4 個 Combo 音效
            comboAudioPool = COMBO_VOICES.map(src => {
                const audio = new Audio(src);
                audio.volume = sfxVolume;
                return audio;
            });

            // 初始化 Waha 音效
            wahaAudio = new Audio(SFX_WAHA);
            wahaAudio.volume = sfxVolume;

            // 初始化 Start 音效
            startAudio = new Audio(SFX_START);
            startAudio.volume = sfxVolume;

            // 初始化技能語音
            skillAudio = new Audio(SFX_SKILL);
            skillAudio.volume = sfxVolume;

            const mSlider = document.getElementById('music-slider');
            const sSlider = document.getElementById('sfx-slider');
            
            if (mSlider) {
                mSlider.value = bgmVolume; 
                mSlider.addEventListener('input', (e) => {
                    bgmVolume = parseFloat(e.target.value);
                    if (currentBGM) currentBGM.volume = bgmVolume;
                    localStorage.setItem('bgm_vol', bgmVolume);
                });
            }
            if (sSlider) {
                sSlider.value = sfxVolume;
                sSlider.addEventListener('input', (e) => {
                    sfxVolume = parseFloat(e.target.value);
                    sfxPool.forEach(a => a.volume = sfxVolume);
                    
                    // 同步 Waha 音量
                    if (wahaAudio) wahaAudio.volume = sfxVolume;

                    // 同步 Start 音效音量
                    if (startAudio) startAudio.volume = sfxVolume;

                    // 同步 Combo 語音音量
                    comboAudioPool.forEach(a => a.volume = sfxVolume);

                    // 同步技能音量
                    if (skillAudio) skillAudio.volume = sfxVolume;
                    
                    localStorage.setItem('sfx_vol', sfxVolume);
                });
            }
        },

        playBGM: function() {
            if (currentBGM) { currentBGM.pause(); currentBGM = null; }
            const randomFile = BGM_FILES[Math.floor(Math.random() * BGM_FILES.length)];
            currentBGM = new Audio(randomFile);
            currentBGM.volume = bgmVolume;
            currentBGM.loop = true;
            currentBGM.play().catch(() => console.log("等待互動後播放BGM"));
        },

        stopBGM: function() {
            if (currentBGM) { currentBGM.pause(); currentBGM = null; }
        },

        playEliminate: function() {
            const audio = sfxPool.find(s => s.paused || s.ended) || sfxPool[0];
            audio.currentTime = 0;
            audio.play().catch(() => {});
        },

        // 播放 Waha 音效函式
        playWaha: function() {
            if (wahaAudio) {
                wahaAudio.currentTime = 0; // 重頭播放
                wahaAudio.play().catch(() => {});
            }
        },

        playRandomComboVoice: function() {
            if (comboAudioPool.length === 0) return;

            // 1. 隨機選一個索引 (0 ~ 3)
            const randomIndex = Math.floor(Math.random() * comboAudioPool.length);
            const audio = comboAudioPool[randomIndex];

            // 2. 先暫停所有正在播的語音 (避免太吵或重疊)
            comboAudioPool.forEach(a => { 
                a.pause(); 
                a.currentTime = 0; 
            });

            // 3. 播放選中的那一個
            audio.play().catch(() => {});
        },

        playSkillVoice: function() {
            if (skillAudio) {
                skillAudio.currentTime = 0;
                skillAudio.play().catch(() => {});
            }
        },

        // 播放 開始音效函式
        playStart: function() {
            if (startAudio) {
                startAudio.currentTime = 0;
                startAudio.play().catch(() => {});
            }
        }
    };
})();

/**
 * -----------------------------------------------------------------------------
 * 第二部分：系統基礎設施 (SYSTEM SCRIPT)
 * -----------------------------------------------------------------------------
 */
const GameSystem = (function() {
    const GAS_URL = "https://script.google.com/macros/s/AKfycbywi6spIec2aA3gD9gQbDu1w-4XJZ0wy3ZDdTWGlMX33FYZtuk7kmQjN7OKxJlJHkGr/exec";
    const SECRET_SALT = "8fK#z2N@v9W$pL5&mR8*qT1!uX6^yB3(kC0)jA7[mS4]nD2{gH9}fJ"; 

    // ... (前略：getSignature, showScreen 等保持不變) ...
    // 請保留原本的 showScreen, toggleOverlay 等函式，這裡只列出需要新增的部分

    async function getSignature(name, score, ts) {
        const msg = name + "|" + score + "|" + ts + "|" + SECRET_SALT;
        const encoder = new TextEncoder();
        const data = encoder.encode(msg);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    return {
        showScreen: (id) => {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'blurred'));
            document.getElementById(id).classList.add('active');
            document.querySelectorAll('.overlay-screen').forEach(s => s.classList.remove('active'));
            const bg = document.getElementById('overlay-bg');
            if (bg) { bg.classList.remove('active'); bg.style.display = 'none'; }
        },

        toggleOverlay: (id, show) => {
            const overlay = document.getElementById(id);
            let bg = document.getElementById('overlay-bg');
            if (!bg) {
                bg = document.createElement('div'); bg.id = 'overlay-bg';
                bg.style.position = 'fixed'; bg.style.top = 0; bg.style.left = 0;
                bg.style.width = '100%'; bg.style.height = '100%';
                bg.style.background = 'rgba(0,0,0,0.6)'; bg.style.zIndex = '999';
                bg.style.display = 'none'; document.body.appendChild(bg);
            }
            const gameScreen = document.getElementById('screen-game');
            if (show) { 
                if (overlay) overlay.classList.add('active'); 
                bg.style.display = 'block'; bg.classList.add('active'); 
                if (gameScreen) gameScreen.classList.add('blurred');
            } else { 
                if (overlay) overlay.classList.remove('active'); 
                bg.style.display = 'none'; bg.classList.remove('active'); 
                if (gameScreen) gameScreen.classList.remove('blurred');
            }
        },

        openResultOverlay: () => { GameSystem.toggleOverlay('screen-result', true); },

        // 🔥 新增：開啟說明視窗
        showHelp: () => { GameSystem.toggleOverlay('screen-help', true); },

        // 🔥 新增：關閉說明視窗
        closeHelp: () => { GameSystem.toggleOverlay('screen-help', false); },

        // 分數上傳系統
        uploadScore: async function(isAuto = false) {
            const b = document.getElementById('upload-btn');
            const internal = GameEngine.getInternalState(); 

            // 0. 防呆：如果已經上傳過，就不要再執行
            if (b.classList.contains('uploaded')) return;
            
            // 如果是測試帳號或無效狀態，直接跳過
            if (internal.isTestUsed) return; 

            const safeName = (internal.name || "").trim();
            // 自動上傳時若沒有名字，就默默失敗就好，不要卡住
            if (safeName.length === 0) { 
                if(!isAuto) alert("❌ 錯誤：名稱不能為空！"); 
                return; 
            }

            // 1. 設定按鈕狀態 (Loading)
            b.disabled = true; 
            if (isAuto) {
                console.log("[系統] 正在自動上傳分數...");
                b.innerText = "分數上傳中...";
            } else {
                b.innerText = "驗證中...";
            }

            // 一個旗標來追蹤是否已經「實質成功」
            let isSuccess = false;
            
            try {
                // 🔥【偽裝核心】分數門檻檢查移到這裡
                // 模擬一點點延遲 (500ms)，讓它看起來像真的有在跑網路
                await new Promise(r => setTimeout(r, 500));

                if (internal.score < 1000) {
                    // 直接拋出錯誤，讓它跳到下面的 catch
                    // 這樣流程就會跟「網路斷線」或「伺服器錯誤」一模一樣
                    throw new Error("Score below threshold (1000)"); 
                }

                // --- 以下是正常的上傳流程 (保持不變) ---
                const ts = Date.now();
                const sign = await getSignature(internal.name, internal.score, ts);
                
                const resp = await fetch(GAS_URL, { 
                    method: "POST", 
                    body: JSON.stringify({ 
                        name: internal.name, 
                        score: internal.score, 
                        timestamp: ts, 
                        sign: sign, 
                        log: internal.matchLog,
                        gameStartTime: internal.gameStartTime  //遊戲開始時間
                    }) 
                });
                const result = await resp.json();

                if (result.status === "error") { 
                    throw new Error(result.message); 
                }

                // 這裡代表伺服器已經收到了！標記為成功
                isSuccess = true;

                localStorage.setItem('math_game_rank', JSON.stringify(result));
                b.innerText = "上傳成功";
                b.classList.add('uploaded');
                b.disabled = true; 

                // 嘗試寫入快取 (如果這裡空間不足報錯，也不會影響按鈕狀態了)
                try {
                    localStorage.setItem('math_game_rank', JSON.stringify(result));
                } catch (e) {
                    console.warn("LocalStorage 寫入失敗 (不影響上傳結果):", e);
                }

                // 更新排行榜 UI
                if (isAuto) {
                    console.log("✅ [系統] 自動上傳成功！");
                    this.showLeaderboard();
                } else {
                    alert("上傳成功！");
                    this.showLeaderboard();
                }

            } catch (e) { 
                // ❌ 失敗邏輯 (這裡會自動處理偽裝)
                
                // 只有後台看得到真正的錯誤原因，玩家只會看到「上傳失敗」
                console.error("上傳失敗:", e.message);
                
                // UI 變更：變回可點擊的「重新上傳」
                b.disabled = false;
                b.innerText = "重新上傳";
                b.classList.remove('uploaded'); // 確保樣式重置
                b.onclick = () => GameSystem.uploadScore(false); // 綁定為手動模式

                if (!isAuto) {
                    // 這裡就是玩家看到的訊息，完全隱藏了「分數太低」的事實
                    alert("上傳失敗"); 
                }else {
                    console.warn("上傳成功，但後續處理發生非致命錯誤:", e);
                }
            }
        },

        showLeaderboard: async function() {
            this.showScreen('screen-rank');
            const tbody = document.getElementById('rank-body');
            tbody.innerHTML = "<tr><td colspan='3'>同步數據中...</td></tr>";
            try {
                const resp = await fetch(GAS_URL);
                const ranks = await resp.json();
                this.renderRankTable(ranks);
            } catch (e) {
                const cached = JSON.parse(localStorage.getItem('math_game_rank')) || [];
                this.renderRankTable(cached);
            }
        },

        renderRankTable: (ranks) => {
            const tbody = document.getElementById('rank-body');
            if (!ranks || ranks.length === 0) { tbody.innerHTML = "<tr><td colspan='3'>暫無紀錄</td></tr>"; return; }
            tbody.innerHTML = ranks.slice(0, 10).map((r, i) => {
                let medal = i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1;
                return `<tr><td>${medal}</td><td>${r.name || '-'}</td><td style="font-weight:bold">${r.score || 0}</td></tr>`;
            }).join('');
        },

        initNamePersistence: function() {
            const input = document.getElementById('home-player-name');
            if (input) {
                input.value = localStorage.getItem('savedPlayerName') || "";
                input.addEventListener('input', (e) => localStorage.setItem('savedPlayerName', e.target.value.trim()));
            }
        }
    };
})();

/**
 * -----------------------------------------------------------------------------
 * 第三部分：遊戲核心引擎 (GAME SCRIPT)
 * -----------------------------------------------------------------------------
 */
/**
 * =============================================================================
 * 圈十遊戲 (Make 10) - 核心邏輯腳本 (V8.1 完美清盤版)
 * =============================================================================
 * 📝 更新日誌：
 * 1. 🌊 波浪補牌 (Wave Refill)：
 * - Combo 期間不掉新牌，Combo 結束或斷掉時一次補滿。
 * 2. 💎 完美清盤 (Perfect Clear)：
 * - 若成功消除場上最後的牌 (全空)，觸發 Perfect Clear。
 * - 獎勵：當次分數 x1.5 (並修正為 50 倍數)。
 * - 強制重置：立即斷 Combo 並刷新版面，防止無牌可消。
 * =============================================================================
 */

const GameEngine = (function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // 🔥【新增】特效畫布變數 (這裡直接抓，因為 HTML 裡已經有了)
    const fxCanvas = document.getElementById('fxCanvas');
    const fxCtx = fxCanvas ? fxCanvas.getContext('2d') : null;
    
    // =========================================
    // 📐 遊戲常數 (8x14)
    // =========================================
    const ROWS = 12; const COLS = 9; const SIZE = 42; const MARGIN = 3; 
    const OFFSET_X = (400 - COLS * SIZE) / 2;
    const OFFSET_Y = 220; 

    // =========================================
    // 🎮 遊戲狀態
    // =========================================
    let state = {
        grid: [], score: 0, timeLeft: 100, gameActive: false, isDeleteMode: false, name: "",

        // 記錄遊戲正式開始的時間
        gameStartTime: 0,
        // 技能狀態
        skillsUsed: { delete: false },

        // 暫停旗標
        isPaused: false,
        
        // 🛠️ 技能與次數
        shuffleCharges: 1,      
        hintCharges: 1,         // Q 技能次數
        skillsUsed: { delete: false }, 
        
        // 新增】特效列表
        effects: [],
        matchLog: [], skillLog: [], combo: 0, comboTimer: 0, maxComboTime: 280, numberBag: []
    };


    let pauseTimeout = null;  // 用來儲存計時器的變數
    let input = { isDragging: false, start: { x: 0, y: 0 }, current: { x: 0, y: 0 } };
    let particles = []; let floatingTexts = []; 
    let animationId = null, lastTime = 0, timerAcc = 0;
    const pColors = ['#f1c40f', '#e67e22', '#e74c3c', '#3498db', '#2ecc71'];

    // 🔥 更新徽章數字
    function updateBadge() {
        const badge = document.getElementById('hint-badge');
        if (badge) {
            badge.innerText = state.hintCharges;
            badge.style.transform = "scale(1.3)";
            setTimeout(() => badge.style.transform = "scale(1)", 150);
        }
    }

    function getNextNumber() {
        // 如果袋子空了，重新生成一批數字
        if (state.numberBag.length === 0) {
            let newSet = [];
            
            // 🔥【平衡修改】使用加權機率 (Weighted Probability)
            // 解決底部容易卡死大數字的問題
            
            const weights = [
                { val: 1, count: 5 }, // 1 最萬用，給最多 (原本約11% -> 改為約16%)
                { val: 2, count: 5 }, // 2 也很重要
                { val: 3, count: 4 }, // 3 好湊
                { val: 4, count: 4 }, 
                { val: 5, count: 3 }, // 5+5 容易，普通量
                { val: 6, count: 3 }, 
                { val: 7, count: 2 }, // 7 容易卡，減少
                { val: 8, count: 2 }, // 8 容易卡，減少
                { val: 9, count: 2 }  // 9 最容易卡 (只能配1)，給最少
            ];
            // 總共 30 個數字為一組。
            
            // 我們生成 4 組放入袋子 (30 * 4 = 120 顆)，夠玩一陣子才洗牌
            for (let k = 0; k < 4; k++) { 
                weights.forEach(item => {
                    for (let c = 0; c < item.count; c++) {
                        newSet.push(item.val);
                    }
                });
            }
            
            // 洗牌 (Fisher-Yates Shuffle)
            for (let i = newSet.length - 1; i > 0; i--) { 
                const j = Math.floor(Math.random() * (i + 1)); 
                [newSet[i], newSet[j]] = [newSet[j], newSet[i]]; 
            }
            state.numberBag = newSet;
        }
        
        return state.numberBag.pop();
    }

    function findOneMove() {
        for (let r1 = 0; r1 < ROWS; r1++) {
            for (let c1 = 0; c1 < COLS; c1++) {
                if (state.grid[r1][c1].removed) continue;
                for (let r2 = r1; r2 < ROWS; r2++) {
                    for (let c2 = c1; c2 < COLS; c2++) {
                        let sum = 0, cells = [];
                        for (let r = r1; r <= r2; r++) { for (let c = c1; c <= c2; c++) { if (!state.grid[r][c].removed) { sum += state.grid[r][c].val; cells.push(state.grid[r][c]); } } }
                        if (sum === 10 && cells.length > 0) return cells;
                    }
                }
            }
        }
        return null;
    }

    // =========================================
    // 🌊 V8.0 重力邏輯 (Combo 中不掉新牌)
    // =========================================
    function applyGravity() {
        for (let c = 0; c < COLS; c++) {
            let newCol = [];
            for (let r = 0; r < ROWS; r++) { 
                if (!state.grid[r][c].removed) { 
                    let cell = state.grid[r][c]; 
                    let visualY = r * SIZE + (cell.offsetY || 0); 
                    cell.tempVisualY = visualY; 
                    newCol.push(cell); 
                } 
            }
            let missingCount = ROWS - newCol.length;
            
            for (let i = 0; i < missingCount; i++) { 
                let startVisualY = - (missingCount - i) * SIZE; 
                // V8.0 核心：Combo 中只補「空方塊」，不補數字
                if (state.combo > 0) {
                    newCol.unshift({ val: 0, removed: true, active: false, hinted: false, offsetY: 0 });
                } else {
                    newCol.unshift({ val: getNextNumber(), removed: false, active: false, hinted: false, tempVisualY: startVisualY }); 
                }
            }
            
            for (let r = 0; r < ROWS; r++) { 
                let cell = newCol[r]; 
                let targetY = r * SIZE; 
                if (cell.tempVisualY !== undefined) {
                    cell.offsetY = cell.tempVisualY - targetY; 
                    delete cell.tempVisualY; 
                } else if (!cell.removed) {
                    cell.offsetY = 0;
                }
                state.grid[r][c] = cell; 
            }
        }
    }

    // =========================================
    // 🌊 V8.0 一次性補滿版面 (Refill)
    // =========================================
    function refillBoard() {
        let filledCount = 0;
        for (let c = 0; c < COLS; c++) {
            let missingInCol = 0;
            // 計算該行缺多少，決定掉落起始高度
            for (let r = 0; r < ROWS; r++) {
                if (state.grid[r][c].removed) missingInCol++;
            }
            let currentMissing = missingInCol;
            for (let r = 0; r < ROWS; r++) {
                if (state.grid[r][c].removed) {
                    state.grid[r][c] = {
                        val: getNextNumber(),
                        removed: false,
                        active: false,
                        hinted: false,
                        offsetY: - (currentMissing * SIZE + 50)
                    };
                    currentMissing--;
                    filledCount++;
                }
            }
        }
    }

    // =========================================
    // 🔍 檢查版面狀態 (V8.1 修正)
    // =========================================
    function checkBoardStatus() {
        let activeCount = state.grid.flat().filter(c => !c.removed).length;
        
        if (!findOneMove()) { 
            // 情況 1: Combo 中且還有空位 -> 暫不動作 (等待 Combo 時間到或玩家自行斷連)
            if (state.combo > 0 && activeCount < ROWS * COLS) {
                 // Do nothing
            } 
            // 情況 2: 有自動洗牌次數 -> 自動洗牌
            else if (state.shuffleCharges > 0) {
                GameEngine.useSkillShuffle(true); 
                GameEngine.spawnFloatingText(200, 300, "Auto Shuffle (-1)", '#3498db');
            } 
            // 情況 3: 真死局 -> 結束遊戲
            else {
                state.gameActive = false; 
                GameEngine.spawnFloatingText(200, 300, "No Moves!", '#e74c3c');
                state.skillLog.push({ t: Date.now(), act: 'game_over_deadlock' });
                setTimeout(() => { GameEngine.end(); }, 1500);
            }
        }
    }

    function initGrid() {
        state.numberBag = []; 
        state.grid = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => { let startY = - (ROWS - r) * SIZE; let targetY = r * SIZE; return { val: getNextNumber(), removed: false, active: false, hinted: false, offsetY: startY - targetY }; }));
    }

    function updateComboUI() {
        const barContainer = document.getElementById('combo-bar-container'); const barFill = document.getElementById('combo-bar-fill');
        if (!barContainer || !barFill) return;
        if (state.combo > 0) { barContainer.style.display = 'block'; let percent = (state.comboTimer / state.maxComboTime) * 100; barFill.style.width = `${percent}%`; if (state.combo < 3) barFill.style.background = '#f1c40f'; else if (state.combo < 6) barFill.style.background = '#e67e22'; else barFill.style.background = '#e74c3c'; } else { barContainer.style.display = 'none'; }
    }

    function runCountdown(callback) {
        const cdEl = document.getElementById('start-countdown'); 
        const maskEl = document.getElementById('start-mask');
        if (!cdEl) { callback(); return; }
        
        cdEl.style.display = 'block'; 
        if (maskEl) maskEl.style.display = 'block';

        SoundManager.playStart();

        cdEl.innerText = "Ready";
        cdEl.style.animation = 'none'; 
        void cdEl.offsetWidth; 
        cdEl.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        setTimeout(() => {
            cdEl.innerText = "GO!";
            cdEl.style.animation = 'none'; 
            void cdEl.offsetWidth; 
            cdEl.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        }, 1000);

        setTimeout(() => {
            cdEl.style.display = 'none'; 
            if (maskEl) maskEl.style.display = 'none'; 
            callback(); 
        }, 2000);
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // =========================================
        // 1. 畫上半部：戰鬥畫面 (不受遮罩影響)
        // =========================================
        BattleSystem.render(ctx);

        // (選用) 畫一條分隔線，讓區域更明顯
        ctx.beginPath();
        ctx.moveTo(0, OFFSET_Y - 10); // 在方塊區上方 10px 畫線
        ctx.lineTo(canvas.width, OFFSET_Y - 10);
        ctx.strokeStyle = "rgba(0,0,0,0.1)"; // 淡淡的線
        ctx.lineWidth = 2;
        ctx.stroke();

        // =========================================
        // 2. 畫下半部：方塊遊戲區 (設定遮罩 Clip)
        // =========================================
        ctx.save(); // 【關鍵】保存畫布狀態

        //定義遮罩區域：只允許在 OFFSET_Y 之後的地方顯示
        ctx.beginPath();
        // 參數：x, y, width, height
        // 這裡設定從 OFFSET_Y - 20 的位置開始往下才顯示，確保方塊不會飛到人物頭上
        ctx.rect(0, OFFSET_Y - 20, canvas.width, canvas.height - (OFFSET_Y - 20));
        ctx.clip(); // 【關鍵】啟動遮罩！之後畫的東西如果超出這個框框就會隱形

        // --- 原本畫格子的程式碼 (保持不變) ---
        state.grid.forEach((row, r) => row.forEach((cell, c) => {
            if (cell.removed) return; 
            let drawY = (r * SIZE) + (cell.offsetY || 0); 
            let x = c * SIZE + MARGIN + OFFSET_X; 
            let y = drawY + MARGIN + OFFSET_Y; 
            let s = SIZE - MARGIN * 2;
            
            ctx.beginPath(); ctx.roundRect(x, y, s, s, 6);
            if (state.isDeleteMode) ctx.fillStyle = cell.active ? '#ff7675' : '#fab1a0'; 
            else if (cell.active) ctx.fillStyle = '#ffbe76'; 
            else if (cell.hinted) ctx.fillStyle = '#b8e994'; 
            else ctx.fillStyle = '#ffffff';
            
            ctx.fill();
            ctx.strokeStyle = (cell.active || cell.hinted) ? '#e67e22' : '#f1f3f5'; 
            ctx.lineWidth = 1.5; ctx.stroke();
            
            ctx.fillStyle = (cell.active || cell.hinted) ? '#fff' : '#2c3e50'; 
            ctx.font = 'bold 20px Arial'; 
            ctx.textAlign = 'center'; 
            ctx.textBaseline = 'middle'; 
            ctx.fillText(cell.val, x + s/2, y + s/2);
        }));
        
        // 拖曳中的虛線框也要被遮罩包住
        if (input.isDragging && !state.isDeleteMode) { 
            ctx.strokeStyle = '#3498db'; 
            ctx.setLineDash([5, 3]); 
            ctx.strokeRect(input.start.x, input.start.y, input.current.x - input.start.x, input.current.y - input.start.y); 
            ctx.setLineDash([]); 
            ctx.fillStyle = 'rgba(52, 152, 219, 0.1)'; 
            ctx.fillRect(input.start.x, input.start.y, input.current.x - input.start.x, input.current.y - input.start.y); 
        }

        ctx.restore(); // 【關鍵】解除遮罩！

        // =========================================
        // 3. 畫特效 (粒子/文字) - 放在遮罩外面
        // =========================================
        // 這樣爆炸特效如果炸得很高，還是可以蓋在人物上面 (看起來比較爽快)
        // 如果你希望特效也被切掉，就把這段搬進上面的 restore() 之前

        for (let i = particles.length - 1; i >= 0; i--) { 
            let p = particles[i]; 
            p.x += p.vx; p.y += p.vy; p.life--; 
            let alpha = p.life / 60; if (alpha < 0) alpha = 0; 
            ctx.globalAlpha = alpha; ctx.fillStyle = p.color; 
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); 
            p.vy += 0.1; 
            if (p.life <= 0) particles.splice(i, 1); 
        }
        ctx.globalAlpha = 1;
        
        for (let i = floatingTexts.length - 1; i >= 0; i--) { 
            let ft = floatingTexts[i]; ft.y -= 1; ft.life--; 
            ctx.globalAlpha = Math.max(0, ft.life / 30); 
            ctx.fillStyle = ft.color; ctx.font = "bold 24px Arial"; 
            ctx.textAlign = "center"; ctx.fillText(ft.text, ft.x, ft.y); 
            if (ft.life <= 0) floatingTexts.splice(i, 1); 
        }
        ctx.globalAlpha = 1;

        // 🔥【新增】全螢幕特效繪製 (這段負責畫出刀光)
        if (fxCtx) {
            fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
            const now = Date.now();
            state.effects = state.effects.filter(eff => now - eff.startTime < eff.duration);

            state.effects.forEach(eff => {
                const elapsed = now - eff.startTime;
                
                // 🔥【新增】如果時間還沒到 (延遲中)，就先跳過不畫
                if (elapsed < 0) return;

                const progress = elapsed / eff.duration;
                
                fxCtx.save();
                
                if (eff.type === 'flash') {
                    // 黑色背景：隨進度慢慢變透明
                    // 使用 4次方 (Math.pow) 讓它在剛開始時維持黑色久一點，後面才快速淡出
                    const fade = Math.pow(1 - progress, 2);
                    const currentAlpha = (eff.maxAlpha || 0.4) * fade;
                    const rgb = eff.colorRGB || '0, 0, 0';
                    
                    fxCtx.fillStyle = `rgba(${rgb}, ${currentAlpha.toFixed(2)})`;
                    fxCtx.fillRect(0, 0, fxCanvas.width, fxCanvas.height);

                } else if (eff.type === 'slash') {
                    // 刀光邏輯 (保持不變)
                    fxCtx.beginPath();
                    let currentEndX = eff.startX + (eff.endX - eff.startX) * progress;
                    let currentEndY = eff.startY + (eff.endY - eff.startY) * progress;
                    
                    fxCtx.moveTo(eff.startX, eff.startY);
                    fxCtx.lineTo(currentEndX, currentEndY);
                    
                    fxCtx.shadowBlur = 100; 
                    fxCtx.shadowColor = eff.color;
                    fxCtx.lineWidth = eff.width * (1 - progress);
                    fxCtx.strokeStyle = eff.color;
                    fxCtx.lineCap = 'round';
                    fxCtx.stroke();
                }
                fxCtx.restore();
            });
        }
    }

    return {
        getPos: (e) => { const rect = canvas.getBoundingClientRect(); return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) }; },
        getInternalState: () => ({ 
            name: state.name, 
            score: state.score, 
            matchLog: state.matchLog, 
            skillLog: state.skillLog, 
            gameActive: state.gameActive,
            gameStartTime: state.gameStartTime
        }),

        start: function() {
            state.name = document.getElementById('home-player-name').value.trim();
            if (!state.name) { alert("請輸入名稱！"); return; }
            if (state.name.length > 10) { alert("名稱請限制在 10 個字以內！"); return; }
            this.stop(true);

            // 🔥【修改】重置上傳按鈕狀態 (確保下一場能正常運作)
            const uploadBtn = document.getElementById('upload-btn');
            if (uploadBtn) { 
                uploadBtn.disabled = false; // 解鎖
                uploadBtn.innerText = "上傳成績"; // 恢復文字
                uploadBtn.classList.remove('uploaded'); // 移除成功樣式
                // 恢復預設點擊事件 (雖然 uploadScore 內部會覆蓋，但這裡保險起見)
                uploadBtn.onclick = () => GameSystem.uploadScore(false); 
            }
            
            // 重置遊戲參數
            state.score = 0; state.timeLeft = 100; state.gameActive = false; 
            state.matchLog = []; state.skillLog = []; state.combo = 0; state.comboTimer = 0;
            state.skillsUsed = { delete: false };
            state.hintCharges = 1; state.shuffleCharges = 1;   
            state.nextRewardScore = 5000; state.currentRewardGap = 5000; state.isDeleteMode = false;
            document.querySelectorAll('.skill-btn').forEach(b => b.classList.remove('used', 'active'));
            document.getElementById('score').innerText = "0"; document.getElementById('timer').innerText = "100";
            
            updateBadge(); 
            initGrid(); 

            //  [修正] 確保初始化戰鬥系統
            BattleSystem.init();
            GameSystem.showScreen('screen-game'); 
            updateComboUI(); 
            
            // 修改點：立即啟動遊戲迴圈 (讓方塊掉落動畫開始)
            // 這樣在 Ready...Go 的時候，背景就會有方塊掉下來了
            lastTime = performance.now(); 
            this.loop(lastTime); 
            
            // 開始倒數 (此時 gameActive 還是 false，所以玩家不能動，時間也不會扣)
            runCountdown(() => { 
                state.gameActive = true; // 倒數結束，解鎖操作
                SoundManager.playBGM(); 
                timerAcc = 0; 
                state.gameStartTime = Date.now();  //倒數結束，遊戲正式開始記錄
            });
        },

        initGrid: () => initGrid(),

        loop: function(t) {
            const dt = t - lastTime; 
            lastTime = t; 
            if (!state.isPaused) {
                timerAcc += dt;
            }

            if (state.gameActive) {
                if (!state.isPaused) {
                    if (timerAcc >= 1000) {
                        state.timeLeft--;
                        document.getElementById('timer').innerText = state.timeLeft;
                        timerAcc -= 1000;
                        if (state.timeLeft <= 0) this.end(); 
                    }
                    
                    if (state.combo > 0) { 
                        state.comboTimer--; 
                        if (state.comboTimer <= 0) { 
                            // Combo 結束 (斷掉) -> 觸發補牌 (Refill)
                            state.combo = 0; 
                            refillBoard(); 
                        } 
                    }                    
                }
                // 每一幀更新戰鬥動畫
                    BattleSystem.update();
            }
            updateComboUI();
            let fallingSpeed = 8; state.grid.forEach(row => row.forEach(cell => { if (cell.offsetY < 0) { cell.offsetY += fallingSpeed; if (cell.offsetY > 0) cell.offsetY = 0; } }));
            if (input.isDragging && !state.isDeleteMode) this.updateStates();
            render(); animationId = requestAnimationFrame((ts) => this.loop(ts));
        },

        triggerReward: function() {
            if (!state.gameActive) return;

            state.timeLeft += 50; 
            state.hintCharges++; 
            updateBadge();       
            
            // 時間增加的特效
            const timerSpan = document.getElementById('timer');
            if (timerSpan) {
                const timerContainer = timerSpan.parentElement; 
                timerContainer.style.transition = "color 0.2s ease, text-shadow 0.2s ease"; 
                timerContainer.style.color = "#2ecc71"; 
                timerContainer.style.textShadow = "0 0 10px #2ecc71"; 
                setTimeout(() => { timerContainer.style.color = "#e74c3c"; timerContainer.style.textShadow = "none"; }, 2000); 
            }

            state.skillLog.push({ t: Date.now(), act: 'bonus_reward_monster_kill' });
            
            // 讓尋找按鈕亮起來
            document.getElementById('skill-btn-hint').classList.remove('used');
            
            // 顯示獎勵文字
            this.spawnFloatingText(200, 350, "Stage Clear! Time +50s", '#2ecc71');
        },

        useSkillWipe: function() {
            // 檢查：是否進行中？是否已使用？
            if (!state.gameActive || state.skillsUsed.delete) return;

            // 標記使用
            state.skillsUsed.delete = true;
            document.getElementById('skill-btn-delete').classList.remove('active');
            document.getElementById('skill-btn-delete').classList.add('used');

            // 紀錄 Log
            state.skillLog.push({ t: Date.now(), act: 'skill_wipe' });

            // 播放語音 (skill-guren.wav) 與音效
            SoundManager.playSkillVoice();
            SoundManager.playEliminate(); 
            // 觸發特效
            this.spawnSlashEffect();

            // 執行全場消除 (視覺效果)
            state.grid.forEach((row, r) => {
                row.forEach((cell, c) => {
                    if (!cell.removed) {
                        cell.removed = true;
                        // 產生爆炸特效
                        let visualX = c * SIZE + MARGIN + OFFSET_X + SIZE/2;
                        let visualY = (r * SIZE + (cell.offsetY || 0)) + MARGIN + OFFSET_Y + SIZE/2;
                        GameEngine.spawnBoom({x: visualX, y: visualY});
                    }
                });
            });

            // 核心邏輯：不算分，但續 Combo
            // state.score 不變
            // state.combo 不變
            state.comboTimer = state.maxComboTime; // 補滿時間條，讓 Combo 繼續
            this.triggerTimeFreeze(); //凍結COMBO條

            // 稍微延遲後補牌
            setTimeout(() => {
                refillBoard();
                checkBoardStatus();
            }, 100); 
        },

        spawnSlashEffect: function() {
            if (!fxCanvas) return;
            const w = fxCanvas.width;
            const h = fxCanvas.height;
            const now = Date.now(); // 取得統一的基準時間

            // 1. 先推入「黑屏閃光」 (背景層)
            state.effects.push({ 
                type: 'flash', 
                startTime: now,       // 立即開始
                duration: 3500,       // 時間總長度
                maxAlpha: 0.85,       // 稍微更黑一點
                colorRGB: '0, 0, 0'   // 黑色
            });

            // 2. 再推入「白色刀光」 (前景層)
            state.effects.push({ 
                type: 'slash', 
                startTime: now + 200, // 🔥 關鍵：延後 150ms 才開始畫刀，製造「先黑後斬」的時間差
                duration: 250,        // 刀光速度
                color: '#ffffff',     // 白色
                startX: -100,       startY: h / 2, // 左
                endX: w + 100,      endY: h / 2,   // 右
                width: 60 //刀光寬度
            });
        },

        triggerTimeFreeze: function() {
            state.isPaused = true;
            
            // 視覺提示：讓時間變色 (選用)
            const timerEl = document.getElementById('timer');
            if (timerEl && timerEl.parentElement) {
                // 設定為灰色
                timerEl.parentElement.style.color = '#dddddd'; 
            }

            // 如果已經有在倒數，先清除舊的 (避免連續消除時提早解凍)
            if (pauseTimeout) clearTimeout(pauseTimeout);

            // 設定技能後解除暫停
            pauseTimeout = setTimeout(() => {
                state.isPaused = false;
                if (timerEl && timerEl.parentElement) {
                    timerEl.parentElement.style.color = ''; // 恢復顏色
                } 
            }, 4000);
        },

        openSettings: () => GameSystem.toggleOverlay('screen-settings', true),
        resumeFromSettings: () => GameSystem.toggleOverlay('screen-settings', false),
        
        handleDown: function(pos) {
            if (!state.gameActive) return; 
            if (state.isDeleteMode) {
                const c = Math.floor((pos.x - OFFSET_X) / SIZE); const r = Math.floor((pos.y - OFFSET_Y) / SIZE);
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS && !state.grid[r][c].removed && state.grid[r][c].offsetY === 0) {
                    const targetVal = state.grid[r][c].val;
                    state.skillLog.push({ t: Date.now(), act: 'skill_delete', val: targetVal });
                    state.skillsUsed.delete = true; state.isDeleteMode = false;
                    document.getElementById('skill-btn-delete').classList.remove('active', 'used'); 
                    document.getElementById('skill-btn-delete').classList.add('used');
                    SoundManager.playEliminate(); 
                    state.grid.forEach((row, rIdx) => { row.forEach((cell, cIdx) => { if (!cell.removed && cell.val === targetVal) { cell.removed = true; let visualX = cIdx * SIZE + MARGIN + OFFSET_X + SIZE/2; let visualY = (rIdx * SIZE + (cell.offsetY || 0)) + MARGIN + OFFSET_Y + SIZE/2; this.spawnBoom({x: visualX, y: visualY}); } }); });
                    applyGravity(); checkBoardStatus();
                }
                return;
            }
            state.grid.flat().forEach(c => c.hinted = false);
            input.isDragging = true; 
            input.start = pos; 
            input.current = { ...pos };
            input.pressTime = Date.now();
        },

        handleMove: function(pos) { if (input.isDragging && !state.isDeleteMode) { input.current = pos; } },
        updateStates: () => { let x1 = Math.min(input.start.x, input.current.x), x2 = Math.max(input.start.x, input.current.x); let y1 = Math.min(input.start.y, input.current.y), y2 = Math.max(input.start.y, input.current.y); state.grid.forEach((row, r) => row.forEach((cell, c) => { if (cell.offsetY !== 0) { cell.active = false; return; } let tx = c * SIZE + OFFSET_X; let ty = r * SIZE + OFFSET_Y; cell.active = !cell.removed && !(tx + SIZE < x1 || tx > x2 || ty + SIZE < y1 || ty > y2); })); },

        // =========================================
        // 👆 放開事件 (結算與 Perfect Clear 核心)
        // =========================================
        handleUp: function() {
            if (!input.isDragging) return; 
            input.isDragging = false;

            // 1. 計算持續時間 (防瞬移)
            const duration = input.pressTime ? (Date.now() - input.pressTime) : 0;
            
            // 找出被選取的方塊
            let sel = state.grid.flat().filter(c => !c.removed && c.active);
            
            // 判斷是否總和為 10
            if (sel.reduce((s, c) => s + c.val, 0) === 10 && sel.length > 0) {
                
                // 🔥【新增 1】取得這次消除的所有數字 (例如 [3, 7])
                // 這就是給後端驗算的證據！
                let removedValues = sel.map(c => c.val);

                // --- 計算分數邏輯 ---
                let count = sel.length;
                let multiplier = 1;
                if (count >= 2) { multiplier = Math.pow(2, count - 2); }
                
                let basePoints = (count >= 2 ? 200 : 100) * multiplier;
                let comboRaw = 0;
                if (state.combo >= 3) { comboRaw = (state.combo - 2) * 50; }
                let comboBonus = comboRaw * multiplier;
                let totalPoints = basePoints + comboBonus;
                
                if (totalPoints > 99999) totalPoints = 99999; 

                // --- 標記為已消除 ---
                sel.forEach(c => c.removed = true); 

                // 檢查 Perfect Clear
                let isPerfectClear = state.grid.flat().every(c => c.removed);
                let actionType = 'normal'; // 預設動作類型

                if (isPerfectClear) {
                    // Perfect Clear 處理
                    totalPoints = Math.round((totalPoints * 1.5) / 50) * 50;
                    this.spawnFloatingText(200, 300, "Perfect Clear! x1.5", '#ff00ff');
                    
                    state.combo = 0;
                    state.comboTimer = 0;
                    refillBoard(); 
                    
                    state.score += totalPoints; 
                    actionType = 'perfect'; // 🔥 標記為完美消除

                    BattleSystem.playerAttack(totalPoints, true);
                    SoundManager.playWaha(); 
                } else {
                    // 一般消除處理
                    state.score += totalPoints; 
                    state.combo++; 
                    state.comboTimer = state.maxComboTime;
                    actionType = 'normal'; // 🔥 標記為一般消除
                    
                    if (state.combo >= 5) { SoundManager.playRandomComboVoice(); }
                    BattleSystem.playerAttack(totalPoints, false);
                    applyGravity(); 
                }
                
                // --- UI 更新 ---
                document.getElementById('score').innerText = state.score;
                document.getElementById('timer').innerText = state.timeLeft;
                SoundManager.playEliminate(); 
                this.spawnBoom(input.current);
                
                let text = `+${totalPoints}`;
                let textColor = '#f1c40f'; 
                if (totalPoints >= 5000) textColor = '#ff4757';      
                else if (totalPoints >= 2000) textColor = '#9b59b6'; 
                else if (totalPoints >= 800) textColor = '#2ecc71';  
                if (state.combo > 1 && !isPerfectClear) { text += ` (Combo x${state.combo})`; }
                this.spawnFloatingText(input.current.x, input.current.y - 20, text, textColor);

                if (!isPerfectClear) checkBoardStatus();

                // 寫入 Log (包含 v 和 act)
                state.matchLog.push({ 
                    t: Date.now(), 
                    p: totalPoints,
                    d: duration,      // 持續時間
                    v: removedValues, // 🔥 數值陣列 (給後端驗算用)
                    act: actionType   // 🔥 動作類型 (normal / perfect)
                });
            }
            state.grid.flat().forEach(c => c.active = false);
        },

        spawnBoom: (pos) => { for (let i = 0; i < 20; i++) { const ang = Math.random() * Math.PI * 2, spd = Math.random() * 4 + 2; particles.push({ x: pos.x, y: pos.y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, life: 30+Math.random()*20, size: 2+Math.random()*3, color: pColors[Math.floor(Math.random()*pColors.length)] }); } },
        spawnFloatingText: (x, y, text, color) => { floatingTexts.push({ x: x, y: y, text: text, color: color, life: 120 }); },

        // 🔍 技能 Q：提示
        useSkillHint: function() {
            if (!state.gameActive || state.hintCharges <= 0) return;
            const cells = findOneMove();
            if (cells) { 
                state.hintCharges--; 
                updateBadge(); 
                state.skillLog.push({ t: Date.now(), act: 'skill_hint' });
                if (state.hintCharges === 0) document.getElementById('skill-btn-hint').classList.add('used');
                cells.forEach(c => c.hinted = true);
                setTimeout(() => state.grid.flat().forEach(c => c.hinted = false), 10000);
            }
        },

        useSkillShuffle: function(markUsed = true) {
            if (!state.gameActive) return;
            if (markUsed && state.shuffleCharges <= 0) return; 
            if (markUsed) { state.shuffleCharges--; state.skillLog.push({ t: Date.now(), act: 'skill_shuffle_manual' }); if (state.shuffleCharges <= 0) document.getElementById('skill-btn-shuffle').classList.add('used'); } else { state.skillLog.push({ t: Date.now(), act: 'skill_shuffle_auto' }); }
            let remains = state.grid.flat().filter(c => !c.removed); let vals = remains.map(c => c.val); let attempts = 0;
            do { for (let i = vals.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [vals[i], vals[j]] = [vals[j], vals[i]]; } remains.forEach((c, i) => c.val = vals[i]); attempts++; } while (!findOneMove() && attempts < 20);
        },

        toggleDeleteMode: function() {
            if (!state.gameActive) return; 
            if (!state.skillsUsed.delete) { state.isDeleteMode = !state.isDeleteMode; document.getElementById('skill-btn-delete').classList.toggle('active'); }
        },

        stop: function(m) { state.gameActive = false; if (animationId) cancelAnimationFrame(animationId); if (m) SoundManager.stopBGM(); },
        
        end: function() { 
            this.stop(false); 
            
            // 設定分數顯示
            document.getElementById('final-result-score').innerText = state.score; 
            document.getElementById('result-player-display').innerText = `Player: ${state.name}`;
            
            // 紀錄 Log
            state.skillLog.push({ t: Date.now(), act: 'game_end', finalScore: state.score }); 
            
            // 開啟結算畫面
            GameSystem.openResultOverlay(); 

            // 🔥【新增】觸發自動上傳 (帶入 true 參數表示靜默模式)
            // 放在 openResultOverlay 之後，讓玩家先看到畫面，後台慢慢傳
            GameSystem.uploadScore(true);
        },

        backToHome: function() { this.stop(true); GameSystem.showScreen('screen-home'); }
    };
})();

// 初始化與監聽
window.addEventListener('load', () => {
    SoundManager.init(); 
    GameSystem.initNamePersistence();
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.addEventListener('pointerdown', (e) => {
            canvas.setPointerCapture(e.pointerId);
            GameEngine.handleDown(GameEngine.getPos(e));
        });
        window.addEventListener('pointermove', (e) => GameEngine.handleMove(GameEngine.getPos(e)));
        window.addEventListener('pointerup', (e) => {
            canvas.releasePointerCapture(e.pointerId);
            GameEngine.handleUp();
        });
    }
    document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());

    // 🔥【新增】設定特效畫布尺寸為全螢幕
    const fxC = document.getElementById('fxCanvas');
    if (fxC) {
        const resizeFx = () => { fxC.width = window.innerWidth; fxC.height = window.innerHeight; };
        window.addEventListener('resize', resizeFx);
        resizeFx(); // 立即執行一次
    }
    // ⌨️ 全域鍵盤快捷鍵監聽 (Key Listeners)
    window.addEventListener('keydown', (e) => {
        // 防止在輸入名字時觸發快捷鍵
        if (e.target.tagName === 'INPUT') return;

        const key = e.key.toLowerCase();
        
        // Q: 觸發提示技能
        if (key === 'q') {
            GameEngine.useSkillHint();
        }
        // W: 觸發隨機打亂
        if (key === 'w') {
            GameEngine.useSkillShuffle(true);
        }
        // E: 切換刪除模式
        if (key === 'e') {
            // GameEngine.toggleDeleteMode(); //(舊版)指定刪除
            // 新的寫法 (正確)：直接呼叫全場消除技能
            GameEngine.useSkillWipe();
        }
    });
});

/**
 * -----------------------------------------------------------------------------
 * 新增部分：戰鬥系統 (BATTLE SYSTEM) - Canvas Render 版
 * -----------------------------------------------------------------------------
 */
const BattleSystem = (function() {
    // 🔥 資源設定
    const SRC_PLAYER_IDLE = './images/guren-0.png'; // 待機圖
    
    // 攻擊連動圖 (5張)
    const SRC_PLAYER_ATTACK = [
        './images/guren-attack-1.png',
        './images/guren-attack-2.png',
        './images/guren-attack-3.png',
        './images/guren-attack-4.png',
        './images/guren-attack-5.png'
    ];

    const MONSTER_LIST = [
        './images/monster01.png', 
    ];

    // 圖片物件
    let imgPlayerIdle = new Image();
    let imgPlayerAttackFrames = []; // 預先載入攻擊圖
    let imgMonster = new Image();
    
    // 遊戲數值
    let monsterMaxHp = 5000;
    let monsterCurrentHp = 5000;
    let monsterLevel = 1;

    // 動畫狀態
    let animState = {
        playerX: -20,      // 玩家位置
        playerY: 50,      
        monsterX: 250,    // 怪物位置
        monsterY: 50,     
        
        shakeTimer: 0,    // 受傷震動
        dieAlpha: 1,      // 死亡透明度
        monsterState: 'alive', // alive, dying, spawning
        
        // 🔥 攻擊動畫控制
        isAttacking: false,
        attackFrameIndex: 0,
        attackFrameTimer: 0,
        attackSpeed: 5 // 每幾幀換一張圖 (數字越小越快)
    };

    // 傷害數字粒子
    let damageTexts = [];

    return {
        init: function() {

            //圖片初始化
            imgPlayerAttackFrames = [];
            // 載入圖片
            imgPlayerIdle.src = SRC_PLAYER_IDLE;
            
            // 預載攻擊圖
            SRC_PLAYER_ATTACK.forEach(src => {
                let img = new Image();
                img.src = src;
                imgPlayerAttackFrames.push(img);
            });

            // 生成第一隻怪
            this.spawnMonster(true);
        },

        spawnMonster: function(firstTime = false) {
            if (!firstTime) monsterLevel++;
            
            const src = MONSTER_LIST[Math.floor(Math.random() * MONSTER_LIST.length)] || MONSTER_LIST[0];
            imgMonster.src = src;

            // ✅ 修正後的寫法 (正確)：
            if (firstTime) {
                monsterMaxHp = 5000; // 第一隻 5000
            } else {
                monsterMaxHp += 3000; // 之後每隻 +3000
            }

            monsterCurrentHp = monsterMaxHp; // 補滿血
            
            animState.monsterState = 'alive';
            animState.dieAlpha = 1;
            animState.shakeTimer = 0;
        },

        // 🔥 更新邏輯 (每一幀呼叫)
        update: function() {
            // 1. 處理攻擊動畫 (播放序列圖)
            if (animState.isAttacking) {
                animState.attackFrameTimer++;
                if (animState.attackFrameTimer >= animState.attackSpeed) {
                    animState.attackFrameTimer = 0;
                    animState.attackFrameIndex++;
                    
                    // 播完最後一張圖，結束攻擊
                    if (animState.attackFrameIndex >= imgPlayerAttackFrames.length) {
                        animState.isAttacking = false;
                        animState.attackFrameIndex = 0;
                    }
                }
            }

            // 2. 受傷震動
            if (animState.shakeTimer > 0) {
                animState.shakeTimer--;
            }

            // 3. 死亡淡出
            if (animState.monsterState === 'dying') {
                animState.dieAlpha -= 0.05;
                if (animState.dieAlpha <= 0) {
                    animState.dieAlpha = 0;
                    animState.monsterState = 'spawning';
                    setTimeout(() => this.spawnMonster(), 1000);
                }
            }

            // 4. 傷害數字浮動
            for (let i = damageTexts.length - 1; i >= 0; i--) {
                let d = damageTexts[i];
                d.y -= 1.5;
                d.life--;
                d.scale += 0.01;
                if (d.life <= 0) damageTexts.splice(i, 1);
            }
        },

        // 🔥 繪製邏輯 (每一幀呼叫)
        render: function(ctx) {
            // 1. 畫玩家 (紅蓮)
            let drawPlayerImg = imgPlayerIdle; // 預設畫待機圖
            
            if (animState.isAttacking) {
                // 如果正在攻擊，畫對應的連動圖
                // 確保 index 安全
                let idx = Math.min(animState.attackFrameIndex, imgPlayerAttackFrames.length - 1);
                if (imgPlayerAttackFrames[idx] && imgPlayerAttackFrames[idx].complete) {
                    drawPlayerImg = imgPlayerAttackFrames[idx];
                }
            }
            
            // 繪製玩家 (寬高設為 120x120 讓角色大一點)
            ctx.drawImage(drawPlayerImg, animState.playerX, animState.playerY, 256, 128);

            // 2. 畫怪物
            if (animState.monsterState !== 'spawning') {
                ctx.save();
                let shakeX = 0, shakeY = 0;
                if (animState.shakeTimer > 0) {
                    shakeX = (Math.random() - 0.5) * 10;
                    shakeY = (Math.random() - 0.5) * 10;
                }
                ctx.globalAlpha = animState.dieAlpha;
                ctx.drawImage(imgMonster, animState.monsterX + shakeX, animState.monsterY + shakeY, 128, 128);
                
                // 3. 畫血條
                if (animState.monsterState === 'alive') {
                    const hpW = 100; const hpH = 8;
                    const hpX = animState.monsterX + shakeX + 15;
                    const hpY = animState.monsterY + shakeY + 128;
                    ctx.fillStyle = '#555'; ctx.fillRect(hpX, hpY, hpW, hpH);
                    const pct = Math.max(0, monsterCurrentHp / monsterMaxHp);
                    ctx.fillStyle = '#e74c3c'; ctx.fillRect(hpX, hpY, hpW * pct, hpH);
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(hpX, hpY, hpW, hpH);
                }
                ctx.restore();
            }

            // 4. 畫傷害數字
            ctx.save();
            ctx.textAlign = "center";
            for (let d of damageTexts) {
                ctx.globalAlpha = Math.min(1, d.life / 20);
                ctx.font = `bold ${Math.floor(10 * d.scale)}px Arial`;
                ctx.fillStyle = d.color;
                ctx.strokeStyle = "white";
                ctx.lineWidth = 2;
                ctx.strokeText(d.text, d.x, d.y);
                ctx.fillText(d.text, d.x, d.y);
            }
            ctx.restore();
        },

        // 觸發攻擊
        playerAttack: function(damage, isCritical) {
            // 啟動連續圖動畫
            animState.isAttacking = true;
            animState.attackFrameIndex = 0;
            animState.attackFrameTimer = 0;

            // 配合揮刀動作，延遲造成傷害 (例如第3張圖是砍下去)
            // 假設 5幀換一張，第3張圖大約是 15幀 * 16ms = 240ms 後
            setTimeout(() => {
                this.monsterTakeDamage(damage, isCritical);
            }, 200); 
        },

        monsterTakeDamage: function(damage, isCritical) {
            if (animState.monsterState !== 'alive') return;
            monsterCurrentHp -= damage;
            animState.shakeTimer = 10;
            damageTexts.push({
                x: animState.monsterX + 50, y: animState.monsterY,
                text: isCritical ? Math.floor(damage) + "!" : Math.floor(damage),
                color: isCritical ? "#ff00ff" : "#ff0000",
                life: 60, scale: 1
            });
            // 🔥 檢查死亡 (觸發獎勵)
            if (monsterCurrentHp <= 0) {
                monsterCurrentHp = 0;
                animState.monsterState = 'dying';

                // 🌟 怪獸死亡 = 玩家獲勝 = 發放獎勵！
                // 呼叫 GameEngine 的獎勵函式
                GameEngine.triggerReward(); 
            }
        }
    };
})();



