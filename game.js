const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const backButton = document.getElementById('backButton');
const stageSelect = document.getElementById('stageSelect');
const touchControls = document.getElementById('touchControls');

// 모바일 체크
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// 게임 상태
let gameOver = false;
let gameStarted = false;
let startTime = 0;
let survivalTime = 0;
let currentStage = '';

// 게임 캐릭터 설정
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 60,
    speed: 5,
    direction: 0 // 0: 오른쪽, 1: 왼쪽, 2: 위, 3: 아래
};

// 빌런 이미지 배열
let villainImages = [];

// 빌런 캐릭터들 설정
const villains = Array(10).fill(null).map(() => ({
    x: Math.random() * (canvas.width - 60),
    y: Math.random() * (canvas.height - 60),
    size: 60,
    speed: 1.5 + Math.random() * 2,
    direction: Math.random() * Math.PI * 2,
    imageIndex: 0 // 사용할 이미지 인덱스
}));

// 스테이지별 이미지 경로
const stageAssets = {
    sojeong: {
        background: './stage_sojeong/bg.png',
        player: './stage_sojeong/player.png'
    },
    mom: {
        background: './stage_mom/bg.png',
        player: './stage_mom/player.png'
    }
};

// 이미지 객체들
const images = {
    player: new Image(),
    background: new Image()
};

// 키보드 입력 상태
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false
};

