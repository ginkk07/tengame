/**
 * =============================================================================
 * 圈十遊戲 (Make 10) - 核心邏輯腳本
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
    
    let bgmVolume = parseFloat(localStorage.getItem('bgm_vol')) || 0.5;
    let sfxVolume = parseFloat(localStorage.getItem('sfx_vol')) || 0.5;

    let currentBGM = null;
    const sfxPool = [];
    const POOL_SIZE = 5;

    return {
        init: function() {
            for (let i = 0; i < POOL_SIZE; i++) {
                const audio = new Audio(SFX_EXP);
                audio.volume = sfxVolume;
                sfxPool.push(audio);
            }
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

    async function getSignature(name, score, ts) {
        const msg = name + "|" + score + "|" + ts + "|" + SECRET_SALT;
        const encoder = new TextEncoder();
        const data = encoder.encode(msg);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    return {
        showScreen: (id) => {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            
            document.querySelectorAll('.overlay-screen').forEach(s => s.classList.remove('active'));
            document.getElementById('overlay-bg').classList.remove('active');
            document.getElementById('screen-game').classList.remove('blurred');
        },

        toggleSettings: (show) => {
            const settings = document.getElementById('screen-settings');
            const bg = document.getElementById('overlay-bg');
            const gameScreen = document.getElementById('screen-game');
            
            if (show) { 
                settings.classList.add('active'); 
                bg.classList.add('active'); 
                gameScreen.classList.add('blurred');
            } else { 
                settings.classList.remove('active'); 
                bg.classList.remove('active'); 
                gameScreen.classList.remove('blurred');
            }
        },

        openResultOverlay: () => {
            const result = document.getElementById('screen-result');
            const bg = document.getElementById('overlay-bg');
            const gameScreen = document.getElementById('screen-game');
            
            result.classList.add('active');
            bg.classList.add('active');
            gameScreen.classList.add('blurred');
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
                let medal = i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : "";
                return `<tr><td>${medal}${i + 1}</td><td>${r.name || '-'}</td><td style="font-weight:bold">${r.score || 0}</td></tr>`;
            }).join('');
        },
        uploadScore: async function() {
            const b = document.getElementById('upload-btn');
            const internal = GameEngine.getInternalState(); 
            if (internal.isTestUsed) return;
            b.disabled = true; b.innerText = "驗證中...";
            const ts = Date.now();
            const sign = await getSignature(internal.name, internal.score, ts);
            try {
                const resp = await fetch(GAS_URL, { 
                    method: "POST", 
                    body: JSON.stringify({ name: internal.name, score: internal.score, timestamp: ts, sign: sign, audit_skills: internal.skillsUsed }) 
                });
                const result = await resp.json();
                if (result.status === "error") { alert("失敗：" + result.message); b.disabled = false; b.innerText = "重試"; return; }
                localStorage.setItem('math_game_rank', JSON.stringify(result));
                alert("🎉 上傳成功！"); this.showLeaderboard();
            } catch (e) { alert("網路錯誤"); b.disabled = false; b.innerText = "重試"; }
        },
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
 */
