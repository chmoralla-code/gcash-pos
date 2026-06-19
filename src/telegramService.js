import { getTelegramSettings, getIncomeSummary } from './database';

const TELEGRAM_API = 'https://api.telegram.org/bot';

export async function sendTelegramMessage(botToken, chatId, message) {
  try {
    const url = `${TELEGRAM_API}${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('Telegram send error:', error);
    return false;
  }
}

export async function sendDailySummary(force = false) {
  try {
    const settings = await getTelegramSettings();
    if (!settings.bot_token || !settings.chat_id) {
      return { success: false, error: 'Telegram not configured' };
    }

    // Check if already sent today (unless forced)
    const today = new Date().toLocaleDateString('en-PH');
    if (!force && settings.last_sent_date === today) {
      return { success: true, error: 'Already sent today' };
    }

    // Get today's summary
    const summary = await getIncomeSummary('today');

    const message = `
<b>💰 GCash POS — Daily Summary</b>
📅 <b>${today}</b>

━━━━━━━━━━━━━━━━━━

<b>📥 Cash In</b>
   Transactions: ${summary.cashin.count}
   Total Amount: ₱${Number(summary.cashin.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
   Fees Earned: ₱${Number(summary.cashin.fee).toLocaleString('en-PH', { minimumFractionDigits: 2 })}

<b>📤 Cash Out</b>
   Transactions: ${summary.cashout.count}
   Total Amount: ₱${Number(summary.cashout.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
   Fees Earned: ₱${Number(summary.cashout.fee).toLocaleString('en-PH', { minimumFractionDigits: 2 })}

━━━━━━━━━━━━━━━━━━
<b>🏆 Total Income Today</b>
   <b>₱${Number(summary.totalFee).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</b>

━━━━━━━━━━━━━━━━━━
<i>Sent from GCash POS App</i>
    `.trim();

    const success = await sendTelegramMessage(settings.bot_token, settings.chat_id, message);

    if (success) {
      // We need to update last sent date - import dynamically to avoid circular
      const { updateLastSentDate } = require('./database');
      await updateLastSentDate(today);
    }

    return { success, error: success ? null : 'Failed to send message' };
  } catch (error) {
    console.error('Daily summary error:', error);
    return { success: false, error: error.message };
  }
}

export async function testTelegramConnection(botToken, chatId) {
  try {
    const message = `✅ <b>GCash POS Connected!</b>\n\nYour Telegram monitoring is now active.\nYou will receive daily sales summaries here.`;
    return await sendTelegramMessage(botToken, chatId, message);
  } catch (error) {
    return false;
  }
}
