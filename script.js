/**
 * =============================================================================
 * 圈十遊戲 (Make 10) - 核心邏輯腳本
 * =============================================================================
 * 架構說明：
 * 本腳本採用 "Module Pattern" (模組模式) 將程式碼分為三個獨立部分，避免全域變數汙染。
 * 1. SoundManager: 負責音效與背景音樂管理 (包含音效池優化)。
 * 2. GameSystem: 負責系統功能 (後端 API 通訊、分數上傳、介面切換、安全驗證)。
 * 3. GameEngine: 負責遊戲核心 (渲染迴圈、演算法、狀態管理、技能邏輯)。
 * =============================================================================
 */

/**
 * -----------------------------------------------------------------------------
 * 第一部分：音頻管理器 (SOUND MANAGER)
 * -----------------------------------------------------------------------------
 * 負責處理所有聲音播放。使用 "音效池 (Object Pool)" 技術來解決連續點擊時音效被切斷的問題。
 */
const SoundManager = (function() {
    // 音樂與音效檔案路徑 (請確保 GitHub 上的 sound 資料夾結構正確)
    const BGM_FILES = ['./sound/bgmusic01.ogg', './sound/bgmusic02.ogg', './sound/bgmusic03.ogg'];
    const SFX_EXP = './sound/effect-expball.wav';
    
    // 從 localStorage 讀取音量設定，若無紀錄則預設為 0.5 (50%)
    let bgmVolume = parseFloat(localStorage.getItem('bgm_vol')) || 0.5;
    let sfxVolume = parseFloat(localStorage.getItem('sfx_vol')) || 0.5;

    let currentBGM = null; // 當前正在播放的背景音樂物件
    const sfxPool = [];    // 音效池陣列，用來存放預載的音效物件
    const POOL_SIZE = 5;   // 音效池大小 (同時最多可播放 5 個重疊音效，避免聲音破裂)

    return {
        /**
         * 初始化音效系統
         * 1. 預載音效物件放入池中，避免遊戲中途載入造成延遲。
         * 2. 綁定設定畫面 (screen-settings) 中的音量滑桿事件。
         */
        init: function() {
            // 建立並預載音效物件
            for (let i = 0; i < POOL_SIZE; i++) {
                const audio = new Audio(SFX_EXP);
                audio.volume = sfxVolume;
                sfxPool.push(audio);
            }

            // 取得 HTML 中的滑桿元素
            const mSlider = document.getElementById('music-slider');
            const sSlider = document.getElementById('sfx-slider');
            
            // 初始化滑桿位置
            if (mSlider) {
                mSlider.value = bgmVolume; 
                mSlider.addEventListener('input', (e) => {
                    bgmVolume = parseFloat(e.target.value);
                    // 如果正在播放音樂，即時調整音量
                    if (currentBGM) currentBGM.volume = bgmVolume;
                    localStorage.setItem('bgm_vol', bgmVolume);
                });
            }
            if (sSlider) {
                sSlider.value = sfxVolume;
                sSlider.addEventListener('input', (e) => {
                    sfxVolume = parseFloat(e.target.value);
                    // 批量更新音效池中所有物件的音量，確保下次播放時生效
                    sfxPool.forEach(a => a.volume = sfxVolume);
                    localStorage.setItem('sfx_vol', sfxVolume);
                });
            }
        },

        /**
         * 隨機播放背景音樂 (BGM)
         * 每次呼叫都會先停止前一首，再隨機挑選一首新歌播放。
         */
        playBGM: function() {
            if (currentBGM) { currentBGM.pause(); currentBGM = null; }
            
            const randomFile = BGM_FILES[Math.floor(Math.random() * BGM_FILES.length)];
            currentBGM = new Audio(randomFile);
            currentBGM.volume = bgmVolume;
            currentBGM.loop = true; // 設定為循環播放
            
            // 處理瀏覽器自動播放限制 (需使用者互動後才能播放，否則會報錯)
            currentBGM.play().catch(() => console.log("等待使用者互動後播放BGM"));
        },

        /**
         * 停止播放背景音樂
         */
        stopBGM: function() {
            if (currentBGM) { currentBGM.pause(); currentBGM = null; }
        },

        /**
         * 播放消除音效
         * 從音效池中尋找 "閒置" (暫停或結束) 的物件來播放，避免聲音被切斷。
         */
        playEliminate: function() {
            const audio = sfxPool.find(s => s.paused || s.ended) || sfxPool[0];
            audio.currentTime = 0; // 重置播放進度到開頭
            audio.play().catch(() => {});
        }
    };
})();

