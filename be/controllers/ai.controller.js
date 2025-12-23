const gemini = require('../services/gemini.service');
const { Message, MessageReceipt } = require('../models');
const { Op } = require('sequelize');

/**
 * GỢI Ý CAPTION THEO TONE
 * body: { tone }
 */
exports.suggestCaption = async (req, res) => {
  try {
    const { tone } = req.body;

    if (!tone) {
      return res.status(400).json({ message: 'Vui lòng chọn phong cách (tone)' });
    }

    const prompt = `Bạn là trợ lý mạng xã hội chuyên viết caption cho bài viết.
Hãy viết MỘT caption ngắn gọn, tự nhiên, hấp dẫn bằng tiếng Việt.
Phong cách: ${tone}
Yêu cầu:
- Ngắn gọn, không quá dài
- Tự nhiên, không sáo
- Không quá nhiều emoji
- Phù hợp với phong cách đã nêu`;

    const result = await gemini.generateContent(prompt);
    const caption = result.response.text().trim();

    res.json({
      caption
    });
  } catch (err) {
    console.error('[AI Caption ERROR]', err.message);
    
    let errorMessage = 'Lỗi gợi ý caption';
    if (err.status === 403) {
      errorMessage = 'API key Gemini bị lỗi. Vui lòng kiểm tra lại.';
    } else if (err.status === 401) {
      errorMessage = 'API key Gemini không hợp lệ.';
    } else if (err.status === 429) {
      errorMessage = 'Quá nhiều yêu cầu. Vui lòng thử lại sau.';
    }
    
    res.status(500).json({
      message: errorMessage,
      error: err.message
    });
  }
};

/**
 * GỢI Ý TRẢ LỜI CHAT
 * body: { messages: [{ content: string }] }
 */
exports.suggestReply = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !messages.length) {
      return res.status(400).json({ message: 'Thiếu messages' });
    }

    const conversation = messages
      .map((m, i) => `Tin nhắn ${i + 1}: ${m.content}`)
      .join('\n');

    const prompt = `
Bạn là trợ lý chat.
Hãy gợi ý MỘT câu trả lời ngắn gọn, lịch sự, tự nhiên bằng tiếng Việt
cho đoạn hội thoại sau:

${conversation}
`;

    const result = await gemini.generateContent(prompt);

    res.json({
      reply: result.response.text().trim()
    });
  } catch (err) {
    res.status(500).json({
      message: 'Lỗi gợi ý trả lời',
      error: err.message
    });
  }
};

/**
 * TÓM TẮT TIN NHẮN CHƯA ĐỌC
 * body: { conversationId }
 */
exports.summarizeMessages = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user.id;

    const messages = await Message.findAll({
      where: {
        conversation_id: conversationId,
        sender_id: { [Op.ne]: userId }
      },
      include: [
        {
          model: MessageReceipt,
          as: 'receipts',
          where: {
            user_id: userId,
            status: { [Op.ne]: 'read' }
          }
        }
      ],
      order: [['created_at', 'ASC']],
      limit: 30
    });

    if (!messages.length) {
      return res.json({ summary: 'Không có tin nhắn chưa đọc.' });
    }

    const content = messages.map(m => m.content).join('\n');

    const prompt = `
Hãy tóm tắt ngắn gọn nội dung các tin nhắn sau bằng tiếng Việt:

${content}
`;

    const result = await gemini.generateContent(prompt);
    const summary = result.response.text();

    res.json({ summary });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Lỗi tóm tắt tin nhắn',
      error: err.message
    });
  }
};