// 키보드 이벤트 리스너
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
    
    // 스페이스 키 처리
    if (e.code === 'Space') {
        e.preventDefault();
        if (!gameStarted) {
            startGame();
        } else if (gameOver) {
            restartGame();
        }
    }
    
    // ESC 키로 홈으로 돌아가기 (게임 오버 상태일 때만)
    if (e.code === 'Escape' && gameOver) {
        goToHome();
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// 플레이어 이동 함수
function movePlayer() {
    if (gameOver) return;
    
    if (keys.ArrowLeft && player.x > 0) {
        player.x -= player.speed;
        player.direction = 1;
    }
    if (keys.ArrowRight && player.x < canvas.width - player.size) {
        player.x += player.speed;
        player.direction = 0;
    }
    if (keys.ArrowUp && player.y > 0) {
        player.y -= player.speed;
        player.direction = 2;
    }
    if (keys.ArrowDown && player.y < canvas.height - player.size) {
        player.y += player.speed;
        player.direction = 3;
    }
}

// 빌런 이동 함수
function moveVillains() {
    if (gameOver) return;

    villains.forEach(villain => {
        // 랜덤하게 방향 변경 (3% 확률)
        if (Math.random() < 0.03) {
            villain.direction = Math.random() * Math.PI * 2;
        }

        // 현재 방향으로 이동
        villain.x += Math.cos(villain.direction) * villain.speed;
        villain.y += Math.sin(villain.direction) * villain.speed;

        // 경계 충돌 처리
        if (villain.x < 0 || villain.x > canvas.width - villain.size) {
            villain.direction = Math.PI - villain.direction;
            villain.x = Math.max(0, Math.min(canvas.width - villain.size, villain.x));
        }
        if (villain.y < 0 || villain.y > canvas.height - villain.size) {
            villain.direction = -villain.direction;
            villain.y = Math.max(0, Math.min(canvas.height - villain.size, villain.y));
        }
    });
}

// 안전 거리 계산 함수
function getRandomPositionAwayFromPlayer() {
    const minDistance = 200; // 플레이어로부터의 최소 거리
    let x, y, distance;
    
    do {
        x = Math.random() * (canvas.width - 60);
        y = Math.random() * (canvas.height - 60);
        
        // 플레이어와의 거리 계산
        const dx = x - player.x;
        const dy = y - player.y;
        distance = Math.sqrt(dx * dx + dy * dy);
    } while (distance < minDistance); // 최소 거리보다 가까우면 다시 생성
    
    return { x, y };
}

// 빌런 이미지 로드 함수
function loadVillainImages(stage) {
    villainImages = []; // 기존 이미지 배열 초기화
    const possibleImages = ['villain.png', 'villain1.png', 'villain2.png'];
    
    // 각 가능한 이미지에 대해 로드 시도
    possibleImages.forEach(filename => {
        const img = new Image();
        img.onload = () => {
            villainImages.push(img); // 성공적으로 로드된 이미지만 배열에 추가
            
            // 이미지가 하나 이상 로드되었을 때 빌런 이미지 할당
            if (villainImages.length >= 1) {
                distributeVillainImages();
            }
        };
        img.src = `./stage_${stage}/${filename}`;
    });
}

// 빌런 이미지 균등 분배 함수
function distributeVillainImages() {
    const totalVillains = villains.length; // 10
    const imageCount = villainImages.length;
    
    if (imageCount === 1) {
        // 이미지가 하나면 모든 빌런이 같은 이미지 사용
        villains.forEach(villain => {
            villain.imageIndex = 0;
        });
    } else {
        // 이미지가 여러 개일 경우 균등하게 분배
        const villainsPerImage = Math.floor(totalVillains / imageCount);
        const remainder = totalVillains % imageCount;
        
        let currentIndex = 0;
        let assignedCount = 0;
        
        // 각 이미지 타입별로 빌런 할당
        for (let imageIndex = 0; imageIndex < imageCount; imageIndex++) {
            // 이 이미지 타입에 할당할 빌런 수 계산
            let villainsForThisImage = villainsPerImage;
            if (imageIndex < remainder) {
                villainsForThisImage++; // 나머지 빌런들을 앞쪽 이미지들에 하나씩 추가
            }
            
            // 계산된 수만큼 현재 이미지 타입 할당
            for (let i = 0; i < villainsForThisImage && assignedCount < totalVillains; i++) {
                villains[currentIndex].imageIndex = imageIndex;
                currentIndex++;
                assignedCount++;
            }
        }
        
        // 빌런 배열을 섞어서 같은 이미지를 가진 빌런들이 몰려있지 않게 함
        for (let i = villains.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            // 위치만 교환하고 이미지 인덱스는 유지
            const tempX = villains[i].x;
            const tempY = villains[i].y;
            villains[i].x = villains[j].x;
            villains[i].y = villains[j].y;
            villains[j].x = tempX;
            villains[j].y = tempY;
        }
    }
}

// 스테이지 선택 함수
function selectStage(stage) {
    currentStage = stage;
    stageSelect.style.display = 'none';
    
    // 이미지 로드 시작
    let loadedCount = 0;
    const requiredImages = 2; // 플레이어와 배경

    function handleLoad() {
        loadedCount++;
        if (loadedCount === requiredImages) {
            startButton.style.display = 'block';
            initGame();
            draw();
        }
    }

    // 플레이어와 배경 이미지 로드
    images.player.onload = handleLoad;
    images.background.onload = handleLoad;
    
    // 이미지 소스 설정
    images.player.src = stageAssets[stage].player;
    images.background.src = stageAssets[stage].background;
    
    // 빌런 이미지 로드 시도
    loadVillainImages(stage);
}

// 키보드 입력 초기화 함수
function resetKeys() {
    Object.keys(keys).forEach(key => {
        keys[key] = false;
    });
}

// 게임 초기화 함수
function initGame() {
    // 플레이어 초기 위치
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.direction = 0;
    
    // 빌런 초기화
    villains.forEach(villain => {
        const position = getRandomPositionAwayFromPlayer();
        villain.x = position.x;
        villain.y = position.y;
        villain.direction = Math.random() * Math.PI * 2;
    });

    // 이미지가 이미 로드되어 있다면 다시 분배
    if (villainImages.length > 0) {
        distributeVillainImages();
    }
}

// 게임 오버 처리
function handleGameOver() {
    gameOver = true;
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    alert(`게임 오버!\n생존 시간: ${totalTime}초`);
    restartButton.style.display = 'block';
    backButton.style.display = 'block';
}

// 홈으로 돌아가기 함수
function goToHome() {
    gameOver = false;
    gameStarted = false;
    stageSelect.style.display = 'block';
    restartButton.style.display = 'none';
    backButton.style.display = 'none';
    touchControls.style.display = 'none';
    draw();
}

// 게임 시작 함수
function startGame() {
    gameOver = false;
    gameStarted = true;
    startTime = Date.now();
    survivalTime = 0;
    
    resetKeys();
    
    startButton.style.display = 'none';
    restartButton.style.display = 'none';
    backButton.style.display = 'none';
    
    if (isMobile) {
        touchControls.style.display = 'flex';
    }
    
    gameLoop();
}

// 게임 재시작 함수
function restartGame() {
    gameOver = false;
    startTime = Date.now();
    survivalTime = 0;
    
    resetKeys();
    
    restartButton.style.display = 'none';
    backButton.style.display = 'none';
    
    if (isMobile) {
        touchControls.style.display = 'flex';
    }
    
    initGame();
    gameLoop();
}

// 충돌 감지 함수
function checkCollision() {
    for (const villain of villains) {
        const dx = player.x - villain.x;
        const dy = player.y - villain.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.size * 0.7) {
            handleGameOver();
            return;
        }
    }
}

