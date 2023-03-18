(function(){
  const { map, filter, fromEvent, withLatestFrom, tap } = rxjs;

  const ELEMENTS = {
    startPopup: document.querySelector('.js-start-popup'),
    overlay: document.querySelector('.js-overlay'),
    startButton: document.querySelector('.js-start-button'),
    countdown: document.querySelector('.js-countdown'),
  };

  // HANDLERS BINDING
  ELEMENTS.startButton.addEventListener('click', onStartButtonClick)

  const targetButtonClick$ = fromEvent(document.querySelectorAll('.js-target'), 'click');

  const GAME_PHASES = {
    start: 'start',
    playing: 'playing',
    over: 'over'
  };
  const gamePhase$ = new rxjs.BehaviorSubject(GAME_PHASES.start);
  gamePhase$.pipe(filter(phase => phase === GAME_PHASES.start)).subscribe(onStartPhase);
  gamePhase$.pipe(filter(phase => phase === GAME_PHASES.playing)).subscribe(onPlayingPhase);
  gamePhase$.pipe(filter(phase => phase === GAME_PHASES.over)).subscribe(onGameOverPhase);

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
  }
  const hp$ = new rxjs.Subject();
  const scores$ = new rxjs.Subject();
  const gameStep$ = new rxjs.Subject();
  const currentTask$ = new rxjs.Subject();
  const answer$ = new rxjs.Subject();

  gameStep$.pipe(
    filter(step => step === TRAINING_STEPS.GUESSING)
  ).subscribe(() => {
    const task = getRandomQuestion();
    currentTask$.next(task);
    console.log('play sound '+ task);
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
    }
  })

  targetButtonClick$.pipe(
    map(el => el.target.dataset.side),
  ).subscribe((targetSide) => {
    answer$.next(targetSide);
    gameStep$.next(TRAINING_STEPS.ASSESSING_ANSWER);
  })

  function onStartPhase(){
    ELEMENTS.overlay.classList.remove('hidden');
    ELEMENTS.startPopup.classList.remove('hidden');
  }

  function onPlayingPhase(){
    hp$.next(GAME_DEFAULT_STATE.hp);
    scores$.next(GAME_DEFAULT_STATE.scores);
    gameStep$.next(GAME_DEFAULT_STATE.step);
  }

  function onGameOverPhase(){
    console.log('game over');
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

  function getRandomQuestion(){
    return Math.random() > 0.5 
      ? TASKS.left
      : TASKS.right
  }
})()