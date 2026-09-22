const audioInput = document.querySelector('#audio-file');
const analyzeForm = document.querySelector('#analyze-form');
const analyzeButton = document.querySelector('#analyze-button');
const player = document.querySelector('#player');
const review = document.querySelector('#review');
const timelineList = document.querySelector('#timeline');
const status = document.querySelector('#status');
const filters = [...document.querySelectorAll('.filter')];
let audioUrl = null;
let audioFile = null;
let speechConfigured = false;
let notes = [];
let speech = [];
let filter = 'all';
let runId = 0;
let requests = [];
let analysisFinished = false;
let configReady;

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function setPipeline(kind, message, state) {
  document.querySelector(`#${kind}-status`).textContent = message;
  document.querySelector(`#${kind}-pipeline`).dataset.state = state;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = (seconds % 60).toFixed(1).padStart(4, '0');
  return `${minutes}:${remainder}`;
}

function validateEvents(value, kind) {
  if (!Array.isArray(value)) throw new Error(`The ${kind} result has no events array.`);
  return value.map((event, index) => {
    if (!event || typeof event !== 'object' ||
        !Number.isFinite(event.start) || !Number.isFinite(event.end) ||
        event.start < 0 || event.end < event.start ||
        (kind === 'speech' && typeof event.text !== 'string') ||
        (kind === 'note' && (typeof event.note !== 'string' || !Number.isFinite(event.frequencyHz)))) {
      throw new Error(`Invalid ${kind} event ${index + 1}.`);
    }
    return { ...event, kind };
  });
}

async function postWav(path, file, signal) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'audio/wav', 'X-Audio-Filename': file.name.replace(/[^\x20-\x7E]/g, '_') },
    body: file,
    signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

