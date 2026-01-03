/**
 * =============================================================================
 * 圈十遊戲 (Make 10) - 核心邏輯腳本 (完整修復版)
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
    const SFX_EXP = './sound/effect-expball.wav';
    const SFX_WAHA = './sound/effect-waha.ogg'; // 🔥 新增音效路徑
    
    let bgmVolume = parseFloat(localStorage.getItem('bgm_vol')) || 0.5;
    let sfxVolume = parseFloat(localStorage.getItem('sfx_vol')) || 0.5;

    let currentBGM = null;
    const sfxPool = [];
    const POOL_SIZE = 5;
    
    // 🔥 Waha 音效物件
    let wahaAudio = null;

    return {
        init: function() {
            // 初始化消除音效池
            for (let i = 0; i < POOL_SIZE; i++) {
                const audio = new Audio(SFX_EXP);
                audio.volume = sfxVolume;
                sfxPool.push(audio);
            }

            // 🔥 初始化 Waha 音效
            wahaAudio = new Audio(SFX_WAHA);
            wahaAudio.volume = sfxVolume;

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
                    
                    // 同步更新 Waha 音量
                    if (wahaAudio) wahaAudio.volume = sfxVolume;
                    
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

        // 🔥 新增：播放 Waha 音效函式
        playWaha: function() {
            if (wahaAudio) {
                wahaAudio.currentTime = 0; // 重頭播放
                wahaAudio.play().catch(() => {});
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

        uploadScore: async function() {
            // ... (上傳邏輯保持不變) ...
            const b = document.getElementById('upload-btn');
            const internal = GameEngine.getInternalState(); 
            if (internal.isTestUsed) return; 

            const safeName = (internal.name || "").trim();
            if (safeName.length === 0) { alert("❌ 錯誤：名稱不能為空！"); return; }
            if (safeName.length > 10) { alert("❌ 錯誤：名稱長度異常 (超過10字)，請重新整理頁面。"); return; }

            b.disabled = true; b.innerText = "驗證中...";
            const ts = Date.now();
            const sign = await getSignature(internal.name, internal.score, ts);
            
            try {
                const resp = await fetch(GAS_URL, { 
                    method: "POST", 
                    body: JSON.stringify({ name: internal.name, score: internal.score, timestamp: ts, sign: sign, log: internal.matchLog }) 
                });
                const result = await resp.json();
                if (result.status === "error") { alert("上傳失敗：" + result.message); b.disabled = false; return; }
                localStorage.setItem('math_game_rank', JSON.stringify(result));
                alert("🎉 上傳成功！"); this.showLeaderboard();
            } catch (e) { alert("連線失敗"); b.disabled = false; }
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
 * 📝 更新日誌：
 * 1. 🎁 獎勵機制修正 (累進難度)：
 * - 規則：下一階的門檻間距 = 當前間距 + 3000。
 * - 數列：
 * 第 1 次：目標 5,000 (間距 5,000)
 * 第 2 次：目標 13,000 (間距 8,000)
 * 第 3 次：目標 24,000 (間距 11,000) ... 越來越難！
 * 2. ⏱️ 初始時間：維持 100 秒。
 * 3. 🛡️ 包含全場消除技能、防作弊紀錄、死局判定與完整註解。
 * =============================================================================
 */

