class PacmanGame {
    constructor() {
        console.log('游戏构造函数被调用');
        this.initializeGame();
    }

    initializeGame() {
        console.log('开始初始化游戏');
        
        // 获取画布和上下文
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 设置画布大小
        this.canvas.width = 400;
        this.canvas.height = 400;
        
        // 初始化游戏状态
        this.gameStates = {
            IDLE: 'idle',
            RUNNING: 'running',
            PAUSED: 'paused',
            VICTORY: 'victory'
        };
        this.currentState = this.gameStates.IDLE;
        
        // 初始化游戏数据
        this.dots = [];
        this.initialDotsCount = 0;
        this.gridSize = 40;
        
        // 初始化吃豆人
        this.pacman = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            size: 15,
            speed: 2,
            direction: 0,
            mouthOpen: 0,
            isMoving: false
        };
        
        // 获取控制元素
        this.playButton = document.getElementById('playButton');
        this.restartButton = document.getElementById('restartButton');
        this.gameStatusElement = document.getElementById('gameStatus');
        this.progressText = document.getElementById('progressText');
        this.progressBar = document.getElementById('progressBar');
        this.speedControl = document.getElementById('speedControl');
        this.speedValue = document.getElementById('speedValue');
        this.densityControl = document.getElementById('densityControl');
        this.densityValue = document.getElementById('densityValue');
        this.voiceButton = document.getElementById('voiceButton');
        this.poseButton = document.getElementById('poseButton');
        this.colorPicker = document.getElementById('colorPicker');
        
        // 初始化颜色
        this.pacmanColor = this.colorPicker.value;
        
        // 绑定按钮事件
        this.playButton.onclick = () => this.togglePlay();
        this.restartButton.onclick = () => this.restartGame();
        this.voiceButton.onclick = () => this.toggleVoiceControl();
        this.poseButton.onclick = () => this.togglePoseControl();
        
        // 绑定控制事件
        this.speedControl.addEventListener('input', () => {
            const newSpeed = parseFloat(this.speedControl.value);
            this.pacman.speed = newSpeed;
            this.speedValue.textContent = newSpeed.toFixed(2);
            
            // 速度改变时强制对齐到网格
            if (this.pacman.isMoving) {
                this.pacman.x = this.snapToGrid(this.pacman.x);
                this.pacman.y = this.snapToGrid(this.pacman.y);
            }
        });
        
        this.densityControl.addEventListener('input', () => {
            const newDensity = parseInt(this.densityControl.value);
            this.gridSize = newDensity;
            this.densityValue.textContent = this.getDensityText(newDensity);
        });
        
        // 绑定键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // 绑定颜色选择事件
        this.colorPicker.addEventListener('input', (e) => {
            this.pacmanColor = e.target.value;
        });
        
        // 生成初始豆子
        this.generateDots();
        
        // 初始绘制
        this.draw();
        
        console.log('游戏初始化完成');
        
