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
    // 🔐 安全密鑰：需與後端 Code.gs 完全一致
    const SECRET_SALT = "8fK#z2N@v9W$pL5&mR8*qT1!uX6^yB3(kC0)jA7[mS4]nD2{gH9}fJ"; 

    /**
     * 產生 SHA-256 安全簽章
     */
    async function getSignature(name, score, ts) {
        // 確保加上分隔符號，與後端邏輯一致
        const msg = name + "|" + score + "|" + ts + "|" + SECRET_SALT;
        const encoder = new TextEncoder();
        const data = encoder.encode(msg);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    return {
        /**
         * 切換主畫面
         */
        showScreen: (id) => {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'blurred'));
            document.getElementById(id).classList.add('active');
            
            // 關閉所有彈窗
            document.querySelectorAll('.overlay-screen').forEach(s => s.classList.remove('active'));
            
            const bg = document.getElementById('overlay-bg');
            if (bg) {
                bg.classList.remove('active');
                bg.style.display = 'none'; // 強制隱藏，確保不會擋住按鈕
            }
        },

        /**
         * 💡 [修復] 彈窗控制函式 (Toggle Overlay)
         * 包含 HTML 防呆機制：若找不到 overlay-bg 會自動建立
         */
        toggleOverlay: (id, show) => {
            const overlay = document.getElementById(id);
            let bg = document.getElementById('overlay-bg');
            
            // 防呆：自動建立遮罩層
            if (!bg) {
                bg = document.createElement('div');
                bg.id = 'overlay-bg';
                // 這裡簡單賦予樣式確保功能正常，建議 CSS 也要補上
                bg.style.position = 'fixed'; bg.style.top = 0; bg.style.left = 0;
                bg.style.width = '100%'; bg.style.height = '100%';
                bg.style.background = 'rgba(0,0,0,0.6)'; bg.style.zIndex = '999';
                bg.style.display = 'none';
                document.body.appendChild(bg);
            }
            
            const gameScreen = document.getElementById('screen-game');
            
            if (show) { 
                if (overlay) overlay.classList.add('active'); 
                bg.style.display = 'block'; // 強制顯示
                bg.classList.add('active'); 
                if (gameScreen) gameScreen.classList.add('blurred');
            } else { 
                if (overlay) overlay.classList.remove('active'); 
                bg.style.display = 'none'; // 強制隱藏
                bg.classList.remove('active'); 
                if (gameScreen) gameScreen.classList.remove('blurred');
            }
        },

        /**
         * 開啟結算畫面
         */
        openResultOverlay: () => {
            GameSystem.toggleOverlay('screen-result', true);
        },

        /**
         * 上傳分數 (含證據鏈稽核)
         */
        uploadScore: async function() {
            const b = document.getElementById('upload-btn');
            const internal = GameEngine.getInternalState(); 
            
            if (internal.isTestUsed) return; // 測試模式不上傳

            // 🛡️ [新增] 上傳前的最後 ID 檢查 (防呆)
            const safeName = (internal.name || "").trim();
            if (safeName.length === 0) {
                alert("❌ 錯誤：名稱不能為空！");
                return;
            }
            if (safeName.length > 10) {
                alert("❌ 錯誤：名稱長度異常 (超過10字)，請重新整理頁面。");
                return;
            }

            b.disabled = true; b.innerText = "驗證中...";
            
            const ts = Date.now();
            const sign = await getSignature(internal.name, internal.score, ts);
            
            try {
                const resp = await fetch(GAS_URL, { 
                    method: "POST", 
                    body: JSON.stringify({ 
                        name: internal.name, 
                        score: internal.score, 
                        timestamp: ts, 
                        sign: sign, 
                        // 🛡️ 傳送證據鏈供後端檢查
                        log: internal.matchLog 
                    }) 
                });
                const result = await resp.json();
                if (result.status === "error") { 
                    alert("上傳失敗：" + result.message); b.disabled = false; return; 
                }
                localStorage.setItem('math_game_rank', JSON.stringify(result));
                alert("🎉 上傳成功！"); 
                this.showLeaderboard();
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
 * 第三部分：遊戲核心引擎 (GAME SCRIPT) - 倒數掉落動畫版
 * -----------------------------------------------------------------------------
 */
const GameEngine = (function() {
    // 取得 Canvas 繪圖環境
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // =========================================
    // 📐 遊戲常數設定 (8x14 版面配置)
    // =========================================
    // 說明：畫布大小為 400x640。
    // 我們將格子設為 8x14，格子大小 (SIZE) 設為 45。
    // 寬度：8 * 45 = 360 (左右各留 20px 空隙)
    // 高度：14 * 45 = 630 (上下各留 5px 空隙)
    const ROWS = 14; 
    const COLS = 8; 
    const SIZE = 45; 
    const MARGIN = 3; // 格子間距

    // 計算置中偏移量 (讓網格在畫布正中間)
    const OFFSET_X = (400 - COLS * SIZE) / 2; // (400 - 360) / 2 = 20px
    const OFFSET_Y = (640 - ROWS * SIZE) / 2; // (640 - 630) / 2 = 5px

    // =========================================
    // 🎮 遊戲狀態 (State)
    // =========================================
    let state = {
        grid: [],           // 存放方塊物件的二維陣列
        score: 0,           // 當前分數
        timeLeft: 60,       // 剩餘時間
        gameActive: false,  // 遊戲是否進行中
        isDeleteMode: false,// 是否開啟炸彈模式
        name: "",           // 玩家名稱
        
        // 🛠️ 技能相關狀態
        skillsUsed: { shuffle: false, delete: false }, // 洗牌與炸彈 (維持一次性或限制)
        hintCharges: 1,       // 🔥 新增：提示技能目前擁有的次數 (預設給 1 次)
        nextHintScore: 10000, // 🔥 新增：下一次獲得獎勵的目標分數
        
        matchLog: [],       // 證據鏈 (紀錄每次消除)
        
        // 🔥 Combo 相關
        combo: 0,           // 當前連擊數
        comboTimer: 0,      // 連擊倒數計時
        maxComboTime: 180,  // 連擊判定時間 (約 3 秒)
        
        numberBag: []       // 🎒 數字袋 (俄羅斯方塊式隨機)
    };

    // 輸入控制變數
    let input = { isDragging: false, start: { x: 0, y: 0 }, current: { x: 0, y: 0 } };
    
    // 特效物件
    let particles = [];     // 爆炸粒子
    let floatingTexts = []; // 漂浮文字
    
    // 動畫迴圈控制
    let animationId = null, lastTime = 0, timerAcc = 0;
    const pColors = ['#f1c40f', '#e67e22', '#e74c3c', '#3498db', '#2ecc71'];

    /**
     * 🎒 機制：從數字袋中抽取下一個數字
     * 確保 1-9 數字分佈均勻。
     */
    function getNextNumber() {
        if (state.numberBag.length === 0) {
            let newSet = [];
            // 放入兩組 1~9 (共18個)
            for (let k = 0; k < 2; k++) { 
                for (let i = 1; i <= 9; i++) newSet.push(i);
            }
            // 洗牌
            for (let i = newSet.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newSet[i], newSet[j]] = [newSet[j], newSet[i]];
            }
            state.numberBag = newSet;
        }
        return state.numberBag.pop();
    }

    /**
     * 🔍 機制：檢查盤面是否有解 (尋找總和為 10 的組合)
     */
    function findOneMove() {
        for (let r1 = 0; r1 < ROWS; r1++) {
            for (let c1 = 0; c1 < COLS; c1++) {
                if (state.grid[r1][c1].removed) continue;
                for (let r2 = r1; r2 < ROWS; r2++) {
                    for (let c2 = c1; c2 < COLS; c2++) {
                        let sum = 0, cells = [];
                        for (let r = r1; r <= r2; r++) {
                            for (let c = c1; c <= c2; c++) {
                                if (!state.grid[r][c].removed) { 
                                    sum += state.grid[r][c].val; cells.push(state.grid[r][c]); 
                                }
                            }
                        }
                        if (sum === 10 && cells.length > 0) return cells;
                    }
                }
            }
        }
        return null;
    }

    /**
     * 🍬 機制：重力下落與補牌
     */
    function applyGravity() {
        for (let c = 0; c < COLS; c++) {
            let newCol = [];
            // 1. 收集該列未消除的方塊
            for (let r = 0; r < ROWS; r++) {
                if (!state.grid[r][c].removed) {
                    let cell = state.grid[r][c];
                    // 計算視覺位置以便進行平滑動畫
                    let visualY = r * SIZE + (cell.offsetY || 0);
                    cell.tempVisualY = visualY; 
                    newCol.push(cell);
                }
            }
            
            // 2. 計算需要補充多少方塊
            let missingCount = ROWS - newCol.length;
            
            // 3. 從頂部生成新方塊
            for (let i = 0; i < missingCount; i++) {
                let startVisualY = - (missingCount - i) * SIZE; 
                newCol.unshift({ 
                    val: getNextNumber(), 
                    removed: false, active: false, hinted: false,
                    tempVisualY: startVisualY 
                });
            }
            
            // 4. 更新 Grid 並設定動畫偏移量 (offsetY)
            for (let r = 0; r < ROWS; r++) {
                let cell = newCol[r];
                let targetY = r * SIZE;
                cell.offsetY = cell.tempVisualY - targetY;
                delete cell.tempVisualY; 
                state.grid[r][c] = cell;
            }
        }
    }

    /**
     * 機制：檢查死局，若無解則自動洗牌
     */
    function checkBoardStatus() {
        if (!findOneMove()) {
            if (!state.skillsUsed.shuffle) GameEngine.useSkillShuffle(true); 
            else GameEngine.useSkillShuffle(false); 
        }
    }

    /**
     * 初始化網格
     */
    function initGrid() {
        state.numberBag = []; 
        state.grid = Array.from({ length: ROWS }, (_, r) => 
            Array.from({ length: COLS }, (_, c) => {
                let startY = - (ROWS - r) * SIZE; 
                let targetY = r * SIZE;
                return { 
                    val: getNextNumber(), 
                    removed: false, active: false, hinted: false,
                    offsetY: startY - targetY
                };
            })
        );
    }

    /**
     * UI：更新 HTML Combo 條
     */
    function updateComboUI() {
        const barContainer = document.getElementById('combo-bar-container');
        const barFill = document.getElementById('combo-bar-fill');
        if (!barContainer || !barFill) return;

        if (state.combo > 0) {
            barContainer.style.display = 'block';
            let percent = (state.comboTimer / state.maxComboTime) * 100;
            barFill.style.width = `${percent}%`;
            // 顏色變化
            if (state.combo < 3) barFill.style.background = '#f1c40f';
            else if (state.combo < 6) barFill.style.background = '#e67e22';
            else barFill.style.background = '#e74c3c';
        } else {
            barContainer.style.display = 'none';
        }
    }

    /**
     * UI：開場倒數 (3, 2, 1, GO)
     */
    function runCountdown(callback) {
        const cdEl = document.getElementById('start-countdown');
        const maskEl = document.getElementById('start-mask');
        if (!cdEl) { callback(); return; }

        let count = 3;
        cdEl.style.display = 'block';
        if (maskEl) maskEl.style.display = 'block';
        cdEl.innerText = count;
        // 重置動畫
        cdEl.style.animation = 'none';
        cdEl.offsetHeight; 
        cdEl.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        let timer = setInterval(() => {
            count--;
            if (count > 0) {
                cdEl.innerText = count;
                cdEl.style.animation = 'none';
                cdEl.offsetHeight; 
                cdEl.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            } else if (count === 0) {
                cdEl.innerText = "GO!";
                cdEl.style.animation = 'none';
                cdEl.offsetHeight; 
                cdEl.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            } else {
                clearInterval(timer);
                cdEl.style.display = 'none';
                if (maskEl) maskEl.style.display = 'none';
                callback(); 
            }
        }, 1000);
    }

    /**
     * 🎨 渲染函式 (Draw Loop)
     */
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        state.grid.forEach((row, r) => row.forEach((cell, c) => {
            let drawY = (r * SIZE) + (cell.offsetY || 0);
            
            // 🔥 修正：繪製座標加上 OFFSET，讓 8x14 網格置中
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

        // 繪製粒子
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

        // 繪製漂浮文字
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            let ft = floatingTexts[i];
            ft.y -= 1; ft.life--;
            ctx.globalAlpha = Math.max(0, ft.life / 30);
            ctx.fillStyle = ft.color;
            ctx.font = "bold 24px Arial"; ctx.textAlign = "center";
            ctx.fillText(ft.text, ft.x, ft.y);
            if (ft.life <= 0) floatingTexts.splice(i, 1);
        }
        ctx.globalAlpha = 1;

        // 繪製拖曳框 (需修正座標)
        if (input.isDragging && !state.isDeleteMode) {
            ctx.strokeStyle = '#3498db'; ctx.setLineDash([5, 3]); 
            ctx.strokeRect(input.start.x, input.start.y, input.current.x - input.start.x, input.current.y - input.start.y); 
            ctx.setLineDash([]); ctx.fillStyle = 'rgba(52, 152, 219, 0.1)';
            ctx.fillRect(input.start.x, input.start.y, input.current.x - input.start.x, input.current.y - input.start.y);
        }
    }

    return {
        // 工具：取得滑鼠/觸控座標
        getPos: (e) => { 
            const rect = canvas.getBoundingClientRect(); 
            return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) }; 
        },
        getInternalState: () => ({ name: state.name, score: state.score, matchLog: state.matchLog }),

        // 🚀 遊戲啟動入口
        start: function() {
            state.name = document.getElementById('home-player-name').value.trim();
            if (!state.name) { alert("請輸入名稱！"); return; }
            if (state.name.length > 10) { alert("名稱請限制在 10 個字以內！"); return; }

            this.stop(true);
            const uploadBtn = document.getElementById('upload-btn');
            if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.innerText = "上傳成績"; }
            
            state.score = 0; 
            state.timeLeft = 60; 
            state.gameActive = false; 
            state.matchLog = [];
            state.combo = 0; state.comboTimer = 0;
            
            // 🔥 初始化技能與獎勵狀態
            state.skillsUsed = { shuffle: false, delete: false };
            state.hintCharges = 1;      // 初始給 1 次提示
            state.nextHintScore = 10000;// 設定第一個獎勵目標為 10000 分
            
            // 重置按鈕樣式
            document.querySelectorAll('.skill-btn').forEach(b => b.classList.remove('used', 'active'));
            
            document.getElementById('score').innerText = "0"; 
            document.getElementById('timer').innerText = "60";
            
            initGrid(); 
            GameSystem.showScreen('screen-game');
            updateComboUI(); 

            lastTime = performance.now(); 
            this.loop(lastTime);

            runCountdown(() => {
                state.gameActive = true;
                SoundManager.playBGM(); 
                timerAcc = 0; 
                lastTime = performance.now(); 
            });
        },

        initGrid: () => initGrid(),

        // 🔄 主迴圈
        loop: function(t) {
            const dt = t - lastTime; lastTime = t; timerAcc += dt;
            
            if (state.gameActive) {
                if (timerAcc >= 1000) {
                    state.timeLeft--; document.getElementById('timer').innerText = state.timeLeft;
                    timerAcc -= 1000; if (state.timeLeft <= 0) this.end();
                }

                if (state.combo > 0) {
                    state.comboTimer--;
                    if (state.comboTimer <= 0) state.combo = 0;
                }
            }

            updateComboUI();

            let fallingSpeed = 8; 
            state.grid.forEach(row => row.forEach(cell => {
                if (cell.offsetY < 0) {
                    cell.offsetY += fallingSpeed;
                    if (cell.offsetY > 0) cell.offsetY = 0;
                }
            }));

            if (input.isDragging && !state.isDeleteMode) this.updateStates();
            render(); animationId = requestAnimationFrame((ts) => this.loop(ts));
        },

        openSettings: () => GameSystem.toggleOverlay('screen-settings', true),
        resumeFromSettings: () => GameSystem.toggleOverlay('screen-settings', false),

        // 輸入處理：按下
        handleDown: function(pos) {
            if (!state.gameActive) return; 
            
            if (state.isDeleteMode) {
                // 🔥 修正點擊座標判定：必須扣除 OFFSET
                const c = Math.floor((pos.x - OFFSET_X) / SIZE);
                const r = Math.floor((pos.y - OFFSET_Y) / SIZE);
                
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS && !state.grid[r][c].removed && state.grid[r][c].offsetY === 0) {
                    state.grid[r][c].removed = true; 
                    state.skillsUsed.delete = true; 
                    state.isDeleteMode = false;
                    document.getElementById('skill-btn-delete').classList.remove('active', 'used'); 
                    document.getElementById('skill-btn-delete').classList.add('used');
                    SoundManager.playEliminate(); 
                    this.spawnBoom(pos); 
                    applyGravity(); 
                    checkBoardStatus();
                }
                return;
            }
            state.grid.flat().forEach(c => c.hinted = false);
            input.isDragging = true; input.start = pos; input.current = { ...pos };
        },

        handleMove: function(pos) { if (input.isDragging && !state.isDeleteMode) { input.current = pos; } },

        // 判定選取狀態
        updateStates: () => {
            let x1 = Math.min(input.start.x, input.current.x), x2 = Math.max(input.start.x, input.current.x);
            let y1 = Math.min(input.start.y, input.current.y), y2 = Math.max(input.start.y, input.current.y);
            
            state.grid.forEach((row, r) => row.forEach((cell, c) => {
                if (cell.offsetY !== 0) { cell.active = false; return; }
                
                // 🔥 修正選取範圍判定：加上 OFFSET
                let tx = c * SIZE + OFFSET_X;
                let ty = r * SIZE + OFFSET_Y;
                
                cell.active = !cell.removed && !(tx + SIZE < x1 || tx > x2 || ty + SIZE < y1 || ty > y2);
            }));
        },

        // 輸入處理：放開 (結算)
        handleUp: function() {
            if (!input.isDragging) return; input.isDragging = false;
            let sel = state.grid.flat().filter(c => !c.removed && c.active);
            if (sel.reduce((s, c) => s + c.val, 0) === 10 && sel.length > 0) {
                let basePoints = sel.length * 100;
                
                let comboBonus = 0;
                if (state.combo >= 2) {
                    comboBonus = (state.combo - 1) * 50;
                }

                let totalPoints = basePoints + comboBonus;
                if (totalPoints > 2500) totalPoints = 2500; 

                state.score += totalPoints; 
                state.timeLeft += 4;
                state.combo++; 
                state.comboTimer = state.maxComboTime;

                // 🎁 獎勵機制：每 10,000 分獲得 1 次提示技能
                if (state.score >= state.nextHintScore) {
                    state.hintCharges++;
                    state.nextHintScore += 10000; // 更新下一個目標
                    
                    // 恢復按鈕可點擊狀態 (移除灰階樣式)
                    document.getElementById('skill-btn-hint').classList.remove('used');
                    
                    // 視覺回饋
                    this.spawnFloatingText(200, 300, "Hint +1 !", '#2ecc71');
                }

                if (state.combo >= 3) {
                    SoundManager.playWaha();
                }

                state.matchLog.push({ t: Date.now(), p: totalPoints }); 
                
                document.getElementById('score').innerText = state.score;
                document.getElementById('timer').innerText = state.timeLeft;
                SoundManager.playEliminate(); 
                this.spawnBoom(input.current);

                let text = `+${totalPoints}`;
                if (state.combo > 1) text += ` (Combo x${state.combo})`;
                this.spawnFloatingText(input.current.x, input.current.y - 20, text, '#f1c40f');

                sel.forEach(c => c.removed = true);
                applyGravity();
                checkBoardStatus();
            }
            state.grid.flat().forEach(c => c.active = false);
        },

        spawnBoom: (pos) => {
            for (let i = 0; i < 20; i++) {
                const ang = Math.random() * Math.PI * 2, spd = Math.random() * 4 + 2;
                particles.push({ x: pos.x, y: pos.y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, life: 30+Math.random()*20, size: 2+Math.random()*3, color: pColors[Math.floor(Math.random()*pColors.length)] });
            }
        },

        spawnFloatingText: (x, y, text, color) => {
            floatingTexts.push({ x: x, y: y, text: text, color: color, life: 60 });
        },

        // 🔍 修改：提示技能 (消耗次數制)
        useSkillHint: function() {
            // 檢查是否有剩餘次數
            if (!state.gameActive || state.hintCharges <= 0) return;
            
            const cells = findOneMove();
            if (cells) { 
                state.hintCharges--; // 扣除 1 次
                
                // 若次數用完，按鈕變灰
                if (state.hintCharges === 0) {
                    document.getElementById('skill-btn-hint').classList.add('used');
                }
                
                cells.forEach(c => c.hinted = true);
                setTimeout(() => state.grid.flat().forEach(c => c.hinted = false), 10000);
            }
        },

        useSkillShuffle: function(markUsed = true) {
            if (!state.gameActive || (markUsed && state.skillsUsed.shuffle)) return;
            if (markUsed) { state.skillsUsed.shuffle = true; document.getElementById('skill-btn-shuffle').classList.add('used'); }
            
            let remains = state.grid.flat().filter(c => !c.removed);
            let vals = remains.map(c => c.val);
            let attempts = 0;
            do {
                for (let i = vals.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [vals[i], vals[j]] = [vals[j], vals[i]]; }
                remains.forEach((c, i) => c.val = vals[i]); attempts++;
            } while (!findOneMove() && attempts < 20);
        },

        toggleDeleteMode: function() {
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
});
