const nodemailer = require('nodemailer');

// Configuration du transporteur d'email
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: { user, pass }
    });
    console.log(`📧 [Mailer] Connecté au serveur SMTP réel : ${host}`);
  } else {
    // Mode simulation / développement transparent
    console.log(`ℹ️ [Mailer] Aucun serveur SMTP configuré (SMTP_HOST/USER/PASS). Mode test activé.`);
  }

  return transporter;
}

/**
 * Envoie un email de confirmation d'inscription avec le lien sécurisé
 */
async function sendVerificationEmail({ email, username, verificationLink }) {
  const mailTransporter = getTransporter();

  const fromAddress = process.env.SMTP_FROM || '"DartsMa Live" <noreply@dartsma.com>';
  const subject = `🎯 Confirmez votre adresse email - DartsMa Live`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation d'inscription DartsMa</title>
</head>
<body style="margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="padding: 40px 16px; text-align: center;">
    <div style="max-width: 500px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 24px; padding: 36px 28px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
      
      <!-- Logo Target -->
      <div style="width: 56px; height: 56px; background-color: #10b981; border-radius: 16px; margin: 0 auto 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; line-height: 56px;">
        🎯
      </div>

      <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; letter-spacing: 2px; margin: 0 0 6px;">DARTSMA PRO</h1>
      <p style="color: #94a3b8; font-size: 13px; margin: 0 0 24px;">Validation d'adresse email requise</p>

      <div style="text-align: left; background-color: #1e293b; border-radius: 14px; padding: 18px 20px; margin-bottom: 26px; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        Bonjour <strong>${username}</strong>,<br><br>
        Merci pour votre inscription sur <strong>DartsMa Live</strong> ! Pour valider définitivement votre compte et accéder automatiquement à l'application, veuillez cliquer sur le bouton ci-dessous :
      </div>

      <!-- Bouton d'action principal -->
      <div style="margin-bottom: 26px;">
        <a href="${verificationLink}" style="display: block; background: #10b981; color: #020617; font-weight: 900; font-size: 15px; padding: 16px 24px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.35);">
          ✅ Valider mon email & Lancer DartsMa
        </a>
      </div>

      <p style="color: #64748b; font-size: 11px; line-height: 1.5; margin: 0 0 16px; word-break: break-all;">
        Ou collez ce lien directement dans votre navigateur :<br>
        <a href="${verificationLink}" style="color: #38bdf8; text-decoration: underline;">${verificationLink}</a>
      </p>

      <div style="border-top: 1px solid #1e293b; padding-top: 18px; margin-top: 24px; color: #475569; font-size: 11px; line-height: 1.5;">
        Ce lien de validation reste actif pendant 24 heures.<br>
        Si vous n'avez pas demandé cette inscription, ignorez simplement cet email.
      </div>
    </div>
  </div>
</body>
</html>
  `;

  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail({
        from: fromAddress,
        to: email,
        subject,
        html: htmlContent
      });
      console.log(`✅ [Mailer] Email de validation envoyé avec succès à ${email} (MessageId: ${info.messageId})`);
      return { success: true, simulated: false, messageId: info.messageId };
    } catch (err) {
      console.error(`❌ [Mailer] Erreur lors de l'envoi de l'email à ${email} :`, err.message);
      // Ne pas planter l'inscription, continuer en mode secours
    }
  }

  // Si pas de SMTP configuré ou échec réseau : affichage direct dans la console pour faciliter les tests
  console.log(`\n========================================================================`);
  console.log(`📧 [SIMULATION EMAIL DARTSMA] Message pour : ${email} (${username})`);
  console.log(`🔗 LIEN DE VALIDATION : ${verificationLink}`);
  console.log(`========================================================================\n`);

  return { success: true, simulated: true, verificationLink };
}

/**
 * Envoie un email de réinitialisation de mot de passe
 */
async function sendPasswordResetEmail({ email, username, resetLink }) {
  const mailTransporter = getTransporter();

  const fromAddress = process.env.SMTP_FROM || '"DartsMa Live" <noreply@dartsma.com>';
  const subject = `🔐 Réinitialisation de votre mot de passe - DartsMa Live`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe DartsMa</title>
</head>
<body style="margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="padding: 40px 16px; text-align: center;">
    <div style="max-width: 500px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 24px; padding: 36px 28px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
      
      <!-- Icone Sécurité -->
      <div style="width: 56px; height: 56px; background-color: #0ea5e9; border-radius: 16px; margin: 0 auto 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; line-height: 56px;">
        🔐
      </div>

      <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; letter-spacing: 2px; margin: 0 0 6px;">DARTSMA PRO</h1>
      <p style="color: #94a3b8; font-size: 13px; margin: 0 0 24px;">Demande de réinitialisation de mot de passe</p>

      <div style="text-align: left; background-color: #1e293b; border-radius: 14px; padding: 18px 20px; margin-bottom: 26px; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        Bonjour <strong>${username}</strong>,<br><br>
        Une demande de réinitialisation de mot de passe a été demandée pour votre compte. Cliquez sur le bouton ci-dessous pour choisir votre nouveau mot de passe :
      </div>

      <!-- Bouton d'action -->
      <div style="margin-bottom: 26px;">
        <a href="${resetLink}" style="display: block; background: #0ea5e9; color: #ffffff; font-weight: 900; font-size: 15px; padding: 16px 24px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 20px rgba(14, 165, 233, 0.35);">
          🔑 Réinitialiser mon mot de passe
        </a>
      </div>

      <p style="color: #64748b; font-size: 11px; line-height: 1.5; margin: 0 0 16px; word-break: break-all;">
        Ou collez ce lien directement dans votre navigateur :<br>
        <a href="${resetLink}" style="color: #38bdf8; text-decoration: underline;">${resetLink}</a>
      </p>

      <div style="border-top: 1px solid #1e293b; padding-top: 18px; margin-top: 24px; color: #475569; font-size: 11px; line-height: 1.5;">
        Ce lien reste actif pendant 1 heure.<br>
        Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité, votre mot de passe restera inchangé.
      </div>
    </div>
  </div>
</body>
</html>
  `;

  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail({
        from: fromAddress,
        to: email,
        subject,
        html: htmlContent
      });
      console.log(`✅ [Mailer] Email de réinitialisation envoyé à ${email} (MessageId: ${info.messageId})`);
      return { success: true, simulated: false, messageId: info.messageId };
    } catch (err) {
      console.error(`❌ [Mailer] Erreur envoi reset mot de passe à ${email} :`, err.message);
    }
  }

  console.log(`\n========================================================================`);
  console.log(`🔑 [SIMULATION RESET MOT DE PASSE] Message pour : ${email} (${username})`);
  console.log(`🔗 LIEN DE RÉINITIALISATION : ${resetLink}`);
  console.log(`========================================================================\n`);

  return { success: true, simulated: true, resetLink };
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};

