(function(){
  const { map, filter, fromEvent, withLatestFrom, tap, interval } = rxjs;
  const rightAudio = new Audio("./right-1.mp3");
  const leftAudio = new Audio("./left-1.mp3");

  const ELEMENTS = {
    startPopup: document.querySelector('.js-start-popup'),
    gameOverPopup: document.querySelector('.js-game-over-popup'),
    gameOverScores: document.querySelector('.js-game-over-scores'),
    gameOverRestartButton: document.querySelector('.js-restart-button'),
    overlay: document.querySelector('.js-overlay'),
    startButton: document.querySelector('.js-start-button'),
    countdown: document.querySelector('.js-countdown'),
    hp: document.querySelector('.js-health'),
    timer: document.querySelector('.js-timer'),
    scores: document.querySelector('.js-scores'),
  };

  // HANDLERS BINDING
  ELEMENTS.startButton.addEventListener('click', onStartButtonClick)
  ELEMENTS.gameOverRestartButton.addEventListener('click', onRestartButtonClick)

  const targetButtonClick$ = fromEvent(document.querySelectorAll('.js-target'), 'click');

  const GAME_PHASES = {
    start: 'start',
    playing: 'playing',
    over: 'over'
  };
  const TRAINING_STEPS = {
    GUESSING: 'GUESSING',
    WAITING_FOR_ANSWER: 'WAITING_FOR_ANSWER',
    ASSESSING_ANSWER: 'ASSESSING_ANSWER'
  };
  const TASKS = {
    right: 'right',
    left: 'left',
  }
  const GAME_DEFAULT_STATE = {
    hp: 3,
    scores: 0,
    step: TRAINING_STEPS.GUESSING,
    timeSec: 60,
  }
  const hp$ = new rxjs.Subject();
  const scores$ = new rxjs.Subject();
  const gameStep$ = new rxjs.Subject();
  const currentTask$ = new rxjs.Subject();
  const answer$ = new rxjs.Subject();
  const timeLeft$ = new rxjs.Subject();
  let timerSubscription;

  const gamePhase$ = new rxjs.BehaviorSubject(GAME_PHASES.start);
  gamePhase$.pipe(filter(phase => phase === GAME_PHASES.start)).subscribe(onStartPhase);
  gamePhase$.pipe(filter(phase => phase === GAME_PHASES.playing)).subscribe(onPlayingPhase);
  gamePhase$.pipe(
    filter(phase => phase === GAME_PHASES.over),
    withLatestFrom(scores$),
    map(([phase, scores]) => scores)
  )
  .subscribe(onGameOverPhase);



  gameStep$.pipe(
    filter(step => step === TRAINING_STEPS.GUESSING)
  ).subscribe(() => {
    const task = getRandomQuestion();
    currentTask$.next(task);
    if(task === TASKS.left)
      leftAudio.play();
    else
      rightAudio.play();
      
    gameStep$.next(TRAINING_STEPS.WAITING_FOR_ANSWER)
  })

  gameStep$.pipe(
    filter(step => step === TRAINING_STEPS.WAITING_FOR_ANSWER)
  ).subscribe(() => {
    console.log('waiting for answer');
  })

  gameStep$.pipe(
    filter(step => step === TRAINING_STEPS.ASSESSING_ANSWER),
    withLatestFrom(currentTask$, answer$, hp$, scores$),
  ).subscribe(([_, currentTask, answer, hp, scores]) => {
    const isAnswerRight = (answer === 'answer-left' && currentTask === TASKS.left)
      || (answer === 'answer-right' && currentTask === TASKS.right);

    if(isAnswerRight) {
      scores$.next(scores + 1);
      gameStep$.next(TRAINING_STEPS.GUESSING);
    } else{
      const newHp = hp - 1;
      hp$.next(newHp);
      if(newHp === 0)
        gamePhase$.next(GAME_PHASES.over);
      else
        gameStep$.next(TRAINING_STEPS.GUESSING);
    }
  })

  targetButtonClick$.pipe(
    map(el => el.target.dataset.side),
  ).subscribe((targetSide) => {
    answer$.next(targetSide);
    gameStep$.next(TRAINING_STEPS.ASSESSING_ANSWER);
  })

  hp$.subscribe(hp => {
    const maxHp = GAME_DEFAULT_STATE.hp;
    ELEMENTS.hp.innerHTML = '';
    let heartIndex = 0;
    while(heartIndex < maxHp) {
      const heathEl = document.createElement('span');
      heathEl.classList.add('health__heart');
      if(hp > 0){
        heathEl.classList.add('icon-heart');
      } else{
        heathEl.classList.add('icon-heart-empty');
      }
      ELEMENTS.hp.appendChild(heathEl);
      heartIndex++;
      hp--;
    }
  })

  scores$.subscribe(scores => {
    ELEMENTS.scores.innerText = scores;
  })

  timeLeft$.subscribe(timeLeft => {
    ELEMENTS.timer.innerText = timeLeft;
  })

  function onStartPhase(){
    ELEMENTS.overlay.classList.remove('hidden');
    ELEMENTS.startPopup.classList.remove('hidden');
  }

  
  function onPlayingPhase(){
    hp$.next(GAME_DEFAULT_STATE.hp);
    scores$.next(GAME_DEFAULT_STATE.scores);
    gameStep$.next(GAME_DEFAULT_STATE.step);

    timerSubscription = interval(1000).pipe(
      withLatestFrom(timeLeft$)
    ).subscribe(([_, timeLeft]) => {
      timeLeft$.next(timeLeft - 1);
    });

    timeLeft$.next(GAME_DEFAULT_STATE.timeSec);
  }

  function onGameOverPhase(scores){
    timerSubscription?.unsubscribe();
    ELEMENTS.overlay.classList.remove('hidden');
    ELEMENTS.gameOverPopup.classList.remove('hidden');
    ELEMENTS.gameOverScores.innerText = scores;
  }

  // CONTROL HANDLERS
  function onStartButtonClick(){
    ELEMENTS.startPopup.classList.add('hidden');
    ELEMENTS.countdown.classList.remove('hidden');
    let counter = 1;
    ELEMENTS.countdown.innerText = counter;
    const timer = setInterval(() => {
      if(counter === 1 ){
        clearInterval(timer);
        ELEMENTS.countdown.classList.add('hidden');
        ELEMENTS.overlay.classList.add('hidden');
        gamePhase$.next(GAME_PHASES.playing)
      } else {
        counter--;
        ELEMENTS.countdown.innerText = counter;
      }
    }, 1000) 
  }

  function onRestartButtonClick(){
    ELEMENTS.overlay.classList.add('hidden');
    ELEMENTS.gameOverPopup.classList.add('hidden');
    gamePhase$.next(GAME_PHASES.playing)
  }

  function getRandomQuestion(){
    return Math.random() > 0.5 
      ? TASKS.left
      : TASKS.right
  }
})()