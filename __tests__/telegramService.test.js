import { initDatabase, addTransaction, updateTelegramSettings } from '../src/database';
import { sendTelegramMessage, sendDailySummary, testTelegramConnection } from '../src/telegramService';

beforeEach(async () => {
  await initDatabase();
  global.fetch = jest.fn();
});

afterEach(() => {
  delete global.fetch;
});

describe('sendTelegramMessage', () => {
  test('returns true on success', async () => {
    global.fetch.mockResolvedValueOnce({ json: async () => ({ ok: true }) });
    expect(await sendTelegramMessage('b', 'c', 'Hello')).toBe(true);
  });

  test('returns false on API error', async () => {
    global.fetch.mockResolvedValueOnce({ json: async () => ({ ok: false }) });
    expect(await sendTelegramMessage('b', 'c', 'Hi')).toBe(false);
  });

  test('returns false on network error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network'));
    expect(await sendTelegramMessage('b', 'c', 'Hi')).toBe(false);
  });
});

describe('sendDailySummary', () => {
  test('errors when not configured', async () => {
    const r = await sendDailySummary();
    expect(r.success).toBe(false);
  });

  test('sends when configured', async () => {
    await updateTelegramSettings('b', 'c', true);
    await addTransaction('cashin', 500, 25);
    global.fetch.mockResolvedValueOnce({ json: async () => ({ ok: true }) });
    const r = await sendDailySummary(true);
    expect(r.success).toBe(true);
  });
});

test('testTelegramConnection', async () => {
  global.fetch.mockResolvedValueOnce({ json: async () => ({ ok: true }) });
  expect(await testTelegramConnection('b', 'c')).toBe(true);
});