/**
 * -----------------------------------------------------------------------------
 * 第二部分：系統基礎設施 (SYSTEM SCRIPT)
 * -----------------------------------------------------------------------------
 * 負責處理與後端 Google Apps Script (GAS) 的溝通、分數上傳、排行榜顯示以及畫面切換。
 */
const GameSystem = (function() {
    // Google Apps Script (GAS) 後端部署網址
    const GAS_URL = "https://script.google.com/macros/s/AKfycbywi6spIec2aA3gD9gQbDu1w-4XJZ0wy3ZDdTWGlMX33FYZtuk7kmQjN7OKxJlJHkGr/exec";
    // 🔐 安全密鑰 (Salt)，必須與後端 Code.gs 中的設定完全一致，否則驗證會失敗
    const SECRET_SALT = "8fK#z2N@v9W$pL5&mR8*qT1!uX6^yB3(kC0)jA7[mS4]nD2{gH9}fJ"; 

    /**
     * 產生 SHA-256 安全簽章
     * 將 (名字 + 分數 + 時間戳 + 密鑰) 組合後進行雜湊，防止玩家透過 API 直接竄改分數。
     */
    async function getSignature(name, score, ts) {
        const msg = name + "|" + score + "|" + ts + "|" + SECRET_SALT;
        const encoder = new TextEncoder();
        const data = encoder.encode(msg);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        // 將 ArrayBuffer 轉換為 16 進位字串
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    return {
        /**
         * 切換顯示一般頁面 (如首頁、排行榜、遊戲畫面)
         * 切換時會自動關閉所有彈窗 (Settings/Result) 與模糊效果。
         */
        showScreen: (id) => {
            // 隱藏所有一般頁面
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            // 顯示目標頁面
            document.getElementById(id).classList.add('active');
            
            // 強制關閉所有彈窗與遮罩
            document.querySelectorAll('.overlay-screen').forEach(s => s.classList.remove('active'));
            document.getElementById('overlay-bg').classList.remove('active');
            
            // 💡 [修正] 移除遊戲畫面的模糊效果
            const gameScreen = document.getElementById('screen-game');
            if (gameScreen) gameScreen.classList.remove('blurred');
        },

        /**
         * 開啟/關閉 "設定" 彈窗
         * 同步控制背景遮罩與遊戲畫面的模糊濾鏡。
         */
        toggleSettings: (show) => {
            const settings = document.getElementById('screen-settings');
            const bg = document.getElementById('overlay-bg');
            const gameScreen = document.getElementById('screen-game');
            
            if (show) { 
                settings.classList.add('active'); 
                bg.classList.add('active'); 
                // 💡 [修正] 加入模糊
                if (gameScreen) gameScreen.classList.add('blurred');
            } else { 
                settings.classList.remove('active'); 
                bg.classList.remove('active'); 
                // 💡 [修正] 移除模糊
                if (gameScreen) gameScreen.classList.remove('blurred');
            }
        },

        /**
         * 開啟 "結算" 彈窗 (專用函式)
         * 顯示結算畫面時，保留底下的遊戲畫面但加上模糊。
         */
        openResultOverlay: () => {
            const result = document.getElementById('screen-result');
            const bg = document.getElementById('overlay-bg');
            const gameScreen = document.getElementById('screen-game');
            
            result.classList.add('active');
            bg.classList.add('active');
            // 💡 [修正] 加入模糊
            if (gameScreen) gameScreen.classList.add('blurred');
        },

        /**
         * 顯示排行榜
         * 優先從 GAS 獲取最新資料，若網路失敗則讀取 localStorage 的快取資料。
         */
        showLeaderboard: async function() {
            this.showScreen('screen-rank');
            const tbody = document.getElementById('rank-body');
            tbody.innerHTML = "<tr><td colspan='3'>同步數據中...</td></tr>";
            
            try {
                const resp = await fetch(GAS_URL);
                const ranks = await resp.json();
                this.renderRankTable(ranks);
            } catch (e) {
                // 網路錯誤時讀取本機快取
                const cached = JSON.parse(localStorage.getItem('math_game_rank')) || [];
                this.renderRankTable(cached);
            }
        },

        /**
         * 渲染排行榜表格 HTML
         */
        renderRankTable: (ranks) => {
            const tbody = document.getElementById('rank-body');
            if (!ranks || ranks.length === 0) { tbody.innerHTML = "<tr><td colspan='3'>暫無紀錄</td></tr>"; return; }
            tbody.innerHTML = ranks.slice(0, 10).map((r, i) => {
                let medal = i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : "";
                return `<tr><td>${medal}${i + 1}</td><td>${r.name || '-'}</td><td style="font-weight:bold">${r.score || 0}</td></tr>`;
            }).join('');
        },

        /**
         * 上傳分數至後端
         * 包含防止重複點擊、錯誤處理與本機快取更新。
         */
        uploadScore: async function() {
            const b = document.getElementById('upload-btn');
            const internal = GameEngine.getInternalState(); 
            
            // 測試模式禁止上傳
            if (internal.isTestUsed) return;

            b.disabled = true; 
            b.innerText = "驗證中...";
            
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
                        audit_skills: internal.skillsUsed 
                    }) 
                });
                
                const result = await resp.json();
                
                if (result.status === "error") { 
                    alert("上傳失敗：" + result.message); 
                    b.disabled = false; b.innerText = "重試上傳"; 
                    return; 
                }
                
                // 上傳成功，更新本機快取
                localStorage.setItem('math_game_rank', JSON.stringify(result));
                alert("🎉 上傳成功！"); 
                this.showLeaderboard(); // 跳轉排行榜會自動關閉彈窗
            } catch (e) { 
                alert("網路錯誤"); 
                b.disabled = false; b.innerText = "重試上傳"; 
            }
        },

        /**
         * 初始化玩家名稱記憶功能
         */
        initNamePersistence: function() {
            const input = document.getElementById('home-player-name');
            input.value = localStorage.getItem('savedPlayerName') || "";
            input.addEventListener('input', (e) => localStorage.setItem('savedPlayerName', e.target.value.trim()));
        }
    };
})();

