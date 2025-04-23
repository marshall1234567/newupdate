const { Timer, Analytics } = require('./script');
const { expect, describe, it, beforeEach, afterEach, jest } = require('@jest/globals');

// Mock DOM elements
document.body.innerHTML = `
  <div id="timerDisplay"></div>
  <button id="toggleTimer"></button>
  <div id="todayFocus"></div>
  <div id="weeklyAverage"></div>
  <canvas id="analyticsChart"></canvas>
`;

// Ensure we have a valid hyperfocus object
expect(hyperfocus).toBeDefined();
expect(typeof hyperfocus.start).toBe('function');
expect(typeof hyperfocus.stop).toBe('function');

describe('Hyperfocus Timer', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Reset hyperfocus state
    if (hyperfocus.timer) {
      clearInterval(hyperfocus.timer);
    }
    hyperfocus.timer = null;
    hyperfocus.startTime = null;
    hyperfocus.sessionName = '';
    hyperfocus.sessions = [];
    hyperfocus.chart = null;
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    if (hyperfocus.timer) {
      clearInterval(hyperfocus.timer);
    }
    jest.useRealTimers();
  });

  describe('start()', () => {
    it('should start a new session with valid name', () => {
      window.prompt.mockReturnValue('Test Session');
      const mockStartTime = new Date('2025-01-01').getTime();
      jest.spyOn(Date, 'now').mockReturnValue(mockStartTime);

      hyperfocus.start();

      expect(window.prompt).toHaveBeenCalledWith(
        'Please add your session name for initiating your hyperfocus session:'
      );
      expect(window.alert).toHaveBeenCalledWith(
        'Your session for this hyperfocus has started.'
      );
      expect(hyperfocus.startTime).toBe(mockStartTime);
      expect(hyperfocus.sessionName).toBe('Test Session');
      expect(hyperfocus.timer).toBeDefined();
    });

    it('should not start session without name', () => {
      window.prompt.mockReturnValue('');
      hyperfocus.start();

      expect(window.alert).toHaveBeenCalledWith(
        'Session name is required to start the timer.'
      );
      expect(hyperfocus.timer).toBeNull();
      expect(hyperfocus.startTime).toBeNull();
    });
  });

  describe('stop()', () => {
    it('should stop the session and save data', () => {
      // Setup
      window.prompt
        .mockReturnValueOnce('Test Session') // For start
        .mockReturnValueOnce('8'); // For stop

      // Mock Date.now for consistent timing
      const startTime = new Date('2025-01-01').getTime();
      const endTime = startTime + 60000; // 1 minute later
      Date.now = jest.fn()
        .mockReturnValueOnce(startTime) // For start
        .mockReturnValueOnce(endTime);  // For stop

      // Start session
      hyperfocus.start();
      expect(hyperfocus.timer).toBeTruthy();

      // Stop session
      hyperfocus.stop();
      expect(hyperfocus.timer).toBeNull();

      // Verify session data
      expect(hyperfocus.sessions).toHaveLength(1);
      expect(hyperfocus.sessions[0]).toEqual(expect.objectContaining({
        sessionName: 'Test Session',
        duration: 60,
        focusRating: 8
      }));

      // Verify localStorage was updated
      const savedData = JSON.parse(localStorage.getItem('hyperfocusSessions'));
      expect(savedData).toEqual(expect.arrayContaining([expect.objectContaining({
        sessionName: 'Test Session',
        focusRating: 8
      })]));
    });
  });

  describe('updateTimerDisplay()', () => {
    it('should format time correctly', () => {
      hyperfocus.updateTimerDisplay(3661000); // 1 hour, 1 minute, 1 second
      expect(document.getElementById('timerDisplay').innerText).toBe('01:01:01:000');
    });
  });

  describe('getAnalyticsSummary()', () => {
    it('should calculate correct analytics', () => {
      hyperfocus.sessions = [
        { duration: 3600, focusRating: 8 },
        { duration: 1800, focusRating: 6 }
      ];

      const summary = hyperfocus.getAnalyticsSummary();

      expect(summary.totalSessions).toBe(2);
      expect(summary.avgDuration).toBe(45); // (3600 + 1800) / 60 / 2
      expect(summary.avgFocus).toBe(7); // (8 + 6) / 2
    });
  });
});

describe('Timer', () => {
  let timer;
  
  beforeEach(() => {
    // Mock DOM elements
    document.body.innerHTML = `
      <div id="timerDisplay"></div>
      <button id="timerToggle"></button>
    `;
    
    timer = new Timer();
  });
  
  test('initializes correctly', () => {
    expect(timer.isRunning).toBe(false);
    expect(timer.elapsedTime).toBe(0);
  });
  
  test('starts and stops', () => {
    timer.start();
    expect(timer.isRunning).toBe(true);
    
    timer.stop();
    expect(timer.isRunning).toBe(false);
  });
  
  test('formats time correctly', () => {
    timer.elapsedTime = 3661000; // 1 hour, 1 minute, 1 second
    timer.updateDisplay();
    expect(document.getElementById('timerDisplay').textContent).toBe('01:01:01');
  });
});