        // 添加控制状态
        this.controlStates = {
            KEYBOARD: 'keyboard',
            VOICE: 'voice',
            POSE: 'pose'
        };
        this.currentControlState = this.controlStates.KEYBOARD;  // 默认键盘控制
        this.updateControlStatus('按键控制');
    }

    generateDots() {
        this.dots = [];
        // 使用 gridSize 作为豆子间距
        const spacing = this.gridSize;  // 使用当前的 gridSize
        
        // 在画布范围内生成豆子
        for (let x = spacing; x < this.canvas.width - spacing; x += spacing) {
            for (let y = spacing; y < this.canvas.height - spacing; y += spacing) {
                // 添加豆子
                this.dots.push({
                    x: x,
                    y: y
                });
            }
        }
        
        this.initialDotsCount = this.dots.length;
        console.log('生成豆子数量:', this.dots.length, '间距:', spacing);
        
        // 立即绘制
        this.draw();
    }

    regenerateDots() {
        // 保存当前进度
        const currentProgress = this.dots.length / this.initialDotsCount;
        
        // 重新生成豆子
        this.generateDots();
        
        // 恢复进度（随机移除豆子）
        const dotsToRemove = Math.round(this.initialDotsCount * (1 - currentProgress));
        for (let i = 0; i < dotsToRemove; i++) {
            const randomIndex = Math.floor(Math.random() * this.dots.length);
            this.dots.splice(randomIndex, 1);
        }
        
        console.log('重新生成豆子:', {
            新间距: this.gridSize,
            总数: this.initialDotsCount,
            剩余: this.dots.length
        });
    }

    async detectPose() {
        if (!this.isPoseControlActive) return;

        try {
            const now = Date.now();
            const DETECTION_INTERVAL = 1000;  // 设置检测间隔为1秒

            if (!this.lastPoseTime || now - this.lastPoseTime >= DETECTION_INTERVAL) {
                console.log('开始姿势检测...');
                
                // 确保视频元素有正确的尺寸
                console.log('视频尺寸:', {
                    videoWidth: this.video.videoWidth,
                    videoHeight: this.video.videoHeight,
                    width: this.video.width,
                    height: this.video.height
                });

                const pose = await this.net.estimateSinglePose(this.video, {
                    flipHorizontal: true,
                    decodingMethod: 'single-person'
                });

                // 输出完整的原始数据
                console.log('原始势数据:', JSON.stringify(pose, null, 2));

                if (pose.score > 0.3) {
                    this.handlePose(pose);
                    this.drawPose(pose);
                } else {
                    console.log('姿势总体置信度不足:', pose.score);
                }
                
                this.lastPoseTime = now;
            }

            // 继续下一帧
            if (this.isPoseControlActive) {
                requestAnimationFrame(() => this.detectPose());
            }

        } catch (error) {
            console.error('姿势检测错误:', error);
            if (this.isPoseControlActive) {
                setTimeout(() => this.detectPose(), 1000);
            }
        }
    }

    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制背景
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制豆子 - 使用主角颜色的补色
        const dotColor = this.getComplementaryColor(this.pacmanColor, 0.7);  // 70%亮度
        this.ctx.fillStyle = dotColor;
        this.dots.forEach(dot => {
            this.ctx.beginPath();
            this.ctx.arc(dot.x, dot.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // 计算面部特征的位置（根据方向调整）
        const faceDirection = this.pacman.direction * Math.PI/2;
        const mouthAngle = Math.sin(this.pacman.mouthOpen) * 0.2;
        
        // 绘制主角身体
        this.ctx.fillStyle = this.pacmanColor;
        this.ctx.beginPath();
        this.ctx.arc(
            this.pacman.x,
            this.pacman.y,
            this.pacman.size,
            faceDirection + mouthAngle,
            faceDirection + Math.PI * 2 - mouthAngle
        );
        this.ctx.lineTo(this.pacman.x, this.pacman.y);
        this.ctx.fill();
        
        // 绘制耳朵（轮廓，在嘴巴相反的一侧）
        this.ctx.strokeStyle = this.pacmanColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(
            this.pacman.x + Math.cos(faceDirection + Math.PI) * this.pacman.size,
            this.pacman.y + Math.sin(faceDirection + Math.PI) * this.pacman.size,
            this.pacman.size * 0.2,
            0,
            Math.PI * 2
        );
        this.ctx.stroke();
        
        // 计算眼睛位置（在嘴巴相反的一侧，靠近嘴巴）
        const eyeDistance = this.pacman.size * 0.5;  // 调整眼睛到中心的距离（从0.65改为0.5）
        const eyeSize = this.pacman.size * 0.12;     // 眼睛大小保持不变
        
        // 计算眨眼动画（只在运动时眨眼）
        const blinkHeight = this.pacman.isMoving ? 
            Math.abs(Math.sin(this.pacman.mouthOpen * 2)) * eyeSize : // 运动时眨眼
            eyeSize;  // 静止时不眨眼
        
        // 绘制眼球轮廓（黑色）
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.ellipse(
            this.pacman.x + Math.cos(faceDirection + Math.PI) * eyeDistance,
            this.pacman.y + Math.sin(faceDirection + Math.PI) * eyeDistance,
            eyeSize,      // x半径
            blinkHeight,  // y半径（眨眼时变化）
            faceDirection,  // 旋转角度
            0,
            Math.PI * 2
        );
        this.ctx.stroke();
        
        // 填充眼球（白色）
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        
        // 绘制口红（沿嘴巴周边）
        this.ctx.strokeStyle = '#ff0066';
        this.ctx.lineWidth = 2;
        
        // 绘制上唇
        this.ctx.beginPath();
        this.ctx.arc(
            this.pacman.x,
            this.pacman.y,
            this.pacman.size,
            faceDirection + mouthAngle,
            faceDirection + Math.PI/2
        );
        this.ctx.stroke();
        
        // 绘制下唇
        this.ctx.beginPath();
        this.ctx.arc(
            this.pacman.x,
            this.pacman.y,
            this.pacman.size,
            faceDirection + Math.PI * 3/2,
            faceDirection + Math.PI * 2 - mouthAngle
        );
        this.ctx.stroke();
    }

    async togglePoseControl() {
        if (!this.isPoseControlActive) {
            await this.startPoseControl();
        } else {
            this.stopPoseControl();
        }
    }

    async startPoseControl() {
        console.log('开始姿势控制');
        try {
            // 获取摄像头权限
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                    facingMode: 'user'
                }
            });
            console.log('摄像头权限已获取');

            // 设置视频源
            this.video = document.getElementById('video');
            
            // 直接设置视频元素的尺寸
            this.video.width = 640;
            this.video.height = 480;
            
            this.video.srcObject = stream;

            // 等待视频准备
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    console.log('视频元数据已加载:', {
                        videoWidth: this.video.videoWidth,
                        videoHeight: this.video.videoHeight,
                        width: this.video.width,
                        height: this.video.height
                    });
                    resolve();
                };
            });

            await this.video.play();

            // 初始化画布 - 使用相同的尺
            this.cameraCanvas = document.getElementById('cameraCanvas');
            this.cameraCtx = this.cameraCanvas.getContext('2d');
            this.cameraCanvas.width = 640;
            this.cameraCanvas.height = 480;

            // 加载 PoseNet 模型
            if (!this.net) {
                console.log('加载 PoseNet 模型...');
                this.net = await posenet.load({
                    architecture: 'MobileNetV1',
                    outputStride: 16,
                    multiplier: 0.75,
                    quantBytes: 2
                });
                console.log('PoseNet 模型加载完成');
            }

            // 更新按钮状态
            this.isPoseControlActive = true;
            this.poseButton.textContent = ' 停止姿势控制';
            this.poseButton.classList.add('active');

            // 开始姿势检测
            this.detectPose();

        } catch (err) {
            console.error('姿势控制启动失败:', err);
            alert('请允许使用摄像头以启用姿势控制');
            this.poseButton.classList.remove('active');
            this.poseButton.textContent = '📷 姿势控制';
        }
    }

    stopPoseControl() {
        console.log('停止姿势控制');
        this.isPoseControlActive = false;
        this.poseButton.textContent = '📷 势控制';
        this.poseButton.classList.remove('active');

        // 停止视频流
        if (this.video && this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.video.srcObject = null;
        }

        // 清空画布
        if (this.cameraCtx) {
            this.cameraCtx.clearRect(0, 0, this.cameraCanvas.width, this.cameraCanvas.height);
        }
    }

    handlePose(pose) {
        // 获取关键点
        const nose = pose.keypoints.find(k => k.part === 'nose');
        const leftEye = pose.keypoints.find(k => k.part === 'leftEye');
        const rightEye = pose.keypoints.find(k => k.part === 'rightEye');

        // 首先检查是否所有关键点都存在
        if (!nose || !leftEye || !rightEye) {
            console.log('未检测到所有必要的关键点');
            return;
        }

        // 检查所有关键点的置信度
        if (nose.score > 0.7 && leftEye.score > 0.7 && rightEye.score > 0.7) {
            // 计算人脸区域和半径
            const faceArea = this.calculateFaceArea(pose);
            
            // 检查半径是否过小
            if (faceArea.radius < 50) {
                console.log('警告: 请靠近镜头游戏');
                if (!this.warningStartTime) {
                    this.warningStartTime = Date.now();
                } else if (Date.now() - this.warningStartTime > 3300) {
                    console.log('退出姿势控制');
                    this.stopPoseControl();
                    this.currentControlState = this.controlStates.KEYBOARD;
                    this.updateControlStatus('按键控制');
                    return;
                }
            } else {
                this.warningStartTime = null;  // 重置警告时间
            }

            // 计算眉心和鼻头位置
            const eyeCenterX = Math.round((leftEye.position.x + rightEye.position.x) / 2);
            const eyeCenterY = Math.round((leftEye.position.y + rightEye.position.y) / 2);
            const noseX = Math.round(nose.position.x);
            const noseY = Math.round(nose.position.y);

            // 使用动态半径判断是否在圆内
            const eyeDistance = Math.sqrt(Math.pow(eyeCenterX - 320, 2) + Math.pow(eyeCenterY - 240, 2));
            const noseDistance = Math.sqrt(Math.pow(noseX - 320, 2) + Math.pow(noseY - 240, 2));
            const currentRadius = Math.max(faceArea.radius, 50);  // 确保最小半径为50
            
            const isEyeInCircle = eyeDistance <= currentRadius;
            const isNoseInCircle = noseDistance <= currentRadius;
            const isInCenter = isEyeInCircle || isNoseInCircle;

            // 记录上一次的姿势状态
            if (!this.lastPoseState) {
                this.lastPoseState = {
                    wasInCenter: true,
                    lastDirection: null
                };
            }

            // 在姿势控制状态下才处理姿势
            if (this.currentControlState === this.controlStates.POSE && 
                this.currentState === this.gameStates.RUNNING) {

                if (isInCenter) {
                    if (!this.lastPoseState.wasInCenter) {
                        // 从圆外回到圆内，不触发动作
                        console.log('姿势控制: 回到中心位置');
                        this.lastPoseState.wasInCenter = true;
                        this.lastPoseState.lastDirection = null;
                    }
                } else if (this.lastPoseState.wasInCenter) {
                    // 从圆内移动到圆外，触发动作
                    this.lastPoseState.wasInCenter = false;

                    // 计算移动方向（使用眉位置判断）
                    const dx = eyeCenterX - 320;
                    const dy = eyeCenterY - 240;

                    // 判断主要移动方向
                    if (Math.abs(dx) > Math.abs(dy)) {
                        // 水平移动优先
                        if (dx > 0) {
                            this.pacman.direction = 2;  // 左
                            this.pacman.isMoving = true;
                            this.lastPoseState.lastDirection = 'left';
                            console.log('姿势控制: 向左移动（头部向右）');
                        } else {
                            this.pacman.direction = 0;  // 右
                            this.pacman.isMoving = true;
                            this.lastPoseState.lastDirection = 'right';
                            console.log('姿势控制: 向右移动（头部向左）');
                        }
                    } else {
                        // 垂直移动优先
                        if (dy < 0) {
                            this.pacman.direction = 3;  // 上
                            this.pacman.isMoving = true;
                            this.lastPoseState.lastDirection = 'up';
                            console.log('姿势控制: 向上移动（头起）');
                        } else {
                            this.pacman.direction = 1;  // 下
                            this.pacman.isMoving = true;
                            this.lastPoseState.lastDirection = 'down';
                            console.log('姿势控制: 向下移动（头部低下）');
                        }
                    }
                }
            }

            // 更新调试信息
            console.log('姿势状态:', {
                人脸区域: {
                    x轴投影: faceArea.xLength,
                    y轴投影: faceArea.yLength,
                    当前半径: currentRadius
                },
                眉心: {
                    位置: { x: eyeCenterX, y: eyeCenterY },
                    在圆内: isEyeInCircle
                },
                鼻头: {
                    位置: { x: noseX, y: noseY },
                    在圆内: isNoseInCircle
                },
                状态: {
                    在中心: isInCenter,
                    上次在中心: this.lastPoseState.wasInCenter,
                    当前方向: this.lastPoseState.lastDirection
                }
            });
        }
    }

    drawPose(pose) {
        if (!this.cameraCtx) return;
        
        // 清空画布
        this.cameraCtx.clearRect(0, 0, this.cameraCanvas.width, this.cameraCanvas.height);

        // 绘制摄像头画面
        this.cameraCtx.save();
        this.cameraCtx.scale(-1, 1);
        this.cameraCtx.drawImage(this.video, -this.cameraCanvas.width, 0);
        this.cameraCtx.restore();

        // 绘制坐标系
        this.drawCoordinateSystem();

        // 获取关键点
        const nose = pose.keypoints.find(k => k.part === 'nose');
        const leftEye = pose.keypoints.find(k => k.part === 'leftEye');
        const rightEye = pose.keypoints.find(k => k.part === 'rightEye');

        if (nose.score > 0.5 && leftEye.score > 0.5 && rightEye.score > 0.5) {
            // 算眉心位置
            const eyeCenterX = (leftEye.position.x + rightEye.position.x) / 2;
            const eyeCenterY = (leftEye.position.y + rightEye.position.y) / 2;

            // 绘制眉心点（黄色）
            this.drawKeypoint(
                this.cameraCanvas.width - eyeCenterX,
                eyeCenterY,
                '眉心',
                'yellow',
                8,
                true  // 显示坐标
            );

            // 绘制鼻头点（红色）
            this.drawKeypoint(
                this.cameraCanvas.width - nose.position.x,
                nose.position.y,
                '鼻头',
                'red',
                8,
                true  // 显示坐标
            );

            // 绘制连接线
            this.cameraCtx.beginPath();
            this.cameraCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.cameraCtx.lineWidth = 2;
            this.cameraCtx.moveTo(
                this.cameraCanvas.width - eyeCenterX,
                eyeCenterY
            );
            this.cameraCtx.lineTo(
                this.cameraCanvas.width - nose.position.x,
                nose.position.y
            );
            this.cameraCtx.stroke();
        }

        // 计算并绘制动态半径的中心圆
        const faceArea = this.calculateFaceArea(pose);
        const currentRadius = Math.max(faceArea.radius, 50);
        
        this.cameraCtx.beginPath();
        this.cameraCtx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        this.cameraCtx.lineWidth = 2;
        this.cameraCtx.arc(320, 240, currentRadius, 0, Math.PI * 2);
        this.cameraCtx.stroke();

        // 如半径过小，显示警告
        if (faceArea.radius < 50) {
            this.cameraCtx.fillStyle = 'red';
            this.cameraCtx.font = '20px Arial';
            this.cameraCtx.fillText('请靠近镜头游戏', 10, 30);
        }

        // 添加圆心标记
        this.cameraCtx.beginPath();
        this.cameraCtx.arc(320, 240, 3, 0, Math.PI * 2);
        this.cameraCtx.fillStyle = 'yellow';
        this.cameraCtx.fill();
    }

    // 添加绘制坐标系的方法
    drawCoordinateSystem() {
        const ctx = this.cameraCtx;
        const width = this.cameraCanvas.width;
        const height = this.cameraCanvas.height;
        const step = 50;  // 网格间距

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;

        // 绘制垂直线
        for (let x = 0; x <= width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            
            // 添加X坐标标签
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.fillText(x.toString(), x, 10);
        }

        // 绘制水平线
        for (let y = 0; y <= height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            
            // 添加Y坐标标签
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.fillText(y.toString(), 0, y);
        }

        // 绘制中心十字线
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        
        // 垂直中线
        ctx.beginPath();
        ctx.moveTo(width/2, 0);
        ctx.lineTo(width/2, height);
        ctx.stroke();
        
        // 水平中线
        ctx.beginPath();
        ctx.moveTo(0, height/2);
        ctx.lineTo(width, height/2);
        ctx.stroke();
    }

    // 改进关键点绘制方法
    drawKeypoint(x, y, label, color, size = 5, showCoords = false) {
        // 绘制点
        this.cameraCtx.beginPath();
        this.cameraCtx.arc(x, y, size, 0, 2 * Math.PI);
        this.cameraCtx.fillStyle = color;
        this.cameraCtx.fill();

        // 绘制标签和坐标
        this.cameraCtx.fillStyle = 'white';
        this.cameraCtx.font = '12px Arial';
        const text = showCoords ? 
            `${label} (${Math.round(x)}, ${Math.round(y)})` : 
            label;
        this.cameraCtx.fillText(text, x + size + 5, y);

        // 绘制十字准星
        this.cameraCtx.beginPath();
        this.cameraCtx.strokeStyle = color;
        this.cameraCtx.lineWidth = 2;
        this.cameraCtx.moveTo(x - size, y);
        this.cameraCtx.lineTo(x + size, y);
        this.cameraCtx.moveTo(x, y - size);
        this.cameraCtx.lineTo(x, y + size);
        this.cameraCtx.stroke();
    }

    togglePlay() {
        console.log('切换游戏状态', this.currentState);
        switch(this.currentState) {
            case this.gameStates.IDLE:
                this.startGame();
                break;
            case this.gameStates.RUNNING:
                this.pauseGame();
                break;
            case this.gameStates.PAUSED:
                this.resumeGame();
                break;
        }
    }

    startGame() {
        console.log('开始游戏');
        // 重置游戏状态
        this.dots = [];
        this.generateDots();
        this.initialDotsCount = this.dots.length;
        
        this.currentState = this.gameStates.RUNNING;
        this.playButton.innerHTML = '⏸ 暂停';
        this.playButton.classList.add('playing');
        this.restartButton.disabled = false;
        this.gameStatusElement.textContent = '游戏进行中';
        
        // 开始游戏循环
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
        this.gameLoop = requestAnimationFrame(() => this.update());
        
        // 设置初始速度 - 直接使用速度控制值
        this.pacman.speed = parseFloat(this.speedControl.value);
    }

    update() {
        if (this.currentState === this.gameStates.RUNNING) {
            if (this.pacman.isMoving) {
                this.movePacman();
                this.checkCollisions();
            }
            this.draw();
        }
        this.gameLoop = requestAnimationFrame(() => this.update());
    }

    movePacman() {
        if (!this.pacman.isMoving) return;
        
        let targetX = this.pacman.x;
        let targetY = this.pacman.y;
        
        // 根据方向找到最近的豆子
        const nearestDot = this.findNearestDotInDirection(
            this.pacman.x, 
            this.pacman.y, 
            this.pacman.direction
        );
        
        // 根据方向移动
        switch(this.pacman.direction) {
            case 0: // 右
                targetX += this.pacman.speed;
                targetY = this.snapToGrid(targetY, nearestDot ? nearestDot.y : null);
                break;
            case 1: // 下
                targetY += this.pacman.speed;
                targetX = this.snapToGrid(targetX, nearestDot ? nearestDot.x : null);
                break;
            case 2: // 左
                targetX -= this.pacman.speed;
                targetY = this.snapToGrid(targetY, nearestDot ? nearestDot.y : null);
                break;
            case 3: // 上
                targetY -= this.pacman.speed;
                targetX = this.snapToGrid(targetX, nearestDot ? nearestDot.x : null);
                break;
        }
        
        // 边界检查
        this.pacman.x = Math.max(this.pacman.size, Math.min(this.canvas.width - this.pacman.size, targetX));
        this.pacman.y = Math.max(this.pacman.size, Math.min(this.canvas.height - this.pacman.size, targetY));
        
        // 更新嘴巴动画
        if (this.pacman.isMoving) {
            this.pacman.mouthOpen = (this.pacman.mouthOpen + 0.2) % Math.PI;
        }
    }

    handleKeyPress(e) {
        if (this.currentControlState !== this.controlStates.KEYBOARD) return;
        
        // 阻止方向键的默认滚动行为
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }
        
        console.log('按键被按下:', e.key);
        
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (this.pacman.direction !== 3) {
                    this.pacman.direction = 3;
                    this.pacman.isMoving = true;
                } else {
                    this.pacman.isMoving = !this.pacman.isMoving;
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (this.pacman.direction !== 1) {
                    this.pacman.direction = 1;
                    this.pacman.isMoving = true;
                } else {
                    this.pacman.isMoving = !this.pacman.isMoving;
                }
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (this.pacman.direction !== 2) {
                    this.pacman.direction = 2;
                    this.pacman.isMoving = true;
                } else {
                    this.pacman.isMoving = !this.pacman.isMoving;
                }
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (this.pacman.direction !== 0) {
                    this.pacman.direction = 0;
                    this.pacman.isMoving = true;
                } else {
                    this.pacman.isMoving = !this.pacman.isMoving;
                }
                break;
            case ' ': // 空格键暂停/继续
                this.togglePlay();
                break;
        }
    }

    checkCollisions() {
        const collisionDistance = this.pacman.size + 5;
        
        // 过滤掉被吃掉的豆子
        this.dots = this.dots.filter(dot => {
            const dx = this.pacman.x - dot.x;
            const dy = this.pacman.y - dot.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            return distance >= collisionDistance;
        });
        
        // 更新进度
        this.updateProgress();
        
        // 查胜利件
        if (this.dots.length === 0) {
            this.victory();
        }
    }

    updateProgress() {
        const eatenDots = this.initialDotsCount - this.dots.length;
        const progress = (eatenDots / this.initialDotsCount * 100).toFixed(1);
        
        // 更新进度文本
        if (this.progressText) {
            this.progressText.textContent = `${progress}% (已吃${eatenDots}个/共${this.initialDotsCount}个)`;
        }
        
        // 更新进度条
        if (this.progressBar) {
            this.progressBar.style.width = `${progress}%`;
        }
    }

    victory() {
        this.currentState = this.gameStates.VICTORY;
        this.pacman.isMoving = false;
        this.gameStatusElement.textContent = '胜利！';
        this.playButton.innerHTML = '🎮 重新开始';
        this.playButton.classList.remove('playing');
    }

    pauseGame() {
        this.currentState = this.gameStates.PAUSED;
        this.pacman.isMoving = false;
        this.playButton.innerHTML = '▶ 继续';
        this.playButton.classList.remove('playing');
        this.gameStatusElement.textContent = '已暂停';
    }

    resumeGame() {
        this.currentState = this.gameStates.RUNNING;
        this.playButton.innerHTML = '⏸ 暂停';
        this.playButton.classList.add('playing');
        this.gameStatusElement.textContent = '游戏进行中';
    }

    getDensityText(density) {
        const densityMap = {
            "20": "非常密集",
            "30": "密集",
            "40": "正常",
            "50": "稀疏",
            "60": "非常稀疏"
        };
        return densityMap[density] || "正常";
    }

    toggleVoiceControl() {
        if (!this.isVoiceControlActive) {
            this.currentControlState = this.controlStates.VOICE;
            this.startVoiceControl();
            // 禁用其他控制
            if (this.isPoseControlActive) {
                this.stopPoseControl();
            }
            this.updateControlStatus('语音控制');
        } else {
            this.stopVoiceControl();
            this.currentControlState = this.controlStates.KEYBOARD;
            this.updateControlStatus('按键控制');
        }
    }

    togglePoseControl() {
        if (!this.isPoseControlActive) {
            this.currentControlState = this.controlStates.POSE;
            this.startPoseControl();
            // 禁用其他控制
            if (this.isVoiceControlActive) {
                this.stopVoiceControl();
            }
            this.updateControlStatus('姿势控制');
        } else {
            this.stopPoseControl();
            this.currentControlState = this.controlStates.KEYBOARD;
            this.updateControlStatus('按键控制');
        }
    }

    restartGame() {
        console.log('重新开始游戏');
        // 重置游戏状态
        this.dots = [];
        this.pacman = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            size: 15,
            speed: parseFloat(this.speedControl.value),
            direction: 0,
            mouthOpen: 0,
            isMoving: false,
            color: this.colorPicker.value  // 使用当前选择的颜色
        };
        
        // 开始新游戏
        this.startGame();
    }

    // 添加控制状态显示方法
    updateControlStatus(status) {
        if (this.gameStatusElement) {
            this.gameStatusElement.textContent = `${this.currentState} (${status})`;
        }
    }

    async startVoiceControl() {
        console.log('开始语音控制');
        try {
            // 先请求麦克风权限
            await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('麦克风权限已获');
            
            // 如果没有初始化语音识别，先初始化
            if (!this.recognition) {
                this.initSpeechRecognition();
            }
            
            // 启动语音识别
            this.isVoiceControlActive = true;
            this.voiceButton.textContent = '🎤 正在听...';
            this.voiceButton.classList.add('active');
            this.recognition.start();
            this.addVoiceHistory('语音控制已启动');
            
        } catch (err) {
            console.error('麦克风权限获取失败:', err);
            alert('请允许使用麦克风以启用语音控制');
            this.voiceButton.classList.remove('active');
            this.voiceButton.textContent = '🎤 语音控制';
        }
    }

    stopVoiceControl() {
        console.log('停止语音控制');
        this.isVoiceControlActive = false;
        this.voiceButton.textContent = '🎤 语音控制';
        this.voiceButton.classList.remove('active');
        
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window)) {
            console.log('浏览器不支持语音识别');
            this.voiceButton.style.display = 'none';
            return;
        }

        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;  // 只获取最终结果
        this.recognition.lang = 'zh-CN';

        // 获取语音历史元素
        this.voiceHistory = document.getElementById('voiceHistory');

        this.recognition.onstart = () => {
            console.log('语音识别已启动');
            this.voiceButton.textContent = '🎤 正在听...';
            this.voiceButton.classList.add('active');
            this.addVoiceHistory('正在听...');
        };

        this.recognition.onend = () => {
            console.log('语音识别已束');
            if (this.isVoiceControlActive) {
                console.log('重新启动语音识别');
                setTimeout(() => {
                    this.recognition.start();
                }, 100);
            } else {
                this.voiceButton.textContent = '🎤 语音控制';
                this.voiceButton.classList.remove('active');
                this.addVoiceHistory('语音识别已停止');
            }
        };

        this.recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            if (result.isFinal) {
                const command = result[0].transcript.trim().toLowerCase();
                console.log('识别到命令:', command);
                this.addVoiceHistory(`识别: ${command}`);

                // 处理命令
                if (command.includes('开始') || command.includes('开始游戏')) {
                    console.log('执行开始命令');
                    this.startGame();
                    this.addVoiceHistory('执行: 开始游戏');
                } 
                else if (command.includes('暂停')) {
                    console.log('执行暂停命令');
                    this.pauseGame();
                    this.addVoiceHistory('执行: 暂停游戏');
                } 
                else if (command.includes('继续')) {
                    console.log('执行继续命令');
                    this.resumeGame();
                    this.addVoiceHistory('执行: 继续游戏');
                }
                else if (command.includes('停')) {
                    console.log('执行停止移动命令');
                    this.pacman.isMoving = false;
                    this.addVoiceHistory('执行: 停止移动');
                }
                else if (this.currentState === this.gameStates.RUNNING) {
                    // 方向控制
                    if (command.includes('上')) {
                        console.log('向上移动');
                        this.pacman.direction = 3;
                        this.pacman.isMoving = true;
                        this.addVoiceHistory('执行: 向上移动');
                    } 
                    else if (command.includes('下')) {
                        console.log('向下移动');
                        this.pacman.direction = 1;
                        this.pacman.isMoving = true;
                        this.addVoiceHistory('执行: 向下移动');
                    } 
                    else if (command.includes('左')) {
                        console.log('向左移动');
                        this.pacman.direction = 2;
                        this.pacman.isMoving = true;
                        this.addVoiceHistory('执行: 向左移动');
                    } 
                    else if (command.includes('右')) {
                        console.log('向右移动');
                        this.pacman.direction = 0;
                        this.pacman.isMoving = true;
                        this.addVoiceHistory('执行: 向右移动');
                    }
                }
            }
        };

        this.recognition.onerror = (event) => {
            console.error('语音识别错误:', event.error);
            this.addVoiceHistory(`错误: ${event.error}`);
            
            if (event.error === 'network') {
                // 网络错误时自动重试
                setTimeout(() => {
                    if (this.isVoiceControlActive) {
                        console.log('尝试重新连接...');
                        this.recognition.start();
                    }
                }, 1000);
            }
        };
    }

    addVoiceHistory(text) {
        if (this.voiceHistory) {
            const time = new Date().toLocaleTimeString();
            const newEntry = `[${time}] ${text}\n`;
            this.voiceHistory.value = newEntry + this.voiceHistory.value;
            
            // 限制历史记录长度
            const maxLines = 5;
            const lines = this.voiceHistory.value.split('\n');
            if (lines.length > maxLines) {
                this.voiceHistory.value = lines.slice(0, maxLines).join('\n');
            }
        }
    }

    calculateFaceArea(pose) {
        // 获取所有面部关键点
        const facePoints = pose.keypoints.filter(point => 
            ['nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar'].includes(point.part)
        );

        // 计算x轴和y轴的投影
        const xCoords = facePoints.map(p => p.position.x);
        const yCoords = facePoints.map(p => p.position.y);
        
        // 计算投影长度
        const xLength = Math.max(...xCoords) - Math.min(...xCoords);
        const yLength = Math.max(...yCoords) - Math.min(...yCoords);
        
        // 计算半径（两个投影长度之和的1/4）
        const radius = (xLength + yLength) / 4;
        
        return {
            radius,
            xLength,
            yLength
        };
    }

    // 修改网格对齐方法
    snapToGrid(value, targetValue) {
        const spacing = this.gridSize;
        const offset = spacing / 2;  // 豆子在网格中心
        
        // 如果有目标值，使用目标值；否则使用最近的网格点
        const snapped = targetValue || Math.round((value - offset) / spacing) * spacing + offset;
        
        // 如果已经非常接近目标点，直接对齐
        if (Math.abs(value - snapped) < 1) {
            return snapped;
        }
        
        // 计算抛物线轨迹
        const distance = Math.abs(snapped - value);
        const direction = Math.sign(snapped - value);
        const speed = this.pacman.speed;
        
        // 使用二次函数实现平滑过渡
        const step = Math.min(
            speed * (1 + (distance / spacing) * 0.5),  // 距离越远，速度越快
            distance  // 但不超过剩余距离
        );
        
        return value + direction * step;
    }

    // 添加寻找最近豆子的方法
    findNearestDotInDirection(x, y, direction) {
        let nearestDot = null;
        let minDistance = Infinity;
        
        // 根据方向筛选豆子
        this.dots.forEach(dot => {
            let isInDirection = false;
            switch(direction) {
                case 0: // 右
                    isInDirection = dot.x > x && Math.abs(dot.y - y) < this.gridSize/2;
                    break;
                case 1: // 下
                    isInDirection = dot.y > y && Math.abs(dot.x - x) < this.gridSize/2;
                    break;
                case 2: // 左
                    isInDirection = dot.x < x && Math.abs(dot.y - y) < this.gridSize/2;
                    break;
                case 3: // 上
                    isInDirection = dot.y < y && Math.abs(dot.x - x) < this.gridSize/2;
                    break;
            }
            
            if (isInDirection) {
                const distance = Math.sqrt(Math.pow(x - dot.x, 2) + Math.pow(y - dot.y, 2));
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestDot = dot;
                }
            }
        });
        
        return nearestDot;
    }

    // 添加颜色处理方法
    getComplementaryColor(color, brightness = 1) {
        // 将颜色转换为RGB
        const r = parseInt(color.substr(1,2), 16);
        const g = parseInt(color.substr(3,2), 16);
        const b = parseInt(color.substr(5,2), 16);
        
        // 计算补色
        const rComp = Math.round((255 - r) * brightness);
        const gComp = Math.round((255 - g) * brightness);
        const bComp = Math.round((255 - b) * brightness);
        
        // 转回十六进制
        return `#${rComp.toString(16).padStart(2,'0')}${gComp.toString(16).padStart(2,'0')}${bComp.toString(16).padStart(2,'0')}`;
    }

    adjustColor(color, percent) {
        // 将颜色转换为RGB
        const r = parseInt(color.substr(1,2), 16);
        const g = parseInt(color.substr(3,2), 16);
        const b = parseInt(color.substr(5,2), 16);
        
        // 调整亮度
        const factor = 1 + percent/100;
        const rNew = Math.min(255, Math.max(0, Math.round(r * factor)));
        const gNew = Math.min(255, Math.max(0, Math.round(g * factor)));
        const bNew = Math.min(255, Math.max(0, Math.round(b * factor)));
        
        // 转回十六进制
        return `#${rNew.toString(16).padStart(2,'0')}${gNew.toString(16).padStart(2,'0')}${bNew.toString(16).padStart(2,'0')}`;
    }
}

// 创建游戏实例
window.addEventListener('load', () => {
    window.game = new PacmanGame();
}); 