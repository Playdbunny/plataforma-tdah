import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service : 'gmail',
  auth: {
    user: 'synapquest@gmail.com',
    pass: 'synapquest2025'
  },
});

export const sendVerificationEmail = async (email, recuperationToken) => {
  const mailOptions = {
    from : 'synapquest@gmail.com',
    to: email,
    subject: 'Recuperación de contraseña',
    text: `Hola,\n\nPara restablecer tu contraseña, haz clic en el siguiente enlace:\n\nhttp://localhost:3000/reset-password?token=${recuperationToken}\n\nSi no solicitaste este cambio, puedes ignorar este correo.\n\nSaludos,\nEl equipo de SynapQuest`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Correo enviado');
  } catch (error) {
    console.error('Error al enviar el correo:', error);
  }
};