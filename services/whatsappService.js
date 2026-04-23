const axios = require("axios");

async function sendOtpTemplate(phone, code) {
  const messagePayload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: process.env.WHATSAPP_OTP_TEMPLATE_NAME || "fajla_otp",
      language: {
        code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "ar",
      },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: String(code) }],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: String(code) }],
        },
      ],
    },
  };

  return axios.post(
    `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    messagePayload,
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

module.exports = {
  sendOtpTemplate,
};
