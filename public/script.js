(() => {
  const counterElem = document.getElementById('counter');
  const targetNumberElem = document.getElementById('targetNumber');
  const onlineUsersElem = document.getElementById('onlineUsers');
  const changesPerSecondElem = document.getElementById('changesPerSecond');
  const incrementBtn = document.getElementById('increment');
  const decrementBtn = document.getElementById('decrement');
  const progressBarContainer = document.getElementById('progressBarContainer');
  const progressBar = document.getElementById('progressBar');
  const targetProgressBar = document.getElementById('targetProgressBar');

  let cooldown = false;
  let counter = 0;
  let targetNumber = 100;

  const COOLDOWN_TIME = 250;

  const ws = new WebSocket(`ws://${window.location.host}`);

  ws.onopen = () => {
    console.log('Connected to WebSocket server');
  };

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'init') {
        counter = data.counter;
        targetNumber = data.targetNumber;
        counterElem.textContent = counter;
        targetNumberElem.textContent = targetNumber;
        if (data.onlineUsers !== undefined) {
            onlineUsersElem.textContent = data.onlineUsers;
        }
        updateTargetProgress();
    } else if (data.type === 'update') {
        counter = data.counter;
        counterElem.textContent = counter;
        updateTargetProgress();
    } else if (data.type === 'targetReached') {
        alert('Target reached!');
        counter = data.counter;
        counterElem.textContent = counter;
        targetNumberElem.textContent = targetNumber;
        updateTargetProgress();
    } else if (data.type === 'onlineUsers') {
        onlineUsersElem.textContent = data.count;
    } else if (data.type === 'changesPerSecond') {
        changesPerSecondElem.textContent = data.cps;
    }
};

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  const handleClick = (action) => {
    if (cooldown) return;

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: action }));
    } else {
      console.error('WebSocket is not open');
    }

    cooldown = true;
    incrementBtn.disabled = true;
    decrementBtn.disabled = true;
    startCooldownProgressBar();
  };

  const startCooldownProgressBar = () => {
    progressBarContainer.style.display = 'block';
    progressBar.style.width = '0%';

    let startTime = Date.now();

    const updateProgressBar = () => {
      let elapsed = Date.now() - startTime;
      let progress = Math.min((elapsed / COOLDOWN_TIME) * 100, 100);
      progressBar.style.width = progress + '%';

      if (progress < 100) {
        requestAnimationFrame(updateProgressBar);
      } else {
        cooldown = false;
        incrementBtn.disabled = false;
        decrementBtn.disabled = false;
        progressBarContainer.style.display = 'none';
      }
    };

    requestAnimationFrame(updateProgressBar);
  };

  const updateTargetProgress = () => {
    let progress = (Math.abs(counter) / Math.abs(targetNumber)) * 100;
    progress = Math.min(progress, 100);
    targetProgressBar.style.width = progress + '%';
  };

  incrementBtn.addEventListener('click', () => handleClick('increment'));
  decrementBtn.addEventListener('click', () => handleClick('decrement'));
})();
