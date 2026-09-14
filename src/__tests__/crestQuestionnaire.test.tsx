/**
 * Integration tests for the CREST questionnaire screen
 * (app/onboarding/crest-questionnaire.tsx + src/components/ResponseScale.tsx)
 * using React Native Testing Library.
 *
 * WHAT is under test: the full 12-question flow as a user experiences it —
 * rendering a question, selecting a response, advancing via Continue/Confirm,
 * and the accessibility semantics of the response buttons and progress bar.
 * This exercises the real question data (src/data/crestQuestions.ts) and the
 * real scoring call on completion, with only the DB/router/context boundary
 * mocked out — so it's an integration test across screen + child component,
 * not a mock-everything unit test.
 *
 * WHY: this is the very first screen a new user completes, and it's also
 * used for the week 4/8 retest. A regression here (e.g. Continue not
 * appearing, or the wrong option highlighting) blocks onboarding entirely.
 *
 * Mocked boundaries: expo-router (navigation), src/storage/crest (SQLite),
 * PreferencesContext and ThemeContext (avoid needing a real DB-backed
 * provider tree). Real: CREST_QUESTIONS data, ResponseScale, scoreCREST.
 *
 * NOTE on async: @testing-library/react-native v14 made render()/fireEvent
 * async (they now go through test-renderer + React's act() under the hood),
 * so every interaction below is awaited. ResponseScale also has a
 * deliberate 150ms "flash" delay between tapping Continue/Confirm and
 * actually calling onConfirm (see FLASH_DURATION in ResponseScale.tsx) —
 * tests use fake timers and advance past it explicitly inside act().
 *
 * Testing techniques used (ISTQB), labelled per test:
 *   happy path — the straightforward render/select/advance flow
 *   edge case  — last-question wording, re-selecting an option
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { CREST_QUESTIONS } from '@/src/data/crestQuestions';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: any[]) => mockReplace(...args) },
}));

const mockSaveDraft = jest.fn();
const mockClearDraft = jest.fn();
const mockBuildAndSaveAssessment = jest.fn((..._args: any[]) => ({
  id: 'crest_test_1',
  date: '2026-06-15T00:00:00.000Z',
}));
jest.mock('@/src/storage/crest', () => ({
  getInitialDraftState: () => ({ responses: Array(12).fill(null), currentIndex: 0 }),
  saveDraft: (...args: any[]) => mockSaveDraft(...args),
  clearDraft: () => mockClearDraft(),
  buildAndSaveAssessment: (...args: any[]) => mockBuildAndSaveAssessment(...args),
}));

const mockUpdatePreferences = jest.fn();
jest.mock('@/src/context/PreferencesContext', () => ({
  usePreferences: () => ({
    preferences: null,
    isLoading: false,
    updatePreferences: mockUpdatePreferences,
    refreshPreferences: jest.fn(),
  }),
}));

// Real Colors/Typography tokens, composed the same way ThemeContext's light
// palette does it — avoids hand-faking every colour/typography key the
// screen and ResponseScale actually read.
jest.mock('@/src/context/ThemeContext', () => {
  const { Colors, Typography } = jest.requireActual('@/src/theme');
  return {
    useTheme: () => ({
      isDark: false,
      colors: {
        ...Colors,
        background: Colors.warmSand,
        surface: Colors.white,
        surfaceVariant: Colors.tealLight,
        textPrimary: Colors.darkText,
        textSecondary: Colors.midGray,
        headingAccent: Colors.deepTide,
      },
      typography: Typography,
      fontScale: 1,
    }),
  };
});

import CRESTQuestionnaireScreen from '@/app/onboarding/crest-questionnaire';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function selectOption(label: string) {
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${label},`) }));
}

async function pressAdvanceButton(label: 'Continue' | 'Confirm') {
  await fireEvent.press(screen.getByRole('button', { name: label }));
  // ResponseScale delays calling onConfirm by FLASH_DURATION (150ms).
  await act(async () => {
    jest.advanceTimersByTime(200);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Initial render ─────────────────────────────────────────────────────────

describe('CRESTQuestionnaireScreen — initial render', () => {
  it('happy path: renders question 1 of 12 on load', async () => {
    await render(<CRESTQuestionnaireScreen />);
    expect(screen.getByText('1 of 12')).toBeTruthy();
    expect(screen.getByText(CREST_QUESTIONS[0].text)).toBeTruthy();
  });

  it('happy path: the progress bar shows the correct initial value', async () => {
    await render(<CRESTQuestionnaireScreen />);
    const bar = screen.getByRole('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ min: 1, max: 12, now: 1 });
  });

  it('happy path: no response option is pre-selected on load', async () => {
    await render(<CRESTQuestionnaireScreen />);
    for (const option of ['Never', 'Rarely', 'Sometimes', 'Most of the time', 'Always']) {
      const btn = screen.getByRole('button', { name: new RegExp(`^${option},`) });
      expect(btn.props.accessibilityState?.selected).toBeFalsy();
    }
  });

  it('happy path: the Continue/Confirm button is not visible when no option is selected', async () => {
    await render(<CRESTQuestionnaireScreen />);
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
  });

  it('happy path: "Select an option to continue" helper text is visible when no option is selected', async () => {
    await render(<CRESTQuestionnaireScreen />);
    expect(screen.getByText('Select an option to continue')).toBeTruthy();
  });
});

// ─── Response selection ─────────────────────────────────────────────────────

describe('CRESTQuestionnaireScreen — response selection', () => {
  it('happy path: tapping "Never" selects it and highlights it with the calm-wave colour', async () => {
    await render(<CRESTQuestionnaireScreen />);
    await selectOption('Never');
    const btn = screen.getByRole('button', { name: /^Never,/ });
    expect(btn.props.accessibilityState.selected).toBe(true);
    expect(btn.props.style.backgroundColor).toBe('#5DCAA5');
  });

  it('happy path: tapping "Always" selects it correctly', async () => {
    await render(<CRESTQuestionnaireScreen />);
    await selectOption('Always');
    const btn = screen.getByRole('button', { name: /^Always,/ });
    expect(btn.props.accessibilityState.selected).toBe(true);
  });

  it('happy path: after selecting an option, the Continue button becomes visible', async () => {
    await render(<CRESTQuestionnaireScreen />);
    await selectOption('Sometimes');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
  });

  it('happy path: after selecting an option, the helper text disappears', async () => {
    await render(<CRESTQuestionnaireScreen />);
    await selectOption('Sometimes');
    expect(screen.queryByText('Select an option to continue')).toBeNull();
  });

  it('edge case: only one option can be selected at a time — selecting a second deselects the first', async () => {
    await render(<CRESTQuestionnaireScreen />);
    await selectOption('Never');
    await selectOption('Always');

    const never = screen.getByRole('button', { name: /^Never,/ });
    const always = screen.getByRole('button', { name: /^Always,/ });
    expect(never.props.accessibilityState.selected).toBe(false);
    expect(always.props.accessibilityState.selected).toBe(true);
  });
});

// ─── Navigation ─────────────────────────────────────────────────────────────

describe('CRESTQuestionnaireScreen — navigation between questions', () => {
  it('happy path: tapping Continue on question 1 advances to question 2', async () => {
    await render(<CRESTQuestionnaireScreen />);
    await selectOption('Never');
    await pressAdvanceButton('Continue');

    expect(screen.getByText('2 of 12')).toBeTruthy();
    expect(screen.getByText(CREST_QUESTIONS[1].text)).toBeTruthy();
  });

  it('happy path: the progress bar updates when advancing to the next question', async () => {
    await render(<CRESTQuestionnaireScreen />);
    await selectOption('Never');
    await pressAdvanceButton('Continue');

    const bar = screen.getByRole('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ min: 1, max: 12, now: 2 });
  });

  it('happy path: the question counter updates to "2 of 12" after advancing once', async () => {
    await render(<CRESTQuestionnaireScreen />);
    await selectOption('Rarely');
    await pressAdvanceButton('Continue');
    expect(screen.getByText('2 of 12')).toBeTruthy();
  });

  it('edge case: on question 11 of 12, the advance button reads "Continue"', async () => {
    await render(<CRESTQuestionnaireScreen />);
    for (let q = 1; q <= 10; q++) {
      await selectOption('Sometimes');
      await pressAdvanceButton('Continue');
    }
    expect(screen.getByText('11 of 12')).toBeTruthy();
    await selectOption('Sometimes');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
  });

  it('edge case: on question 12 of 12, the advance button reads "Confirm" instead of "Continue"', async () => {
    await render(<CRESTQuestionnaireScreen />);
    for (let q = 1; q <= 11; q++) {
      await selectOption('Sometimes');
      await pressAdvanceButton('Continue');
    }
    expect(screen.getByText('12 of 12')).toBeTruthy();
    await selectOption('Sometimes');
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  });

  it('happy path: tapping Confirm on question 12 completes the questionnaire and navigates to the result screen', async () => {
    await render(<CRESTQuestionnaireScreen />);
    for (let q = 1; q <= 11; q++) {
      await selectOption('Sometimes');
      await pressAdvanceButton('Continue');
    }
    await selectOption('Always');
    await pressAdvanceButton('Confirm');

    expect(mockBuildAndSaveAssessment).toHaveBeenCalledTimes(1);
    expect(mockClearDraft).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/onboarding/crest-result' })
    );
  });
});

// ─── Accessibility ──────────────────────────────────────────────────────────

describe('CRESTQuestionnaireScreen — accessibility', () => {
  it('all 5 response buttons have accessible labels naming the option and the current question', async () => {
    await render(<CRESTQuestionnaireScreen />);
    const question = CREST_QUESTIONS[0].text;
    for (const option of ['Never', 'Rarely', 'Sometimes', 'Most of the time', 'Always']) {
      const btn = screen.getByRole('button', { name: `${option}, response to: ${question}` });
      expect(btn).toBeTruthy();
    }
  });

  it('the progress bar exposes an accessible role and value', async () => {
    await render(<CRESTQuestionnaireScreen />);
    const bar = screen.getByRole('progressbar');
    expect(bar.props.accessibilityValue).toBeDefined();
    expect(bar.props.accessibilityValue.max).toBe(12);
    expect(bar.props.accessibilityLabel).toBe('Question 1 of 12');
  });
});
