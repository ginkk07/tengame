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
    // 定義音效路徑 (請確保檔案存在)
    const BGM_FILES = ['./sound/bgmusic01.ogg', './sound/bgmusic02.ogg', './sound/bgmusic03.ogg'];
    const SFX_EXP = './sound/effect-expball.wav';
    
    // 讀取音量設定
    let bgmVolume = parseFloat(localStorage.getItem('bgm_vol')) || 0.5;
    let sfxVolume = parseFloat(localStorage.getItem('sfx_vol')) || 0.5;

    let currentBGM = null;
    const sfxPool = [];
    const POOL_SIZE = 5; // 音效池大小

    return {
        /**
         * 初始化音效系統
         */
        init: function() {
            // 預載音效池
            for (let i = 0; i < POOL_SIZE; i++) {
                const audio = new Audio(SFX_EXP);
                audio.volume = sfxVolume;
                sfxPool.push(audio);
            }

            // 綁定音量滑桿
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
                    localStorage.setItem('sfx_vol', sfxVolume);
                });
            }
        },

        /**
         * 播放背景音樂
         */
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

        /**
         * 播放消除音效
         */
        playEliminate: function() {
            const audio = sfxPool.find(s => s.paused || s.ended) || sfxPool[0];
            audio.currentTime = 0;
            audio.play().catch(() => {});
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
 * 第三部分：遊戲核心引擎 (GAME SCRIPT)
 * -----------------------------------------------------------------------------
 */
const GameEngine = (function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const ROWS = 16, COLS = 10, SIZE = 40, MARGIN = 3;

    let state = {
        grid: [], score: 0, timeLeft: 60, gameActive: false, isDeleteMode: false, name: "",
        skillsUsed: { hint: false, shuffle: false, delete: false },
        matchLog: [] // 🛡️ 證據鏈
    };

    let input = { isDragging: false, start: { x: 0, y: 0 }, current: { x: 0, y: 0 } };
    
    // 💥 粒子特效變數 (補回)
    let particles = [];
    let animationId = null, lastTime = 0, timerAcc = 0;
    const pColors = ['#f1c40f', '#e67e22', '#e74c3c', '#3498db', '#2ecc71'];

    // 🔍 尋找可行解演算法
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

    // 🌀 狀態檢查 (死局/過關)
    function checkBoardStatus() {
        const remaining = state.grid.flat().filter(c => !c.removed);
        if (remaining.length === 0) { 
            alert("恭喜清空盤面！"); GameEngine.initGrid(); return; 
        }
        if (!findOneMove()) {
            if (!state.skillsUsed.shuffle) { 
                alert("無解！自動執行隨機打亂..."); GameEngine.useSkillShuffle(true); 
            } else { 
                alert("無解且技能用完，遊戲結束！"); GameEngine.end(); 
            }
        }
    }

    // 初始化盤面
    function initGrid() {
        const total = ROWS * COLS, nums = [];
        for (let i = 0; i < total / 2; i++) { 
            let n = Math.floor(Math.random() * 9) + 1; nums.push(n, 10 - n); 
        }
        for (let i = nums.length - 1; i > 0; i--) { 
            const j = Math.floor(Math.random() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; 
        }
        state.grid = Array.from({ length: ROWS }, (_, r) => 
            Array.from({ length: COLS }, (_, c) => ({ val: nums[r * COLS + c], removed: false, active: false, hinted: false }))
        );
    }

    // 渲染循環 (每幀呼叫)
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. 繪製格子
        state.grid.forEach((row, r) => row.forEach((cell, c) => {
            if (cell.removed) return;
            let x = c * SIZE + MARGIN, y = r * SIZE + MARGIN, s = SIZE - MARGIN * 2;
            
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

        // 💥 2. 粒子特效 (補回)
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx; p.y += p.vy; p.life--;
            
            let alpha = p.life / 60;
            if (alpha < 0) alpha = 0;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            p.vy += 0.1; // 重力
            
            if (p.life <= 0) particles.splice(i, 1);
        }
        ctx.globalAlpha = 1;

        // 3. 繪製框選
        if (input.isDragging && !state.isDeleteMode) {
            ctx.strokeStyle = '#3498db'; ctx.setLineDash([5, 3]); 
            ctx.strokeRect(input.start.x, input.start.y, input.current.x - input.start.x, input.current.y - input.start.y); 
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(52, 152, 219, 0.1)';
            ctx.fillRect(input.start.x, input.start.y, input.current.x - input.start.x, input.current.y - input.start.y);
        }
    }

    return {
        getPos: (e) => { 
            const rect = canvas.getBoundingClientRect(); 
            return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) }; 
        },
        getInternalState: () => ({ name: state.name, score: state.score, matchLog: state.matchLog }),

        start: function() {
            state.name = document.getElementById('home-player-name').value.trim();
            if (!state.name) { alert("請輸入名稱！"); return; }

            // 🛡️ 新增：前端提示 10 字限制
            if (state.name.length > 10) { 
                alert("名稱請限制在 10 個字以內！"); 
                return; 
            }

            this.stop(true);
            
            const uploadBtn = document.getElementById('upload-btn');
            if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.innerText = "上傳成績"; }

            state.score = 0; state.timeLeft = 60; state.gameActive = true; state.matchLog = [];
            document.getElementById('score').innerText = "0";
            document.getElementById('timer').innerText = "60";
            
            state.skillsUsed = { hint: false, shuffle: false, delete: false };
            document.querySelectorAll('.skill-btn').forEach(b => b.classList.remove('used', 'active'));

            initGrid(); SoundManager.playBGM(); GameSystem.showScreen('screen-game');
            lastTime = performance.now(); this.loop(lastTime);
        },

        initGrid: () => {
            const total = ROWS * COLS, nums = [];
            for (let i = 0; i < total / 2; i++) { 
                let n = Math.floor(Math.random() * 9) + 1; nums.push(n, 10 - n); 
            }
            nums.sort(() => Math.random() - 0.5);
            state.grid = Array.from({ length: ROWS }, (_, r) => 
                Array.from({ length: COLS }, (_, c) => ({ val: nums[r * COLS + c], removed: false, active: false, hinted: false }))
            );
        },

        loop: function(t) {
            if (!state.gameActive) return;
            const dt = t - lastTime; lastTime = t; timerAcc += dt;
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

        // ⚙️ 呼叫修復後的 toggleOverlay
        openSettings: () => GameSystem.toggleOverlay('screen-settings', true),
        resumeFromSettings: () => GameSystem.toggleOverlay('screen-settings', false),

        handleDown: function(pos) {
            if (!state.gameActive) return;
            if (state.isDeleteMode) {
                const c = Math.floor(pos.x / SIZE), r = Math.floor(pos.y / SIZE);
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS && !state.grid[r][c].removed) {
                    state.grid[r][c].removed = true; state.skillsUsed.delete = true; state.isDeleteMode = false;
                    document.getElementById('skill-btn-delete').classList.remove('active', 'used'); 
                    document.getElementById('skill-btn-delete').classList.add('used');
                    SoundManager.playEliminate(); this.spawnBoom(pos); checkBoardStatus();
                }
                return;
            }
            state.grid.flat().forEach(c => c.hinted = false);
            input.isDragging = true; input.start = pos; input.current = { ...pos };
        },

        // 💡 補回位移處理 (解決框選無效)
        handleMove: function(pos) {
            if (input.isDragging && !state.isDeleteMode) { input.current = pos; }
        },

        updateStates: () => {
            let x1 = Math.min(input.start.x, input.current.x), x2 = Math.max(input.start.x, input.current.x);
            let y1 = Math.min(input.start.y, input.current.y), y2 = Math.max(input.start.y, input.current.y);
            state.grid.forEach((row, r) => row.forEach((cell, c) => {
                let tx = c * SIZE, ty = r * SIZE;
                cell.active = !cell.removed && !(tx + SIZE < x1 || tx > x2 || ty + SIZE < y1 || ty > y2);
            }));
        },

        handleUp: function() {
            if (!input.isDragging) return; input.isDragging = false;
            let sel = state.grid.flat().filter(c => !c.removed && c.active);
            if (sel.reduce((s, c) => s + c.val, 0) === 10 && sel.length > 0) {
                const points = sel.length * 100;
                state.score += points; state.timeLeft += 4;
                
                // 🛡️ 紀錄證據
                state.matchLog.push({ t: Date.now(), p: points }); 
                
                document.getElementById('score').innerText = state.score;
                document.getElementById('timer').innerText = state.timeLeft;
                SoundManager.playEliminate(); this.spawnBoom(input.current);
                sel.forEach(c => c.removed = true); checkBoardStatus();
            }
            state.grid.flat().forEach(c => c.active = false);
        },

        // 💥 補回粒子生成函式
        spawnBoom: (pos) => {
            for (let i = 0; i < 20; i++) {
                const ang = Math.random() * Math.PI * 2, spd = Math.random() * 4 + 2;
                particles.push({ 
                    x: pos.x, y: pos.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, 
                    life: 30 + Math.random() * 20, size: 2 + Math.random() * 3, 
                    color: pColors[Math.floor(Math.random() * pColors.length)] 
                });
            }
        },

        // 💡 補回技能：提示
        useSkillHint: function() {
            if (!state.gameActive || state.skillsUsed.hint) return;
            const cells = findOneMove();
            if (cells) { 
                state.skillsUsed.hint = true; document.getElementById('skill-btn-hint').classList.add('used'); 
                cells.forEach(c => c.hinted = true);
                setTimeout(() => state.grid.flat().forEach(c => c.hinted = false), 10000);
            }
        },

        // 💡 補回技能：打亂
        useSkillShuffle: function(markUsed = true) {
            if (!state.gameActive || (markUsed && state.skillsUsed.shuffle)) return;
            if (markUsed) { state.skillsUsed.shuffle = true; document.getElementById('skill-btn-shuffle').classList.add('used'); }
            
            let remains = state.grid.flat().filter(c => !c.removed);
            let vals = remains.map(c => c.val);
            let attempts = 0;
            do {
                for (let i = vals.length - 1; i > 0; i--) { 
                    const j = Math.floor(Math.random() * (i + 1)); [vals[i], vals[j]] = [vals[j], vals[i]]; 
                }
                remains.forEach((c, i) => c.val = vals[i]);
                attempts++;
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