// 타이머 그리기 함수
function drawTimer() {
    if (!gameOver) {
        survivalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    }
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`생존 시간: ${survivalTime}초`, 10, 30);
    ctx.restore();
}

// 게임 화면 그리기
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
    
    if (!gameStarted) {
        startButton.style.display = 'block';
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('스페이스 바를 눌러 게임 시작', canvas.width / 2, canvas.height / 2 + 50);
        ctx.restore();
        return;
    }
    
    if (gameOver) {
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('스페이스 바를 눌러 다시 시작', canvas.width / 2, canvas.height / 2 + 50);
        ctx.restore();
    }

    // 플레이어 그리기
    ctx.save();
    if (player.direction === 0) {
        ctx.scale(-1, 1);
        ctx.drawImage(images.player, -player.x - player.size, player.y, player.size, player.size);
    } else {
        ctx.drawImage(images.player, player.x, player.y, player.size, player.size);
    }
    ctx.restore();

    // 빌런들 그리기 (빌런 이미지가 있을 경우에만)
    if (villainImages.length > 0) {
        villains.forEach(villain => {
            ctx.save();
            if (Math.cos(villain.direction) > 0) {
                ctx.scale(-1, 1);
                ctx.drawImage(villainImages[villain.imageIndex], -villain.x - villain.size, villain.y, villain.size, villain.size);
            } else {
                ctx.drawImage(villainImages[villain.imageIndex], villain.x, villain.y, villain.size, villain.size);
            }
            ctx.restore();
        });
    }

    // 타이머 그리기
    drawTimer();
}

// 게임 루프
function gameLoop() {
    if (!gameOver && gameStarted) {
        movePlayer();
        moveVillains();
        checkCollision();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

// 이벤트 리스너 설정
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', restartGame);
backButton.addEventListener('click', goToHome);

// 터치 컨트롤 설정
function setupTouchControls() {
    const upButton = document.getElementById('upButton');
    const downButton = document.getElementById('downButton');
    const leftButton = document.getElementById('leftButton');
    const rightButton = document.getElementById('rightButton');

    // 터치 이벤트 핸들러
    function handleTouchStart(key) {
        keys[key] = true;
    }

    function handleTouchEnd(key) {
        keys[key] = false;
    }

    // 터치 이벤트 리스너 추가
    upButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTouchStart('ArrowUp');
    });
    upButton.addEventListener('touchend', () => handleTouchEnd('ArrowUp'));

    downButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTouchStart('ArrowDown');
    });
    downButton.addEventListener('touchend', () => handleTouchEnd('ArrowDown'));

    leftButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTouchStart('ArrowLeft');
    });
    leftButton.addEventListener('touchend', () => handleTouchEnd('ArrowLeft'));

    rightButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTouchStart('ArrowRight');
    });
    rightButton.addEventListener('touchend', () => handleTouchEnd('ArrowRight'));

    // 모바일에서 스페이스바 대체
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameStarted) {
            startGame();
        } else if (gameOver) {
            restartGame();
        }
    });
}

// 캔버스 크기 조정
function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    const containerWidth = container.clientWidth;
    const scale = containerWidth / 600;
    
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerWidth}px`;
}

// 초기화 - 스테이지 선택 화면 표시
document.addEventListener('DOMContentLoaded', () => {
    stageSelect.style.display = 'block';
    startButton.style.display = 'none';
    restartButton.style.display = 'none';
    backButton.style.display = 'none';
    touchControls.style.display = 'none';

    if (isMobile) {
        setupTouchControls();
    }

    // 반응형 캔버스 설정
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    draw();
}); 