const GameEngine = (function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const ROWS = 16, COLS = 10, GRID_SIZE = 40, MARGIN = 3;

    let state = {
        grid: [], score: 0, timeLeft: 60,
        gameActive: false, isDeleteMode: false, isTestUsed: false,
        name: "", skillsUsed: { hint: false, shuffle: false, delete: false }
    };

    let input = { isDragging: false, start: { x: 0, y: 0 }, current: { x: 0, y: 0 } };
    let particles = [], animationId = null, lastTime = 0, timerAcc = 0;
    const pColors = ['#f1c40f', '#e67e22', '#e74c3c', '#3498db', '#2ecc71'];

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

    function checkBoardStatus() {
        const remaining = state.grid.flat().filter(c => !c.removed);
        if (remaining.length === 0) { alert("恭喜清空盤面！"); initGrid(); return; }
        if (!findOneMove()) {
            if (!state.skillsUsed.shuffle) { alert("無解！自動打亂..."); GameEngine.useSkillShuffle(true); }
            else { alert("無解且技能用完，結束！"); GameEngine.end(); }
        }
    }

    function initGrid() {
        const total = ROWS * COLS, nums = [];
        for (let i = 0; i < total / 2; i++) { let n = Math.floor(Math.random() * 9) + 1; nums.push(n, 10 - n); }
        for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
        state.grid = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => ({ val: nums[r * COLS + c], removed: false, active: false, hinted: false })));
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        state.grid.forEach((row, r) => row.forEach((cell, c) => {
            if (cell.removed) return;
            let x = c * GRID_SIZE + MARGIN, y = r * GRID_SIZE + MARGIN, s = GRID_SIZE - MARGIN * 2;
            ctx.beginPath(); ctx.roundRect(x, y, s, s, 6);
            if (state.isDeleteMode) ctx.fillStyle = cell.active ? '#ff7675' : '#fab1a0';
            else if (cell.active) ctx.fillStyle = '#ffbe76';
            else if (cell.hinted) ctx.fillStyle = '#b8e994';
            else ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = (cell.active || cell.hinted) ? '#e67e22' : '#f1f3f5'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = (cell.active || cell.hinted) ? '#fff' : '#2c3e50'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(cell.val, x + s/2, y + s/2);
        }));
        particles.forEach((p, i) => { p.x += p.vx; p.y += p.vy; p.life--; ctx.globalAlpha = p.life / 60; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); p.vy += 0.1; if (p.life <= 0) particles.splice(i, 1); });
        ctx.globalAlpha = 1;
        if (input.isDragging && !state.isDeleteMode) {
            ctx.strokeStyle = '#3498db'; ctx.setLineDash([5, 3]); ctx.strokeRect(input.start.x, input.start.y, input.current.x - input.start.x, input.current.y - input.start.y); ctx.setLineDash([]); ctx.fillStyle = 'rgba(52, 152, 219, 0.1)'; ctx.fillRect(input.start.x, input.start.y, input.current.x - input.start.x, input.current.y - input.start.y);
        }
    }

    return {
        getPos: (e) => { const rect = canvas.getBoundingClientRect(); return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) }; },
        getInternalState: () => ({ name: state.name, score: state.score, skillsUsed: state.skillsUsed, isTestUsed: state.isTestUsed }),
        
        start: function() {
            const inputName = document.getElementById('home-player-name').value.trim();
            if (!inputName) { alert("請輸入名稱！"); return; }
            this.stop(true); 
            
            const uploadBtn = document.getElementById('upload-btn');
            if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.innerText = "上傳成績"; }

            // 初始化狀態
            state.name = inputName; 
            state.score = 0; 
            state.timeLeft = 60; 
            state.gameActive = true; 
            
            // 💡 修正：立即將畫面上的分數與時間歸零，避免看到上一局的殘留
            document.getElementById('score').innerText = "0";
            document.getElementById('timer').innerText = "60";

            state.skillsUsed = { hint: false, shuffle: false, delete: false };
            document.querySelectorAll('.skill-btn').forEach(b => b.classList.remove('used', 'active'));
            localStorage.setItem('savedPlayerName', state.name); 
            
            GameSystem.showScreen('screen-game');
            initGrid(); lastTime = performance.now(); timerAcc = 0; SoundManager.playBGM(); this.loop(lastTime);
        },

        stop: function(stopMusic = true) { 
            state.gameActive = false; 
            if(animationId) { cancelAnimationFrame(animationId); animationId = null; }
            if (stopMusic) SoundManager.stopBGM(); 
        },

        openSettings: function() { GameSystem.toggleSettings(true); },
        resumeFromSettings: function() { GameSystem.toggleSettings(false); },
        
        backToHome: function() { 
            this.stop(true); 
            GameSystem.showScreen('screen-home'); 
        },

        loop: function(t) {
            if (!state.gameActive) return;
            const dt = t - lastTime; lastTime = t; timerAcc += dt;
            if (timerAcc >= 1000) { state.timeLeft--; document.getElementById('timer').innerText = state.timeLeft; timerAcc -= 1000; if (state.timeLeft <= 0) this.end(); }
            if (input.isDragging && !state.isDeleteMode) this.updateStates();
            render(); animationId = requestAnimationFrame((ts) => this.loop(ts));
        },
        updateStates: () => {
            let x1 = Math.min(input.start.x, input.current.x), x2 = Math.max(input.start.x, input.current.x), y1 = Math.min(input.start.y, input.current.y), y2 = Math.max(input.start.y, input.current.y);
            state.grid.forEach((row, r) => row.forEach((cell, c) => { let tx1 = c * GRID_SIZE, tx2 = (c+1) * GRID_SIZE, ty1 = r * GRID_SIZE, ty2 = (r+1) * GRID_SIZE; cell.active = !cell.removed && !(tx2 < x1 || tx1 > x2 || ty2 < y1 || ty1 > y2); }));
        },
        handleDown: function(pos) {
            if (!state.gameActive) return;
            if (state.isDeleteMode) {
                const c = Math.floor(pos.x / GRID_SIZE), r = Math.floor(pos.y / GRID_SIZE);
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS && !state.grid[r][c].removed) {
                    state.grid[r][c].removed = true; state.skillsUsed.delete = true; state.isDeleteMode = false;
                    document.getElementById('skill-btn-delete').classList.remove('active', 'used'); document.getElementById('skill-btn-delete').classList.add('used');
                    SoundManager.playEliminate(); this.spawnBoom(pos); checkBoardStatus();
                }
                return;
            }
            state.grid.flat().forEach(c => c.hinted = false); input.isDragging = true; input.start = pos; input.current = { ...pos };
        },
        handleMove: function(pos) {
            if (input.isDragging && !state.isDeleteMode) { input.current = pos; }
        },
        handleUp: function() {
            if (!input.isDragging) return; input.isDragging = false;
            let sel = state.grid.flat().filter(c => !c.removed && c.active);
            if (sel.reduce((s, c) => s + c.val, 0) === 10 && sel.length > 0) {
                state.timeLeft += 4; state.score += sel.length * 100; 
                
                // 立即更新畫面數據
                document.getElementById('score').innerText = state.score;
                document.getElementById('timer').innerText = state.timeLeft;

                SoundManager.playEliminate(); this.spawnBoom(input.current);
                sel.forEach(c => c.removed = true); checkBoardStatus();
            }
            state.grid.flat().forEach(c => c.active = false);
        },
        spawnBoom: (pos) => { for (let i = 0; i < 20; i++) { const ang = Math.random() * Math.PI * 2, spd = Math.random() * 4 + 2; particles.push({ x: pos.x, y: pos.y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, life: 30+Math.random()*20, size: 2+Math.random()*3, color: pColors[Math.floor(Math.random()*pColors.length)] }); } },
        useSkillHint: function() {
            if (!state.gameActive || state.skillsUsed.hint) return;
            const cells = findOneMove();
            if (cells) { state.skillsUsed.hint = true; document.getElementById('skill-btn-hint').classList.add('used'); cells.forEach(c => c.hinted = true); setTimeout(() => state.grid.flat().forEach(c => c.hinted = false), 10000); }
        },
        useSkillShuffle: function(markUsed = true) {
            if (!state.gameActive || (markUsed && state.skillsUsed.shuffle)) return;
            if (markUsed) { state.skillsUsed.shuffle = true; document.getElementById('skill-btn-shuffle').classList.add('used'); }
            let remains = state.grid.flat().filter(c => !c.removed);
            let vals = remains.map(c => c.val);
            let attempts = 0; const MAX_ATTEMPTS = 20;
            do {
                for (let i = vals.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [vals[i], vals[j]] = [vals[j], vals[i]]; }
                remains.forEach((c, i) => c.val = vals[i]);
                attempts++;
            } while (!findOneMove() && attempts < MAX_ATTEMPTS);
        },
        toggleDeleteMode: function() { if(!state.skillsUsed.delete) { state.isDeleteMode = !state.isDeleteMode; document.getElementById('skill-btn-delete').classList.toggle('active'); } },
        end: function() { 
            this.stop(false); 
            GameSystem.toggleSettings(false); 
            document.getElementById('final-result-score').innerText = state.score; 
            document.getElementById('result-player-display').innerText = `Player: ${state.name}`; 
            
            const uploadBtn = document.getElementById('upload-btn');
            if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.innerText = "上傳成績"; }
            
            GameSystem.openResultOverlay(); 
        }
    };
})();

window.addEventListener('load', () => {
    SoundManager.init(); 
    GameSystem.initNamePersistence(); 
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); GameEngine.handleDown(GameEngine.getPos(e)); });
        window.addEventListener('pointermove', (e) => GameEngine.handleMove(GameEngine.getPos(e)));
        window.addEventListener('pointerup', (e) => { canvas.releasePointerCapture(e.pointerId); GameEngine.handleUp(); });
    }
    document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
});

