// js/script.js
class Game {
    constructor() {
        this.soundFiles = {
            right: ['lk.mp3','smsyn.mp3', 'zslk.mp3'],
            wrong: ['ai.mp3', 'wc.mp3', 'wl.mp3', 'zj.mp3']
        };

        // 绑定所有 DOM 元素
        this.gameTime = document.getElementById('gameTime');
        this.gameBoard = document.getElementById('gameBoard');
        this.startBtn = document.getElementById('startBtn');
        this.currentScore = document.getElementById('currentScore');
        this.timeLeft = document.getElementById('timeLeft');
        this.gameMode = document.getElementById('gameMode');
        this.targetScore = document.getElementById('targetScore');
        this.timeLabel = document.getElementById('timeLabel');
        this.initAudioButton = document.getElementById('initAudioButton');

        this.state = {
            active: false,
            score: 0,
            currentBlock: null,
            timer: null,
            startTime: 0,
            audioEnabled: false,
            audioContext: null
        };

        this.init();
    }

    init() {
        this.createBlocks();
        this.bindEvents();
        this.initAudio();
        this.initAudioButton.addEventListener('click', () => this.handleInitAudioButtonClick());
    }

    initAudioContext() {
        try {
            if (!this.state.audioContext) {
                this.state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            const buffer = this.state.audioContext.createBuffer(1, 1, 22050);
            const source = this.state.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.state.audioContext.destination);
            source.start(0);
            this.state.audioEnabled = true;
            console.log('音频上下文初始化成功');
        } catch (err) {
            console.error('音频初始化失败:', err);
            alert('请允许音频播放！点击页面后重试。');
        }
    }

    createBlocks() {
        this.gameBoard.innerHTML = Array(16)
           .fill()
           .map(() => '<div class="game-block"></div>')
           .join('');
    }

    bindEvents() {
        // 桌面端点击事件
        this.gameBoard.addEventListener('click', (e) => {
            const block = e.target.closest('.game-block');
            if (block && this.state.active) this.handleClick(block);
        });

        // 移动端触摸事件
        this.gameBoard.addEventListener('touchstart', (e) => {
            const block = e.target.closest('.game-block');
            if (block && this.state.active) {
                e.preventDefault();
                this.handleClick(block);
            }
        });

        this.startBtn.addEventListener('click', () => this.startGame());
    }

    initAudio() {
        document.addEventListener('click', () => {
            if (!this.state.audioEnabled) {
                this.initAudioContext();
            }
        }, {
            once: true
        });
    }

    startGame() {
        if (this.state.active) return;
        // 验证输入
        const gameTime = parseInt(this.gameTime.value);
        const targetScore = parseInt(this.targetScore.value);
        if (isNaN(gameTime) || gameTime < 30 || isNaN(targetScore) || targetScore < 10) {
            alert('请输入有效数值（时间≥30秒，目标分≥10分）');
            return;
        }
        this.startBtn.disabled = true;
        // 初始化状态
        this.state.active = true;
        this.state.score = 0;
        this.state.startTime = Date.now();
        this.currentScore.textContent = '0';
        // 设置模式显示
        if (this.gameMode.value ==='score') {
            this.timeLabel.textContent = '已用时间：';
            this.timeLeft.textContent = '0';
        } else {
            this.timeLabel.textContent = '剩余时间：';
            this.timeLeft.textContent = gameTime;
        }
        // 启动计时器
        this.startTimer(gameTime);
        this.generateNewBlock();
        if (!this.state.audioEnabled) {
            this.initAudioContext();
        }
    }

    startTimer(initialTime) {
        if (this.state.timer) clearInterval(this.state.timer);

        this.state.timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.state.startTime) / 1000);

            if (this.gameMode.value === 'time') {
                const remaining = initialTime - elapsed;
                this.timeLeft.textContent = remaining;
                if (remaining <= 0) this.gameOver(true);
            } else {
                this.timeLeft.textContent = elapsed;
                if (this.state.score >= parseInt(this.targetScore.value)) {
                    this.gameOver(true);
                }
            }
        }, 1000);
    }

    handleClick(block) {
        if (!this.state.active) return;

        if (block.classList.contains('target')) {
            this.handleCorrect(block);
        } else {
            this.handleWrong(block);
        }
    }

    handleCorrect(block) {
        this.playSound('right');
        this.state.score++;
        this.currentScore.textContent = this.state.score;
        block.classList.add('clicked');

        // 检查得分模式胜利条件
        if (this.gameMode.value ==='score' &&
            this.state.score >= parseInt(this.targetScore.value)) {
            this.gameOver(true);
            return;
        }

        setTimeout(() => {
            block.classList.remove('clicked');
            this.generateNewBlock();
        }, 400);
    }

    handleWrong(block) {
        this.playSound('wrong');
        block.classList.add('error-effect');
        setTimeout(() => {
            block.classList.remove('error-effect');
            this.gameOver(false);
        }, 300);
    }

    playSound(type) {
        if (!this.state.audioEnabled) return;

        const files = this.soundFiles[type];
        const file = files[Math.floor(Math.random() * files.length)];
        const audio = new Audio(`js/sound/${type}/${file}`);

        audio.play()
           .then(() => {
                // 播放成功
            })
           .catch(err => {
                console.error('音效播放失败:', err);
                document.addEventListener('click', () => {
                    audio.play().catch(() => console.error('再次播放失败'));
                }, {
                    once: true
                });
            });
    }

    generateNewBlock() {
        // 清理旧目标
        if (this.state.currentBlock) {
            this.state.currentBlock.classList.remove('target');
        }

        // 获取可用区块（未被点击的）
        const availableBlocks = Array.from(this.gameBoard.children)
           .filter(b =>!b.classList.contains('clicked'));

        if (availableBlocks.length === 0) {
            this.gameOver(false);
            return;
        }

        // 随机选择新目标
        this.state.currentBlock = availableBlocks[
            Math.floor(Math.random() * availableBlocks.length)
        ];
        this.state.currentBlock.classList.add('target');
    }

    gameOver(success) {
        clearInterval(this.state.timer);
        this.state.active = false;
        this.startBtn.disabled = false;

        // 计算用时
        const timeUsed = Math.floor((Date.now() - this.state.startTime) / 1000);

        // 构建结果信息
        let message = '';
        if (this.gameMode.value ==='score' && success) {
            message = `🎉 达成目标！用时：${timeUsed}秒`;
        } else if (this.gameMode.value === 'time') {
            message = `💥 游戏结束！得分：${this.state.score}`;
        } else {
            message = `💥 游戏结束！得分：${this.state.score}`;
        }

        alert(message);

        // 重置游戏状态
        this.state.score = 0;
        this.state.currentBlock = null;
        this.state.startTime = 0;
        this.currentScore.textContent = '0';
        this.timeLeft.textContent = this.gameMode.value === 'time'? '60' : '0';
        this.timeLabel.textContent = '剩余时间：';

        // 重置游戏板
        Array.from(this.gameBoard.children).forEach(block => {
            block.className = 'game-block';
        });
    }

    handleInitAudioButtonClick() {
        if (this.state.audioEnabled) {
            alert('音频已启用，无需重复初始化');
            return;
        }
        this.initAudioContext();
    }
}

// 初始化游戏
window.addEventListener('DOMContentLoaded', () => new Game());    