function render() {
  const shownNotes = notes.filter(note => !speech.some(segment =>
    segment.text.trim() && note.start < segment.end && note.end > segment.start));
  const suppressed = notes.length - shownNotes.length;
  const suppressionNote = document.querySelector('#suppression-note');
  suppressionNote.hidden = suppressed === 0;
  suppressionNote.textContent = `${suppressed} ${suppressed === 1 ? 'note estimate' : 'note estimates'} hidden because ${suppressed === 1 ? 'it overlaps' : 'they overlap'} speech.`;
  const events = [...shownNotes, ...speech].sort((a, b) => a.start - b.start || a.end - b.end);
  const visible = events.filter(event => filter === 'all' || event.kind === filter);
  document.querySelector('#count-all').textContent = String(events.length);
  document.querySelector('#count-speech').textContent = String(speech.length);
  document.querySelector('#count-note').textContent = String(shownNotes.length);
  document.querySelector('#summary').textContent = `${speech.length} speech · ${shownNotes.length} ${shownNotes.length === 1 ? 'note' : 'notes'}`;
  timelineList.replaceChildren();
  for (const event of visible) {
    const row = document.createElement('li');
    row.className = `event ${event.kind}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'event-button';
    button.dataset.start = String(event.start);
    button.dataset.end = String(event.end);
    const time = document.createElement('span');
    time.className = 'event-time';
    time.textContent = formatTime(event.start);
    const dot = document.createElement('span');
    dot.className = 'event-dot';
    dot.setAttribute('aria-hidden', 'true');
    const content = document.createElement('span');
    content.className = 'event-content';
    const label = document.createElement('span');
    label.className = 'event-label';
    label.textContent = event.kind === 'speech' ? (event.speaker || 'Speech') : 'Played note';
    const detail = document.createElement('span');
    detail.className = 'event-detail';
    detail.textContent = event.kind === 'speech' ? event.text : event.note;
    const meta = document.createElement('span');
    meta.className = 'event-meta';
    meta.textContent = event.kind === 'speech'
      ? `${formatTime(event.start)}–${formatTime(event.end)}`
      : `${event.frequencyHz.toFixed(1)} Hz · estimated`;
    content.append(label, detail, meta);
    button.append(time, dot, content);
    button.setAttribute('aria-label', `Play from ${formatTime(event.start)}: ${event.kind === 'speech' ? event.text : `${event.note}, estimated`}`);
    button.addEventListener('click', async () => {
      player.currentTime = event.start;
      try {
        await player.play();
        document.querySelector('#playing-label').textContent = `Playing from ${formatTime(event.start)}`;
      } catch {
        setStatus('Playback could not start. Check that the WAV is playable.', true);
      }
      updateActive();
    });
    row.append(button);
    timelineList.append(row);
  }
  const empty = document.querySelector('#empty-filter');
  empty.hidden = visible.length !== 0;
  empty.textContent = analysisFinished ? 'No events in this view.' : 'Events will appear here as analysis finishes.';
  updateActive();
}

function updateActive() {
  const now = player.currentTime;
  for (const button of timelineList.querySelectorAll('.event-button')) {
    const active = !player.paused && Number(button.dataset.start) <= now && now <= Number(button.dataset.end);
    button.classList.toggle('current', active);
    if (active) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  }
}

function stopRequests() {
  for (const request of requests) request.abort();
  requests = [];
  runId += 1;
}

audioInput.addEventListener('change', () => {
  stopRequests();
  audioFile = audioInput.files[0] || null;
  notes = [];
  speech = [];
  analysisFinished = false;
  review.hidden = true;
  analyzeForm.hidden = !audioFile;
  analyzeButton.disabled = false;
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = audioFile ? URL.createObjectURL(audioFile) : null;
  player.removeAttribute('src');
  if (audioUrl) player.src = audioUrl;
  player.load();
  document.querySelector('#audio-label').textContent = audioFile?.name || 'Select a recording from your computer';
  document.querySelector('#playing-label').textContent = 'Ready to play';
  document.querySelector('#guitar-range').open = false;
  document.querySelector('#guitar-start').value = '';
  document.querySelector('#guitar-end').value = '';
  setStatus(audioFile ? 'Analyze the full recording, or set an optional guitar range.' : 'Choose a WAV to begin.');
});

player.addEventListener('loadedmetadata', () => {
  if (!audioFile || !Number.isFinite(player.duration)) return;
  const duration = player.duration;
  document.querySelector('#duration-label').textContent = `By default, YIN analyzes the full ${duration.toFixed(1)}s recording.`;
});

analyzeForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!audioFile) return;
  await configReady;
  const startText = document.querySelector('#guitar-start').value.trim();
  const endText = document.querySelector('#guitar-end').value.trim();
  const hasRange = startText !== '' || endText !== '';
  const start = Number(startText);
  const end = Number(endText);
  if (hasRange && (startText === '' || endText === '' || !Number.isFinite(start) ||
      !Number.isFinite(end) || start < 0 || end <= start || end > player.duration)) {
    setStatus('Fill both range fields with times inside the recording, or leave both empty.', true);
    return;
  }
  stopRequests();
  const currentRun = runId;
  const file = audioFile;
  notes = [];
  speech = [];
  analysisFinished = false;
  review.hidden = false;
  analyzeButton.disabled = true;
  setPipeline('notes', 'Analyzing locally…', 'working');
  setPipeline('speech', speechConfigured ? 'Waiting for WAV check…' : 'Unavailable; showing notes only', speechConfigured ? 'waiting' : 'skipped');
  setStatus('Analyzing the lesson. Notes will appear first.');
  render();

  const noteRequest = new AbortController();
  requests.push(noteRequest);
  try {
    const path = hasRange ? `/api/notes?start=${start}&end=${end}` : '/api/notes';
    const result = await postWav(path, file, noteRequest.signal);
    if (runId !== currentRun) return;
    notes = validateEvents(result.notes, 'note');
    setPipeline('notes', `${notes.length} ${notes.length === 1 ? 'note' : 'notes'} found`, 'done');
    render();
  } catch (error) {
    if (runId !== currentRun) return;
    setPipeline('notes', error.message, 'failed');
    setPipeline('speech', 'Skipped because WAV analysis failed', 'skipped');
    setStatus(`Pitch analysis failed: ${error.message}`, true);
    analyzeButton.disabled = false;
    analysisFinished = true;
    render();
    return;
  }

  if (speechConfigured) {
    const speechRequest = new AbortController();
    requests.push(speechRequest);
    setPipeline('speech', 'Transcribing…', 'working');
    setStatus('Notes are ready. Waiting for speech transcription.');
    try {
      const result = await postWav('/api/transcript', file, speechRequest.signal);
      if (runId !== currentRun) return;
      speech = validateEvents(result.segments, 'speech');
      setPipeline('speech', result.speechDetected === false ? 'No speech detected' : `${speech.length} speech ${speech.length === 1 ? 'segment' : 'segments'}`, 'done');
      render();
    } catch (error) {
      if (runId !== currentRun) return;
      setPipeline('speech', `Unavailable: ${error.message}`, 'failed');
    }
  }
  if (runId !== currentRun) return;
  analysisFinished = true;
  analyzeButton.disabled = false;
  setStatus(speech.length ? 'Ready: the playable timeline is available.' : 'Ready: the playable notes timeline is available.');
  render();
});

filters.forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  filters.forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  render();
}));
player.addEventListener('timeupdate', updateActive);
player.addEventListener('play', updateActive);
player.addEventListener('pause', updateActive);
player.addEventListener('ended', () => { document.querySelector('#playing-label').textContent = 'Ready to play'; updateActive(); });
player.addEventListener('error', () => setStatus('The browser could not play this WAV.', true));
window.addEventListener('beforeunload', () => { stopRequests(); if (audioUrl) URL.revokeObjectURL(audioUrl); });
configReady = fetch('/api/config').then(response => response.json()).then(config => {
  speechConfigured = config.speechConfigured === true;
}).catch(() => setStatus('The local analysis server is unavailable. Start it with npm run ui.', true));
