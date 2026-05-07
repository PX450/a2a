const startScreen = document.getElementById('start-screen');
const flame = document.getElementById('flame');
const spark = document.getElementById('spark');
const ignitionSpark = document.getElementById('ignition-spark');
const canvas = document.getElementById('paper-canvas');
const ctx = canvas.getContext('2d');
const glowText = document.querySelector('.glow-text');
const particlesContainer = document.getElementById('particles-container');

let audioContext;
let analyser;
let microphone;
let dataArray;
let isBlowing = false;

// Audio FFT Settings
const BLOW_THRESHOLD = 90; // Volume threshold for hiss
const MIN_FREQ_INDEX = 40; // Approx 2kHz
const MAX_FREQ_INDEX = 120; // Approx 6kHz
let blowDuration = 0;
const REQUIRED_BLOW_DURATION = 20; // Number of frames sustained

// Canvas Settings
let canvasW, canvasH;
let burnRadius = 0;
let isBurning = false;
let burnOrigin = { x: 0, y: 0 };
const EDGE_WIDTH = 40;

function resizeCanvas() {
    canvasW = window.innerWidth;
    canvasH = window.innerHeight;
    canvas.width = canvasW;
    canvas.height = canvasH;
    fillPaper();
}

function fillPaper() {
    if (isBurning) return;
    
    // Draw rich dark textured paper
    ctx.fillStyle = '#14100c';
    ctx.fillRect(0, 0, canvasW, canvasH);
    
    // Add subtle noise texture
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    for(let i=0; i<3000; i++) {
        ctx.beginPath();
        ctx.arc(Math.random()*canvasW, Math.random()*canvasH, Math.random()*1.5, 0, Math.PI*2);
        ctx.fill();
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Typewriter Effect
const typeWriterElement = document.getElementById('typewriter-text');
const message = "SYSTEM INITIALIZATION...\n\nTo proceed, please grant microphone permissions when prompted.\n\nExhale hard through the microphone to extinguish the flame and see what lies hidden inside.\n\n[ CLICK ANYWHERE TO BEGIN ]";
let typeIndex = 0;

function typeWriter() {
    if (typeIndex < message.length) {
        if (message.charAt(typeIndex) === '\n') {
            typeWriterElement.innerHTML += '<br>';
        } else {
            typeWriterElement.innerHTML += message.charAt(typeIndex);
        }
        typeIndex++;
        // Random typing speed for typewriter realism (30ms to 80ms)
        setTimeout(typeWriter, 30 + Math.random() * 50);
    }
}
typeWriter();

// ACT 0: Screen Click & Ignition
startScreen.addEventListener('click', () => {
    // Hide start screen smoothly
    startScreen.style.opacity = '0';
    setTimeout(() => {
        startScreen.style.display = 'none';
        playIgnitionSequence();
    }, 1000);
});

function playIgnitionSequence() {
    const candleRect = document.getElementById('wick').getBoundingClientRect();
    const endX = candleRect.left + candleRect.width/2 - 4;
    const endY = candleRect.top - 5;
    
    // Spark drops from top right
    const startX = canvasW * 0.8;
    const startY = -50;
    
    ignitionSpark.style.opacity = '1';
    
    let t = 0;
    const duration = 70; // frames
    
    function animateIgnition() {
        if (t >= 1) {
            ignitionSpark.style.opacity = '0';
            
            // Ignite the flame!
            flame.classList.remove('unlit');
            flame.classList.add('igniting');
            
            // After flame bursts, start the microphone listening
            setTimeout(initAudio, 1000);
            return;
        }
        
        t += 1 / duration;
        
        // Drop path curving in
        let x = startX + (endX - startX) * t;
        let y = startY + (endY - startY) * Math.pow(t, 2); // Accelerate downwards (gravity)
        
        ignitionSpark.style.left = `${x}px`;
        ignitionSpark.style.top = `${y}px`;
        
        requestAnimationFrame(animateIgnition);
    }
    
    animateIgnition();
}

async function initAudio() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 512;
        microphone.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        // Start analyzing microphone input
        requestAnimationFrame(audioLoop);
    } catch (err) {
        alert("Microphone access is required for the breath interaction to work.");
        console.error("Mic Error:", err);
    }
}

// ACT 1: Listening
function audioLoop() {
    if (isBlowing) return;
    
    requestAnimationFrame(audioLoop);
    analyser.getByteFrequencyData(dataArray);
    
    let sum = 0;
    let count = 0;
    for (let i = MIN_FREQ_INDEX; i < Math.min(MAX_FREQ_INDEX, dataArray.length); i++) {
        sum += dataArray[i];
        count++;
    }
    const averageHiss = sum / count;
    
    if (averageHiss > BLOW_THRESHOLD) {
        blowDuration++;
        
        // Make flame flicker wildly in response to breath
        flame.style.transform = `scale(${1 + Math.random()*0.5}) translate(${Math.random()*30-15}px, ${Math.random()*10}px)`;
        
        if (blowDuration >= REQUIRED_BLOW_DURATION) {
            triggerAct2();
        }
    } else {
        blowDuration = Math.max(0, blowDuration - 1);
        flame.style.transform = ''; // reset to CSS animation
    }
}