const GameEngine = (function() {
    // 取得 Canvas 元素與 2D 繪圖環境
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // =========================================
    // 📐 遊戲常數設定 (8x14 版面)
    // =========================================
    const ROWS = 14; 
    const COLS = 8; 
    const SIZE = 45; 
    const MARGIN = 3; 

    // 計算畫面置中偏移量
    const OFFSET_X = (400 - COLS * SIZE) / 2; 
    const OFFSET_Y = (640 - ROWS * SIZE) / 2; 

    // =========================================
    // 🎮 遊戲狀態 (State Management)
    // =========================================
    let state = {
        grid: [],           // 網格資料
        score: 0,           // 分數
        timeLeft: 100,      // 初始時間 100 秒
        gameActive: false,  // 遊戲進行狀態
        isDeleteMode: false,// 炸彈模式
        name: "",           // 玩家名稱
        
        // 🛠️ 技能與次數
        shuffleCharges: 1,      // 洗牌次數
        hintCharges: 1,         // 提示次數
        skillsUsed: { delete: false }, // 炸彈 (單場一次)
        
        // 🎁 獎勵門檻系統 (累進制)
        nextRewardScore: 5000,  // 下一個獎勵目標分數 (初始 5000)
        currentRewardGap: 5000, // 🔥 新增：當前的獎勵間距 (初始 5000)
        
        // 📝 紀錄系統
        matchLog: [],       // 分數紀錄
        skillLog: [],       // 技能紀錄
        
        combo: 0, comboTimer: 0, maxComboTime: 180, numberBag: []
    };

    let input = { isDragging: false, start: { x: 0, y: 0 }, current: { x: 0, y: 0 } };
    let particles = []; let floatingTexts = []; 
    let animationId = null, lastTime = 0, timerAcc = 0;
    const pColors = ['#f1c40f', '#e67e22', '#e74c3c', '#3498db', '#2ecc71'];

    // 🎒 抽牌：2 組 1-9
    function getNextNumber() {
        if (state.numberBag.length === 0) {
            let newSet = [];
            for (let k = 0; k < 2; k++) { for (let i = 1; i <= 9; i++) newSet.push(i); }
            for (let i = newSet.length - 1; i > 0; i--) { 
                const j = Math.floor(Math.random() * (i + 1)); 
                [newSet[i], newSet[j]] = [newSet[j], newSet[i]]; 
            }
            state.numberBag = newSet;
        }
        return state.numberBag.pop();
    }

    // 🔍 死局檢查
    function findOneMove() {
        for (let r1 = 0; r1 < ROWS; r1++) {
            for (let c1 = 0; c1 < COLS; c1++) {
                if (state.grid[r1][c1].removed) continue;
                for (let r2 = r1; r2 < ROWS; r2++) {
                    for (let c2 = c1; c2 < COLS; c2++) {
                        let sum = 0, cells = [];
                        for (let r = r1; r <= r2; r++) {
                            for (let c = c1; c <= c2; c++) {
                                if (!state.grid[r][c].removed) { sum += state.grid[r][c].val; cells.push(state.grid[r][c]); }
                            }
                        }
                        if (sum === 10 && cells.length > 0) return cells;
                    }
                }
            }
        }
        return null;
    }

    // 🍬 重力下落
    function applyGravity() {
        for (let c = 0; c < COLS; c++) {
            let newCol = [];
            for (let r = 0; r < ROWS; r++) {
                if (!state.grid[r][c].removed) {
                    let cell = state.grid[r][c];
                    let visualY = r * SIZE + (cell.offsetY || 0);
                    cell.tempVisualY = visualY; newCol.push(cell);
                }
            }
            let missingCount = ROWS - newCol.length;
            for (let i = 0; i < missingCount; i++) {
                let startVisualY = - (missingCount - i) * SIZE; 
                newCol.unshift({ val: getNextNumber(), removed: false, active: false, hinted: false, tempVisualY: startVisualY });
            }
            for (let r = 0; r < ROWS; r++) {
                let cell = newCol[r];
                let targetY = r * SIZE;
                cell.offsetY = cell.tempVisualY - targetY;
                delete cell.tempVisualY; state.grid[r][c] = cell;
            }
        }
    }

    // 🛡️ 死局判定與自動救援
    function checkBoardStatus() {
        if (!findOneMove()) { 
            if (state.shuffleCharges > 0) {
                GameEngine.useSkillShuffle(true); 
                GameEngine.spawnFloatingText(200, 300, "Auto Shuffle (-1)", '#3498db');
            } else {
                state.gameActive = false; 
                GameEngine.spawnFloatingText(200, 300, "No Moves!", '#e74c3c');
                state.skillLog.push({ t: Date.now(), act: 'game_over_deadlock' });
                setTimeout(() => { GameEngine.end(); }, 1500);
            }
        }
    }

    // 初始化網格
    function initGrid() {
        state.numberBag = []; 
        state.grid = Array.from({ length: ROWS }, (_, r) => 
            Array.from({ length: COLS }, (_, c) => {
                let startY = - (ROWS - r) * SIZE; 
                let targetY = r * SIZE;
                return { val: getNextNumber(), removed: false, active: false, hinted: false, offsetY: startY - targetY };
            })
        );
    }

    // 更新 UI
    function updateComboUI() {
        const barContainer = document.getElementById('combo-bar-container');
        const barFill = document.getElementById('combo-bar-fill');
        if (!barContainer || !barFill) return;
        if (state.combo > 0) {
            barContainer.style.display = 'block';
            let percent = (state.comboTimer / state.maxComboTime) * 100;
            barFill.style.width = `${percent}%`;
            if (state.combo < 3) barFill.style.background = '#f1c40f';
            else if (state.combo < 6) barFill.style.background = '#e67e22';
            else barFill.style.background = '#e74c3c';
        } else { barContainer.style.display = 'none'; }
    }

    // 倒數計時
    function runCountdown(callback) {
        const cdEl = document.getElementById('start-countdown');
        const maskEl = document.getElementById('start-mask');
        if (!cdEl) { callback(); return; }
        let count = 3;
        cdEl.style.display = 'block';
        if (maskEl) maskEl.style.display = 'block';
        cdEl.innerText = count;
        cdEl.style.animation = 'none'; cdEl.offsetHeight; cdEl.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        let timer = setInterval(() => {
            count--;
            if (count > 0) {
                cdEl.innerText = count; cdEl.style.animation = 'none'; cdEl.offsetHeight; cdEl.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            } else if (count === 0) {
                cdEl.innerText = "GO!"; cdEl.style.animation = 'none'; cdEl.offsetHeight; cdEl.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            } else {
                clearInterval(timer); cdEl.style.display = 'none'; 
                if (maskEl) maskEl.style.display = 'none'; callback(); 
            }
        }, 1000);
    }

    // 🎨 渲染
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        state.grid.forEach((row, r) => row.forEach((cell, c) => {
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
            
            ctx.strokeStyle = (cell.active || cell.hinted) ? '#e67e22' : '#f1f3f5'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = (cell.active || cell.hinted) ? '#fff' : '#2c3e50'; 
            ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(cell.val, x + s/2, y + s/2);
        }));
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i]; p.x += p.vx; p.y += p.vy; p.life--; let alpha = p.life / 60; if (alpha < 0) alpha = 0;
            ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            p.vy += 0.1; if (p.life <= 0) particles.splice(i, 1);
        }
        ctx.globalAlpha = 1;
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            let ft = floatingTexts[i]; ft.y -= 1; ft.life--; ctx.globalAlpha = Math.max(0, ft.life / 30);
            ctx.fillStyle = ft.color; ctx.font = "bold 24px Arial"; ctx.textAlign = "center"; ctx.fillText(ft.text, ft.x, ft.y);
            if (ft.life <= 0) floatingTexts.splice(i, 1);
        }
        ctx.globalAlpha = 1;
        if (input.isDragging && !state.isDeleteMode) {
            ctx.strokeStyle = '#3498db'; ctx.setLineDash([5, 3]); 
            ctx.strokeRect(input.start.x, input.start.y, input.current.x - input.start.x, input.current.y - input.start.y); 
            ctx.setLineDash([]); ctx.fillStyle = 'rgba(52, 152, 219, 0.1)';
            ctx.fillRect(input.start.x, input.start.y, input.current.x - input.start.x, input.current.y - input.start.y);
        }
    }

    return {
        getPos: (e) => { 
            const rect = canvas.getBoundingClientRect(); 
            return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) }; 
        },
        getInternalState: () => ({ name: state.name, score: state.score, matchLog: state.matchLog, skillLog: state.skillLog, gameActive: state.gameActive }),

        // 🚀 啟動
        start: function() {
            state.name = document.getElementById('home-player-name').value.trim();
            if (!state.name) { alert("請輸入名稱！"); return; }
            if (state.name.length > 10) { alert("名稱請限制在 10 個字以內！"); return; }

            this.stop(true);
            const uploadBtn = document.getElementById('upload-btn');
            if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.innerText = "上傳成績"; }
            
            state.score = 0; state.timeLeft = 100; state.gameActive = false; 
            state.matchLog = []; state.skillLog = []; state.combo = 0; state.comboTimer = 0;
            
            state.skillsUsed = { delete: false };
            state.hintCharges = 1;      
            state.shuffleCharges = 1;   
            
            // 🔥 初始化獎勵系統
            state.nextRewardScore = 5000; // 初始目標 5000
            state.currentRewardGap = 5000; // 初始間距 5000
            
            state.isDeleteMode = false;
            
            document.querySelectorAll('.skill-btn').forEach(b => b.classList.remove('used', 'active'));
            document.getElementById('score').innerText = "0"; 
            document.getElementById('timer').innerText = "100";
            
            initGrid(); GameSystem.showScreen('screen-game'); updateComboUI(); 

            lastTime = performance.now(); this.loop(lastTime);
            runCountdown(() => {
                state.gameActive = true; SoundManager.playBGM(); 
                timerAcc = 0; lastTime = performance.now(); 
            });
        },

        initGrid: () => initGrid(),

        // 🔄 迴圈
        loop: function(t) {
            const dt = t - lastTime; lastTime = t; timerAcc += dt;
            if (state.gameActive) {
                if (timerAcc >= 1000) { state.timeLeft--; document.getElementById('timer').innerText = state.timeLeft; timerAcc -= 1000; if (state.timeLeft <= 0) this.end(); }
                if (state.combo > 0) { state.comboTimer--; if (state.comboTimer <= 0) state.combo = 0; }
            }
            updateComboUI();
            let fallingSpeed = 8; 
            state.grid.forEach(row => row.forEach(cell => {
                if (cell.offsetY < 0) { cell.offsetY += fallingSpeed; if (cell.offsetY > 0) cell.offsetY = 0; }
            }));
            if (input.isDragging && !state.isDeleteMode) this.updateStates();
            render(); animationId = requestAnimationFrame((ts) => this.loop(ts));
        },

        openSettings: () => GameSystem.toggleOverlay('screen-settings', true),
        resumeFromSettings: () => GameSystem.toggleOverlay('screen-settings', false),

        // 👆 按下 (全場消除技能)
        handleDown: function(pos) {
            if (!state.gameActive) return; 
            if (state.isDeleteMode) {
                const c = Math.floor((pos.x - OFFSET_X) / SIZE);
                const r = Math.floor((pos.y - OFFSET_Y) / SIZE);
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS && !state.grid[r][c].removed && state.grid[r][c].offsetY === 0) {
                    const targetVal = state.grid[r][c].val;
                    state.skillLog.push({ t: Date.now(), act: 'skill_delete', val: targetVal }); // 紀錄技能

                    state.skillsUsed.delete = true; 
                    state.isDeleteMode = false;
                    document.getElementById('skill-btn-delete').classList.remove('active', 'used'); 
                    document.getElementById('skill-btn-delete').classList.add('used');
                    SoundManager.playEliminate(); 

                    state.grid.forEach((row, rIdx) => {
                        row.forEach((cell, cIdx) => {
                            if (!cell.removed && cell.val === targetVal) {
                                cell.removed = true;
                                let visualX = cIdx * SIZE + MARGIN + OFFSET_X + SIZE/2;
                                let visualY = (rIdx * SIZE + (cell.offsetY || 0)) + MARGIN + OFFSET_Y + SIZE/2;
                                this.spawnBoom({x: visualX, y: visualY});
                            }
                        });
                    });
                    applyGravity(); checkBoardStatus();
                }
                return;
            }
            state.grid.flat().forEach(c => c.hinted = false);
            input.isDragging = true; input.start = pos; input.current = { ...pos };
        },

        handleMove: function(pos) { if (input.isDragging && !state.isDeleteMode) { input.current = pos; } },
        updateStates: () => {
            let x1 = Math.min(input.start.x, input.current.x), x2 = Math.max(input.start.x, input.current.x);
            let y1 = Math.min(input.start.y, input.current.y), y2 = Math.max(input.start.y, input.current.y);
            state.grid.forEach((row, r) => row.forEach((cell, c) => {
                if (cell.offsetY !== 0) { cell.active = false; return; }
                let tx = c * SIZE + OFFSET_X; let ty = r * SIZE + OFFSET_Y;
                cell.active = !cell.removed && !(tx + SIZE < x1 || tx > x2 || ty + SIZE < y1 || ty > y2);
            }));
        },

        // 👆 放開 (結算)
        handleUp: function() {
            if (!input.isDragging) return; input.isDragging = false;
            let sel = state.grid.flat().filter(c => !c.removed && c.active);
            
            if (sel.reduce((s, c) => s + c.val, 0) === 10 && sel.length > 0) {
                let basePoints = sel.length * 100;
                let comboBonus = 0; if (state.combo >= 2) comboBonus = (state.combo - 1) * 50;
                let totalPoints = basePoints + comboBonus; if (totalPoints > 2500) totalPoints = 2500; 

                state.score += totalPoints; state.combo++; state.comboTimer = state.maxComboTime;
                
                // 🎁 獎勵機制 (累進難度：Gap += 3000)
                if (state.score >= state.nextRewardScore) {
                    state.timeLeft += 50; 
                    state.hintCharges++;
                    state.shuffleCharges++; 
                    
                    state.skillLog.push({ t: Date.now(), act: 'bonus_reward', score: state.score }); // 紀錄獎勵

                    // 🔥 更新下一次門檻：間距 +3000
                    state.currentRewardGap += 3000;
                    state.nextRewardScore += state.currentRewardGap;
                    
                    document.getElementById('skill-btn-hint').classList.remove('used');
                    document.getElementById('skill-btn-shuffle').classList.remove('used');
                    
                    this.spawnFloatingText(200, 300, "Bonus! +Time/Hint/Shuffle", '#2ecc71');
                }

                if (state.combo >= 3) SoundManager.playWaha();

                state.matchLog.push({ t: Date.now(), p: totalPoints }); 
                document.getElementById('score').innerText = state.score; document.getElementById('timer').innerText = state.timeLeft;
                SoundManager.playEliminate(); this.spawnBoom(input.current);
                let text = `+${totalPoints}`; if (state.combo > 1) text += ` (Combo x${state.combo})`;
                this.spawnFloatingText(input.current.x, input.current.y - 20, text, '#f1c40f');
                sel.forEach(c => c.removed = true); applyGravity(); checkBoardStatus();
            }
            state.grid.flat().forEach(c => c.active = false);
        },

        spawnBoom: (pos) => {
            for (let i = 0; i < 20; i++) {
                const ang = Math.random() * Math.PI * 2, spd = Math.random() * 4 + 2;
                particles.push({ x: pos.x, y: pos.y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, life: 30+Math.random()*20, size: 2+Math.random()*3, color: pColors[Math.floor(Math.random()*pColors.length)] });
            }
        },
        spawnFloatingText: (x, y, text, color) => { floatingTexts.push({ x: x, y: y, text: text, color: color, life: 60 }); },

        // 🔍 Q：提示
        useSkillHint: function() {
            if (!state.gameActive || state.hintCharges <= 0) return;
            const cells = findOneMove();
            if (cells) { 
                state.hintCharges--; 
                state.skillLog.push({ t: Date.now(), act: 'skill_hint' }); // 紀錄
                if (state.hintCharges === 0) document.getElementById('skill-btn-hint').classList.add('used');
                cells.forEach(c => c.hinted = true);
                setTimeout(() => state.grid.flat().forEach(c => c.hinted = false), 10000);
            }
        },

        // 🌀 W：洗牌
        useSkillShuffle: function(markUsed = true) {
            if (!state.gameActive) return;
            if (markUsed && state.shuffleCharges <= 0) return; 

            if (markUsed) { 
                state.shuffleCharges--; 
                state.skillLog.push({ t: Date.now(), act: 'skill_shuffle_manual' }); // 紀錄手動
                if (state.shuffleCharges <= 0) document.getElementById('skill-btn-shuffle').classList.add('used');
            } else {
                 state.skillLog.push({ t: Date.now(), act: 'skill_shuffle_auto' }); // 紀錄自動
            }
            
            let remains = state.grid.flat().filter(c => !c.removed); let vals = remains.map(c => c.val);
            let attempts = 0;
            do {
                for (let i = vals.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [vals[i], vals[j]] = [vals[j], vals[i]]; }
                remains.forEach((c, i) => c.val = vals[i]); attempts++;
            } while (!findOneMove() && attempts < 20);
        },

        // 💣 E：模式
        toggleDeleteMode: function() {
            if (!state.gameActive) return; 
            if (!state.skillsUsed.delete) {
                state.isDeleteMode = !state.isDeleteMode;
                document.getElementById('skill-btn-delete').classList.toggle('active');
            }
        },

        stop: function(m) { state.gameActive = false; if (animationId) cancelAnimationFrame(animationId); if (m) SoundManager.stopBGM(); },
        
        end: function() { 
            this.stop(false); 
            document.getElementById('final-result-score').innerText = state.score; 
            document.getElementById('result-player-display').innerText = `Player: ${state.name}`;
            state.skillLog.push({ t: Date.now(), act: 'game_end', finalScore: state.score }); // 紀錄結束
            GameSystem.openResultOverlay(); 
        },

        backToHome: function() { this.stop(true); GameSystem.showScreen('screen-home'); }
    };
})();

// 初始化與監聽
window.addEventListener('load', () => {
    SoundManager.init(); GameSystem.initNamePersistence();
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
            GameEngine.toggleDeleteMode();
        }
    });
});

// 初始化與監聽
window.addEventListener('load', () => {
    SoundManager.init(); GameSystem.initNamePersistence();
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
});