/**
 * -----------------------------------------------------------------------------
 * 第三部分：遊戲核心引擎 (GAME SCRIPT)
 * -----------------------------------------------------------------------------
 * 包含：遊戲迴圈、渲染、輸入處理、核心演算法、技能邏輯。
 */
const GameEngine = (function() {
    // 畫布與環境變數
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const ROWS = 16, COLS = 10, GRID_SIZE = 40, MARGIN = 3;

    // 遊戲狀態物件
    let state = {
        grid: [],           // 16x10 的二維陣列
        score: 0,           // 分數
        timeLeft: 60,       // 剩餘時間
        gameActive: false,  // 遊戲進行狀態
        isDeleteMode: false,// 是否處於刪除模式
        isTestUsed: false,  // 是否使用測試工具
        name: "",           // 玩家名稱
        skillsUsed: { hint: false, shuffle: false, delete: false } // 技能狀態
    };

    // 輸入狀態
    let input = { isDragging: false, start: { x: 0, y: 0 }, current: { x: 0, y: 0 } };
    // 動畫變數
    let particles = [], animationId = null, lastTime = 0, timerAcc = 0;
    const pColors = ['#f1c40f', '#e67e22', '#e74c3c', '#3498db', '#2ecc71'];

    /**
     * 🔍 [核心演算法] 尋找一組解
     * 窮舉所有可能的矩形區域，檢查總和是否為 10。
     * 用於 "尋找一組" 技能與 "死局偵測"。
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
                                    sum += state.grid[r][c].val; 
                                    cells.push(state.grid[r][c]); 
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
     * 🌀 死局檢查與自動處理
     * 每次消除後呼叫。若無解則自動打亂，若打亂用盡則結束遊戲。
     */
    function checkBoardStatus() {
        const remaining = state.grid.flat().filter(c => !c.removed);
        if (remaining.length === 0) { alert("恭喜清空盤面！"); initGrid(); return; }
        if (!findOneMove()) {
            if (!state.skillsUsed.shuffle) { 
                alert("無解！自動打亂..."); 
                GameEngine.useSkillShuffle(true); 
            } else { 
                alert("無解且技能用完，結束！"); 
                GameEngine.end(); 
            }
        }
    }

    /**
     * 初始化網格數字
     * 使用 "湊對法" 生成 (n, 10-n) 確保初始盤面必定有解。
     */
    function initGrid() {
        const total = ROWS * COLS, nums = [];
        for (let i = 0; i < total / 2; i++) { 
            let n = Math.floor(Math.random() * 9) + 1; 
            nums.push(n, 10 - n); 
        }
        // Fisher-Yates 洗牌
        for (let i = nums.length - 1; i > 0; i--) { 
            const j = Math.floor(Math.random() * (i + 1)); 
            [nums[i], nums[j]] = [nums[j], nums[i]]; 
        }
        state.grid = Array.from({ length: ROWS }, (_, r) => 
            Array.from({ length: COLS }, (_, c) => ({ 
                val: nums[r * COLS + c], removed: false, active: false, hinted: false 
            }))
        );
    }

    /**
     * 渲染函式 (每幀呼叫)
     * 繪製格子、數字、粒子特效與框選線。
     */
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. 繪製格子
        state.grid.forEach((row, r) => row.forEach((cell, c) => {
            if (cell.removed) return;
            let x = c * GRID_SIZE + MARGIN, y = r * GRID_SIZE + MARGIN, s = GRID_SIZE - MARGIN * 2;
            ctx.beginPath(); ctx.roundRect(x, y, s, s, 6);
            
            // 根據狀態設定顏色
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

        // 2. 繪製粒子特效 (使用倒序迴圈避免刪除時的閃爍問題)
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx; 
            p.y += p.vy; 
            p.life--; 
            
            let alpha = p.life / 60;
            if (alpha < 0) alpha = 0;

            ctx.globalAlpha = alpha; 
            ctx.fillStyle = p.color; 
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); 
            p.vy += 0.1; // 重力效果
            
            if (p.life <= 0) particles.splice(i, 1); 
        }
        ctx.globalAlpha = 1;

        // 3. 繪製框選線
        if (input.isDragging && !state.isDeleteMode) {
            ctx.strokeStyle = '#3498db'; ctx.setLineDash([5, 3]); 
            ctx.strokeRect(input.start.x, input.start.y, input.current.x - input.start.x, input.current.y - input.start.y); 
            ctx.setLineDash([]); 
            ctx.fillStyle = 'rgba(52, 152, 219, 0.1)'; 
            ctx.fillRect(input.start.x, input.start.y, input.current.x - input.start.x, input.current.y - input.start.y);
        }
    }

    return {
        // 工具：取得相對座標
        getPos: (e) => { 
            const rect = canvas.getBoundingClientRect(); 
            return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) }; 
        },
        // 提供狀態給上傳系統
        getInternalState: () => ({ name: state.name, score: state.score, skillsUsed: state.skillsUsed, isTestUsed: state.isTestUsed }),
        
        /**
         * 遊戲開始
         */
        start: function() {
            const inputName = document.getElementById('home-player-name').value.trim();
            if (!inputName) { alert("請輸入名稱！"); return; }
            this.stop(true); // 停止上一局並停止音樂
            
            // 重置上傳按鈕狀態
            const uploadBtn = document.getElementById('upload-btn');
            if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.innerText = "上傳成績"; }

            // 初始化狀態
            state.name = inputName; 
            state.score = 0; 
            state.timeLeft = 60; 
            state.gameActive = true; 
            
            // 立即重置畫面數字，避免看到上一局的殘留
            document.getElementById('score').innerText = "0";
            document.getElementById('timer').innerText = "60";

            state.skillsUsed = { hint: false, shuffle: false, delete: false };
            document.querySelectorAll('.skill-btn').forEach(b => b.classList.remove('used', 'active'));
            localStorage.setItem('savedPlayerName', state.name); 
            
            // 顯示遊戲畫面
            GameSystem.showScreen('screen-game');
            initGrid(); 
            lastTime = performance.now(); 
            timerAcc = 0; 
            SoundManager.playBGM(); 
            this.loop(lastTime);
        },

        /**
         * 停止遊戲
         * @param {boolean} stopMusic - 是否停止背景音樂 (預設 true)
         */
        stop: function(stopMusic = true) { 
            state.gameActive = false; 
            if(animationId) { cancelAnimationFrame(animationId); animationId = null; }
            if (stopMusic) SoundManager.stopBGM(); 
        },

        // 設定畫面操作
        openSettings: function() { GameSystem.toggleSettings(true); },
        resumeFromSettings: function() { GameSystem.toggleSettings(false); },
        
        // 回主選單 (會停止音樂)
        backToHome: function() { 
            this.stop(true); 
            GameSystem.showScreen('screen-home'); 
        },

        /**
         * 遊戲主迴圈
         */
        loop: function(t) {
            if (!state.gameActive) return;
            const dt = t - lastTime; lastTime = t; 
            timerAcc += dt;
            // 處理倒數計時
            if (timerAcc >= 1000) { 
                state.timeLeft--; 
                document.getElementById('timer').innerText = state.timeLeft; 
                timerAcc -= 1000; 
                if (state.timeLeft <= 0) this.end(); 
            }
            if (input.isDragging && !state.isDeleteMode) this.updateStates();
            render(); 
            animationId = requestAnimationFrame((ts) => this.loop(ts));
        },

        // 更新框選狀態
        updateStates: () => {
            let x1 = Math.min(input.start.x, input.current.x), x2 = Math.max(input.start.x, input.current.x);
            let y1 = Math.min(input.start.y, input.current.y), y2 = Math.max(input.start.y, input.current.y);
            state.grid.forEach((row, r) => row.forEach((cell, c) => { 
                let tx1 = c * GRID_SIZE, tx2 = (c+1) * GRID_SIZE, ty1 = r * GRID_SIZE, ty2 = (r+1) * GRID_SIZE; 
                cell.active = !cell.removed && !(tx2 < x1 || tx1 > x2 || ty2 < y1 || ty1 > y2); 
            }));
        },

        // 按下事件
        handleDown: function(pos) {
            if (!state.gameActive) return;
            // 刪除模式
            if (state.isDeleteMode) {
                const c = Math.floor(pos.x / GRID_SIZE), r = Math.floor(pos.y / GRID_SIZE);
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS && !state.grid[r][c].removed) {
                    state.grid[r][c].removed = true; 
                    state.skillsUsed.delete = true; 
                    state.isDeleteMode = false;
                    document.getElementById('skill-btn-delete').classList.remove('active', 'used'); 
                    document.getElementById('skill-btn-delete').classList.add('used');
                    SoundManager.playEliminate(); this.spawnBoom(pos); checkBoardStatus();
                }
                return;
            }
            // 一般框選
            state.grid.flat().forEach(c => c.hinted = false); 
            input.isDragging = true; input.start = pos; input.current = { ...pos };
        },

        // 移動事件
        handleMove: function(pos) {
            if (input.isDragging && !state.isDeleteMode) { input.current = pos; }
        },

        // 放開事件 (消除判定)
        handleUp: function() {
            if (!input.isDragging) return; input.isDragging = false;
            let sel = state.grid.flat().filter(c => !c.removed && c.active);
            if (sel.reduce((s, c) => s + c.val, 0) === 10 && sel.length > 0) {
                state.timeLeft += 3; state.score += sel.length * 100; 
                
                // 立即更新畫面數據，避免視覺延遲
                document.getElementById('score').innerText = state.score;
                document.getElementById('timer').innerText = state.timeLeft;

                SoundManager.playEliminate(); this.spawnBoom(input.current);
                sel.forEach(c => c.removed = true); checkBoardStatus();
            }
            state.grid.flat().forEach(c => c.active = false);
        },

        // 產生粒子特效
        spawnBoom: (pos) => { 
            for (let i = 0; i < 20; i++) { 
                const ang = Math.random() * Math.PI * 2, spd = Math.random() * 4 + 2; 
                particles.push({ 
                    x: pos.x, y: pos.y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, 
                    life: 30+Math.random()*20, size: 2+Math.random()*3, 
                    color: pColors[Math.floor(Math.random()*pColors.length)] 
                }); 
            } 
        },

        // 技能：提示
        useSkillHint: function() {
            if (!state.gameActive || state.skillsUsed.hint) return;
            const cells = findOneMove();
            if (cells) { 
                state.skillsUsed.hint = true; 
                document.getElementById('skill-btn-hint').classList.add('used'); 
                cells.forEach(c => c.hinted = true); 
                // 10秒後自動取消提示
                setTimeout(() => state.grid.flat().forEach(c => c.hinted = false), 10000); 
            }
        },

        // 技能：打亂 (包含防死局保護)
        useSkillShuffle: function(markUsed = true) {
            if (!state.gameActive || (markUsed && state.skillsUsed.shuffle)) return;
            if (markUsed) { state.skillsUsed.shuffle = true; document.getElementById('skill-btn-shuffle').classList.add('used'); }
            
            let remains = state.grid.flat().filter(c => !c.removed);
            let vals = remains.map(c => c.val);
            let attempts = 0; const MAX_ATTEMPTS = 20;
            
            // 嘗試打亂直到找到至少有一組解，或超過嘗試次數
            do {
                for (let i = vals.length - 1; i > 0; i--) { 
                    const j = Math.floor(Math.random() * (i + 1)); 
                    [vals[i], vals[j]] = [vals[j], vals[i]]; 
                }
                remains.forEach((c, i) => c.val = vals[i]);
                attempts++;
            } while (!findOneMove() && attempts < MAX_ATTEMPTS);
        },

        // 技能：切換刪除模式
        toggleDeleteMode: function() { 
            if(!state.skillsUsed.delete) { 
                state.isDeleteMode = !state.isDeleteMode; 
                document.getElementById('skill-btn-delete').classList.toggle('active'); 
            } 
        },

        /**
         * 遊戲結束
         * 開啟結算彈窗，不停止背景音樂。
         */
        end: function() { 
            this.stop(false); // 💡 false = 不停止音樂
            GameSystem.toggleSettings(false); // 確保設定彈窗關閉
            
            document.getElementById('final-result-score').innerText = state.score; 
            document.getElementById('result-player-display').innerText = `Player: ${state.name}`; 
            
            const uploadBtn = document.getElementById('upload-btn');
            if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.innerText = "上傳成績"; }
            
            GameSystem.openResultOverlay(); 
        }
    };
})();

/**
 * -----------------------------------------------------------------------------
 * 第四部分：初始化與全域監聽
 * -----------------------------------------------------------------------------
 */
window.addEventListener('load', () => {
    SoundManager.init(); 
    GameSystem.initNamePersistence(); 
    
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        // 指標事件 (Pointer Events) 統一處理滑鼠與觸控
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
    
    // 防止手機雙指縮放與誤觸
    document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
});