// ACT 2: Extinguish & Spark Travel
function triggerAct2() {
    isBlowing = true;
    
    // Extinguish Flame
    flame.classList.add('extinguished');
    
    const candleRect = document.getElementById('wick').getBoundingClientRect();
    const startX = candleRect.left + candleRect.width/2 - 4;
    const startY = candleRect.top - 10;
    
    const endX = canvasW / 2 - 4;
    const endY = canvasH / 2 - 4;
    
    const controlX = startX + (endX - startX) * 0.5 + 300; 
    const controlY = Math.min(startY, endY) - 400; 
    
    setTimeout(() => {
        igniteSpark(startX, startY, controlX, controlY, endX, endY);
    }, 200);
}

function igniteSpark(p0x, p0y, p1x, p1y, p2x, p2y) {
    spark.style.opacity = '1';
    let t = 0;
    const duration = 100;
    
    function animateSpark() {
        if (t >= 1) {
            spark.style.opacity = '0';
            triggerAct3(p2x + 4, p2y + 4);
            return;
        }
        
        t += 1 / duration;
        
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        
        let x = uu * p0x + 2 * u * t * p1x + tt * p2x;
        let y = uu * p0y + 2 * u * t * p1y + tt * p2y;
        
        const noiseX = Math.sin(t * 30) * 30 * Math.sin(t * Math.PI);
        const noiseY = Math.cos(t * 40) * 30 * Math.sin(t * Math.PI);
        
        spark.style.left = `${x + noiseX}px`;
        spark.style.top = `${y + noiseY}px`;
        
        requestAnimationFrame(animateSpark);
    }
    
    animateSpark();
}

// ACT 3: Paper Burn Reveal
function triggerAct3(x, y) {
    isBurning = true;
    burnOrigin = { x, y };
    
    glowText.style.opacity = '1';
    requestAnimationFrame(burnLoop);
    
    if (navigator.vibrate) navigator.vibrate([50, 100, 50, 100, 200]);
}

function burnLoop() {
    const maxRadius = Math.max(canvasW, canvasH) * 1.5;
    
    if (burnRadius > maxRadius) {
        // Complete
        document.getElementById('candle-container').style.opacity = '0';
        triggerAct4();
        return;
    }
    
    burnRadius += 1.5 + (burnRadius * 0.04);
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
        const rOffset = Math.random() * 40 - 20;
        const r = burnRadius + EDGE_WIDTH + rOffset;
        const pX = burnOrigin.x + r * Math.cos(angle);
        const pY = burnOrigin.y + r * Math.sin(angle);
        if (angle === 0) ctx.moveTo(pX, pY);
        else ctx.lineTo(pX, pY);
    }
    ctx.closePath();
    
    const gradient = ctx.createRadialGradient(
        burnOrigin.x, burnOrigin.y, Math.max(0, burnRadius - 10),
        burnOrigin.x, burnOrigin.y, burnRadius + EDGE_WIDTH + 20
    );
    gradient.addColorStop(0, 'rgba(255, 69, 0, 0)');
    gradient.addColorStop(0.5, 'rgba(255, 69, 0, 1)');
    gradient.addColorStop(0.9, 'rgba(30, 5, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
        const rOffset = Math.random() * 30 - 15;
        const r = burnRadius + rOffset;
        const pX = burnOrigin.x + r * Math.cos(angle);
        const pY = burnOrigin.y + r * Math.sin(angle);
        if (angle === 0) ctx.moveTo(pX, pY);
        else ctx.lineTo(pX, pY);
    }
    ctx.closePath();
    ctx.fillStyle = 'black';
    ctx.fill();
    
    requestAnimationFrame(burnLoop);
}

// ACT 4: Finale Animations
function triggerAct4() {
    glowText.classList.add('finale');
    
    // Constantly generate beautiful floating magic particles
    setInterval(() => {
        for(let i=0; i<3; i++) {
            createParticle();
        }
    }, 150);
}

function createParticle() {
    const p = document.createElement('div');
    p.classList.add('magic-particle');
    
    // Spread around the center horizontally, spawn from below center
    const x = canvasW/2 + (Math.random() * 800 - 400);
    const y = canvasH/2 + (Math.random() * 300 - 50);
    
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    
    // Randomize behavior
    const duration = 2 + Math.random() * 3;
    p.style.animationDuration = `${duration}s`;
    
    // Golden and ruby glowing colors
    const colors = ['#ff4500', '#ff9d00', '#ff0055', '#ffffff', '#ffd700'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.boxShadow = `0 0 10px 2px ${color}, 0 0 20px 5px ${color}`;
    
    particlesContainer.appendChild(p);
    
    // Cleanup particle DOM node
    setTimeout(() => {
        p.remove();
    }, duration * 1000);
}
